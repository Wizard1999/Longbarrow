export const TERRAIN_SIZE = 80;
export const TERRAIN_FLOOR = -0.2;

/** Single source of truth for terrain height. The render mesh samples this
 *  same function rather than duplicating the formula — the two drifting apart
 *  was a real Phase 0 bug (06 §6). */
export function terrainHeightAt(x: number, z: number): number {
  const h = Math.sin(x * 0.15) * Math.cos(z * 0.15) * 1.6
          + Math.sin(x * 0.35 + 3.0) * 0.5;
  return Math.max(h, TERRAIN_FLOOR);
}

// Groundwork for 1.3. Wired to combat at 1.8/1.9.
export const HIGH_GROUND_THRESHOLD = 0.6;

export function elevationAdvantage(ax: number, az: number, bx: number, bz: number): number {
  return terrainHeightAt(ax, az) - terrainHeightAt(bx, bz);
}

export function hasHighGroundOver(ax: number, az: number, bx: number, bz: number): boolean {
  return elevationAdvantage(ax, az, bx, bz) >= HIGH_GROUND_THRESHOLD;
}
