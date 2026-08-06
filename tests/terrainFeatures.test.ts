import { describe, expect, it } from 'vitest';
import {
  HIGH_GROUND_THRESHOLD, TERRAIN_FLOOR, terrainFeatures, terrainHeightAt, terrainSlopeAt,
} from '../src/sim/terrain';

/** Walk outward from a plateau centre along a bearing, sampling height. */
function profileAlong(cx: number, cz: number, bearing: number, to: number, step = 0.4): number[] {
  const out: number[] = [];
  for (let d = 0; d <= to; d += step) {
    out.push(terrainHeightAt(cx + Math.cos(bearing) * d, cz + Math.sin(bearing) * d));
  }
  return out;
}

/** Steepest descent found along a bearing — how cliff-like that edge is. */
function maxDropAlong(cx: number, cz: number, bearing: number, to: number): number {
  const p = profileAlong(cx, cz, bearing, to);
  let worst = 0;
  for (let i = 1; i < p.length; i++) worst = Math.max(worst, p[i - 1]! - p[i]!);
  return worst;
}

describe('terrain is rotationally symmetric (fairness)', () => {
  // The old two-sine formula was NOT symmetric, so one base sat on better ground
  // than the other for the whole of Phase 1 and nothing tested for it.
  it('h(x, z) equals h(-x, -z) everywhere', () => {
    for (let x = -38; x <= 38; x += 1.3) {
      for (let z = -38; z <= 38; z += 1.3) {
        expect(terrainHeightAt(x, z)).toBeCloseTo(terrainHeightAt(-x, -z), 9);
      }
    }
  });

  it('declares its features as mirrored pairs or self-mirrored', () => {
    const feats = terrainFeatures();
    for (const f of feats) {
      const mirrored = feats.find(o =>
        Math.abs(o.cx + f.cx) < 1e-9 && Math.abs(o.cz + f.cz) < 1e-9);
      expect(mirrored, `no mirror for feature at ${f.cx},${f.cz}`).toBeDefined();
      expect(mirrored!.height).toBeCloseTo(f.height, 9);
      expect(mirrored!.radius).toBeCloseTo(f.radius, 9);
    }
  });
});

describe('high ground exists and is worth taking', () => {
  it('never falls through the floor', () => {
    let min = Infinity;
    for (let x = -40; x <= 40; x += 0.9) {
      for (let z = -40; z <= 40; z += 0.9) min = Math.min(min, terrainHeightAt(x, z));
    }
    expect(min).toBeGreaterThanOrEqual(TERRAIN_FLOOR - 1e-9);
  });

  it('gives the top a real advantage over the foot of its own ramp', () => {
    // The gameplay-meaningful claim, and deliberately measured against the ramp
    // foot rather than "somewhere far away": far away may sit inside another
    // feature, which is how the first version of this test fooled itself.
    for (const f of terrainFeatures()) {
      const ramp = f.ramps[0]!;
      const foot = f.radius + f.rampRun + 1;
      const top = terrainHeightAt(f.cx, f.cz);
      const bottom = terrainHeightAt(f.cx + Math.cos(ramp) * foot, f.cz + Math.sin(ramp) * foot);
      expect(top - bottom).toBeGreaterThan(HIGH_GROUND_THRESHOLD);
    }
  });

  it('gives every plateau a flat top rather than a peak', () => {
    // A peak cannot be held by a formation; a plateau can.
    for (const f of terrainFeatures()) {
      const centre = terrainHeightAt(f.cx, f.cz);
      const inner = terrainHeightAt(f.cx + f.radius * 0.7, f.cz);
      expect(Math.abs(centre - inner)).toBeLessThan(0.35);
      expect(terrainSlopeAt(f.cx, f.cz)).toBeLessThan(0.12);
    }
  });
});

describe('ramps are walkable and cliffs are not (D-033, D-035)', () => {
  it('gives every plateau at least one ramp', () => {
    for (const f of terrainFeatures()) expect(f.ramps.length).toBeGreaterThan(0);
  });

  it('makes the ramp bearing markedly gentler than the cliff bearing', () => {
    // This is the mechanic. Without it there is no approach, only "uphill" and
    // "not uphill", which is the state the old sine terrain was stuck in.
    for (const f of terrainFeatures()) {
      const ramp = f.ramps[0]!;
      const cliff = ramp + Math.PI * 0.6;   // well outside the ramp arc
      const reach = f.radius + f.rampRun + 2;
      expect(maxDropAlong(f.cx, f.cz, ramp, reach))
        .toBeLessThan(maxDropAlong(f.cx, f.cz, cliff, reach));
    }
  });

  it('keeps the ramp climb shallow enough to read as a route', () => {
    for (const f of terrainFeatures()) {
      const ramp = f.ramps[0]!;
      const at = f.radius + f.rampRun * 0.5;
      expect(terrainSlopeAt(f.cx + Math.cos(ramp) * at, f.cz + Math.sin(ramp) * at))
        .toBeLessThan(0.35);
    }
  });

  it('makes the ramp mouth narrow, so it is a chokepoint', () => {
    // Arc, not width in metres: a wide-open ramp is a hillside, and holding the
    // top would stop meaning anything.
    for (const f of terrainFeatures()) expect(f.rampArc).toBeLessThan(0.8);
  });

  it('rises monotonically along a ramp, with no lip to catch a unit', () => {
    for (const f of terrainFeatures()) {
      const ramp = f.ramps[0]!;
      const outward = profileAlong(f.cx, f.cz, ramp, f.radius + f.rampRun).reverse();
      for (let i = 1; i < outward.length; i++) {
        // Climbing inward from the bottom, height must never drop.
        expect(outward[i]! - outward[i - 1]!).toBeGreaterThan(-0.02);
      }
    }
  });
});

describe('the centre is contested, not owned', () => {
  it('sits a plateau on the origin, equidistant from both bases', () => {
    const centre = terrainFeatures().find(f => f.cx === 0 && f.cz === 0);
    expect(centre).toBeDefined();
  });

  it('gives the centre opposed ramps, so both sides can climb it', () => {
    const centre = terrainFeatures().find(f => f.cx === 0 && f.cz === 0)!;
    expect(centre.ramps.length).toBeGreaterThanOrEqual(2);
    const [a, b] = centre.ramps;
    // Opposed within a tolerance: a pair on the same side would hand the
    // plateau to whoever spawned nearest it.
    expect(Math.abs(Math.abs(a! - b!) - Math.PI)).toBeLessThan(0.35);
  });
});
