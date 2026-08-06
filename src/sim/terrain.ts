export const TERRAIN_SIZE = 80;
export const TERRAIN_FLOOR = -0.2;

/**
 * Terrain height — the single source of truth. The render mesh samples this
 * rather than duplicating the formula; the two drifting apart was a real Phase 0
 * bug (06 §6).
 *
 * **This used to be two sine waves**, which produced smooth rolling noise: high
 * ground existed and carried a real combat bonus, but there was no such thing as
 * an *approach* to it. You were either uphill or you were not, and no position on
 * the board was worth taking. D-035 makes that a legibility failure rather than a
 * cosmetic one — terrain matters here *because it is legible and exploitable*,
 * which is an arcade property, not a simulationist one.
 *
 * So the shape is now composed rather than sampled:
 *
 *  - a gentle **base undulation**, so the ground is never a flat plane;
 *  - a small number of **plateaus** with genuinely steep edges — cliffs, not
 *    slopes, so the top is only reachable where the map says it is;
 *  - **ramps**: angular windows per plateau where the falloff stretches out into
 *    a walkable climb. Everything a ramp implies follows for free — the mouth of
 *    a ramp is a chokepoint, holding the top is worth doing, and taking the long
 *    way round to a flank rise is a real decision.
 *
 * Two constraints hold the whole thing together:
 *
 * **Rotational symmetry.** Every height satisfies `h(x, z) === h(-x, -z)`. The
 * old formula did not, which meant one base sat on better ground than the other
 * — a fairness bug nobody had noticed because nothing tested for it. Features are
 * declared in mirrored pairs (or self-mirrored at the origin) and the base wave
 * uses only even functions, so symmetry holds by construction rather than by
 * arithmetic luck.
 *
 * **Still unseeded.** Map variety is the separate procedural-generation item in
 * `TODO.md`; this composition is fixed. That is a deliberately smaller step: it
 * fixes what was *unreadable* without also changing what is *reproducible*, and
 * `terrainHeightAt` keeps its two-argument signature, so none of its fourteen
 * callers move. Seeding it means threading `mapSeed` through all of them, and
 * that is its own change with its own `MAP_VERSION` bump.
 */

interface Plateau {
  cx: number;
  cz: number;
  /** Flat top out to here. */
  radius: number;
  /** Height added above the base wave. Above `HIGH_GROUND_THRESHOLD` to matter. */
  height: number;
  /** Directions, in radians, where the edge becomes a walkable ramp. */
  ramps: readonly number[];
  /** Angular half-width of each ramp mouth. Narrow reads as a chokepoint. */
  rampArc: number;
  /** How far the ramp takes to climb. Long is gentle and obviously walkable. */
  rampRun: number;
  /** How far the cliff takes to fall. Short is unmistakably not a route. */
  cliffRun: number;
}

/**
 * The board, as features.
 *
 * The centre plateau is the contested prize (`OPEN_QUESTIONS.md` A5 asks for
 * exactly this) and is self-mirrored about the origin, with one ramp facing each
 * base — so both sides can climb it, both approaches are narrow, and neither is
 * closer. The flank pair sits off-axis with a single ramp each, which is the
 * "route worth discovering" D-035 asks for: slower to reach, and it overlooks the
 * approach to the centre.
 */
const PLATEAUS: readonly Plateau[] = [
  {
    cx: 0, cz: 0, radius: 7.5, height: 2.4,
    // Opposed pair, so the feature is its own mirror image.
    ramps: [Math.PI * 0.5, Math.PI * 1.5],
    rampArc: 0.42, rampRun: 14, cliffRun: 2.6,
  },
  {
    cx: -17, cz: 13, radius: 4.6, height: 1.7,
    ramps: [Math.PI * 1.15],
    rampArc: 0.5, rampRun: 10, cliffRun: 2.2,
  },
  // Mirror of the above. Written out rather than generated so the table reads as
  // the map it is, and so a reader can see the symmetry instead of trusting it.
  {
    cx: 17, cz: -13, radius: 4.6, height: 1.7,
    ramps: [Math.PI * 0.15],
    rampArc: 0.5, rampRun: 10, cliffRun: 2.2,
  },
];

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

/** Shortest absolute angular distance between two bearings. */
function angleDelta(a: number, b: number): number {
  let d = Math.abs(a - b) % (Math.PI * 2);
  if (d > Math.PI) d = Math.PI * 2 - d;
  return d;
}

function plateauHeight(p: Plateau, x: number, z: number): number {
  const dx = x - p.cx;
  const dz = z - p.cz;
  const d = Math.hypot(dx, dz);
  if (d <= p.radius) return p.height;

  // How much this bearing counts as a ramp. Smoothed across the mouth, or the
  // seam between ramp and cliff would be a vertical wall a unit could not path
  // around cleanly.
  const bearing = Math.atan2(dz, dx);
  let rampness = 0;
  for (const dir of p.ramps) {
    rampness = Math.max(rampness, 1 - smoothstep(p.rampArc * 0.45, p.rampArc, angleDelta(bearing, dir)));
  }

  const run = p.cliffRun + (p.rampRun - p.cliffRun) * rampness;
  return p.height * (1 - smoothstep(p.radius, p.radius + run, d));
}

export function terrainHeightAt(x: number, z: number): number {
  // Even in both axes, so it survives the 180° rotation unchanged.
  const base = Math.cos(x * 0.11) * Math.cos(z * 0.11) * 0.55;

  // Max rather than sum: overlapping features should read as one landmass at the
  // height of the taller, not stack into a spike where they happen to meet.
  let feature = 0;
  for (const p of PLATEAUS) feature = Math.max(feature, plateauHeight(p, x, z));

  return Math.max(base + feature, TERRAIN_FLOOR);
}

/** Ground counts as high enough to matter when it clears this much. */
export const HIGH_GROUND_THRESHOLD = 0.6;

export function elevationAdvantage(ax: number, az: number, bx: number, bz: number): number {
  return terrainHeightAt(ax, az) - terrainHeightAt(bx, bz);
}

export function hasHighGroundOver(ax: number, az: number, bx: number, bz: number): boolean {
  return elevationAdvantage(ax, az, bx, bz) >= HIGH_GROUND_THRESHOLD;
}

/**
 * Steepness at a point, as a height difference per world unit.
 *
 * Exposed because "how steep is it here" is the question both the terrain
 * shading and any future pathing cost need to ask, and neither should be
 * re-deriving it from its own samples.
 */
export function terrainSlopeAt(x: number, z: number, step = 0.5): number {
  const dx = terrainHeightAt(x + step, z) - terrainHeightAt(x - step, z);
  const dz = terrainHeightAt(x, z + step) - terrainHeightAt(x, z - step);
  return Math.hypot(dx, dz) / (2 * step);
}

/** The declared features, for tests and for tooling that wants to draw them. */
export function terrainFeatures(): readonly Plateau[] {
  return PLATEAUS;
}
