import { describe, it, expect, vi } from 'vitest';
import { freshMap, must, run, workersOf } from './helpers';
import { createWorld, simStep } from '../src/sim/world';
import { spawnUnit } from '../src/sim/entities';
import { cmdGather, cmdMove } from '../src/sim/commands';
import {
  TERRAIN_FLOOR, hasHighGroundOver, terrainHeightAt,
} from '../src/sim/terrain';
import { TICK_HZ } from '../src/core/loop';

// [1] sim purity — the sim must run with no browser globals and no Math.random.
describe('[1] sim purity', () => {
  it('a full simulation runs without ever calling Math.random()', () => {
    const spy = vi.spyOn(Math, 'random').mockImplementation(() => {
      throw new Error('sim called Math.random()');
    });
    try {
      const w = freshMap(4242);
      const ws = workersOf(w, 'player');
      cmdGather(w, ws.map(u => u.id), must(w.nodes[0]).id);
      expect(() => run(w, 2000)).not.toThrow();
    } finally {
      spy.mockRestore();
    }
  });
});

// [2] determinism
describe('[2] determinism', () => {
  const a = freshMap(1337);
  const b = freshMap(1337);
  const c = freshMap(9999);

  it('same seed -> identical scenery', () => {
    expect(JSON.stringify(a.scenery)).toBe(JSON.stringify(b.scenery));
  });
  it('different seed -> different scenery', () => {
    expect(JSON.stringify(a.scenery)).not.toBe(JSON.stringify(c.scenery));
  });
  it('scenery never spawns on top of a base', () => {
    expect(a.scenery.every(s => a.buildings.every(bd => Math.hypot(s.x - bd.x, s.z - bd.z) >= 7))).toBe(true);
  });
  it('scenery never spawns on top of a node', () => {
    expect(a.scenery.every(s => a.nodes.every(n => Math.hypot(s.x - n.x, s.z - n.z) >= 5))).toBe(true);
  });
});

// [3] map symmetry (§2: no spawn has an inherent advantage)
describe('[3] map symmetry', () => {
  const w = freshMap();
  const rot = (o: { x: number; z: number }) => `${(-o.x).toFixed(3)},${(-o.z).toFixed(3)}`;

  it('bases are 180-degree rotationally symmetric', () => {
    const p = must(w.buildings.find(b => b.team === 'player'));
    const r = must(w.buildings.find(b => b.team === 'rival'));
    expect(rot(p)).toBe(`${r.x.toFixed(3)},${r.z.toFixed(3)}`);
  });
  it('every node has a rotational twin', () => {
    const nodeKeys = new Set(w.nodes.map(n => `${n.x.toFixed(3)},${n.z.toFixed(3)}`));
    expect(w.nodes.every(n => nodeKeys.has(rot(n)))).toBe(true);
  });
  it('both teams have equal worker counts', () => {
    expect(workersOf(w, 'player').length).toBe(workersOf(w, 'rival').length);
  });
});

// [4] movement (unchanged from 1.2)
describe('[4] movement', () => {
  const w = createWorld(1);
  const u = spawnUnit(w, 'legionnaire', 'player', 0, 0);
  cmdMove(w, [u.id], 21, 0);
  let ticks = 0;
  while (u.target && ticks < 1000) { simStep(w); ticks++; }
  const expected = 21 / 4.2 * TICK_HZ + 1;   // +1: arrival detected next tick

  it(`arrives in ~${expected} ticks (got ${ticks})`, () => {
    expect(Math.abs(ticks - expected)).toBeLessThanOrEqual(2);
  });
  it('landed on the destination', () => {
    expect(Math.abs(u.x - 21)).toBeLessThan(0.1);
    expect(Math.abs(u.z)).toBeLessThan(0.1);
  });
});

// [5] framerate independence — tick batching changes nothing
describe('[5] framerate independence', () => {
  const stateAfter = (batches: number[]) => {
    const w = freshMap(7);
    const ws = workersOf(w, 'player');
    cmdGather(w, ws.map(u => u.id), must(w.nodes[0]).id);
    for (const n of batches) run(w, n);
    return JSON.stringify([
      w.resources.player,
      w.nodes.map(n => n.amount),
      ws.map(u => [u.x.toFixed(9), u.z.toFixed(9)]),
    ]);
  };

  it('600x1 tick == 120x5 ticks (identical world state)', () => {
    expect(stateAfter(Array(600).fill(1))).toBe(stateAfter(Array(120).fill(5)));
  });
});

// [13] terrain and high-ground helpers
describe('[13] terrain and high-ground helpers', () => {
  let minH = Infinity;
  let hi = { x: 0, z: 0, h: -Infinity };
  let lo = { x: 0, z: 0, h: Infinity };
  for (let x = -30; x <= 30; x += 0.7) {
    for (let z = -30; z <= 30; z += 0.7) {
      const h = terrainHeightAt(x, z);
      minH = Math.min(minH, h);
      if (h > hi.h) hi = { x, z, h };
      if (h < lo.h) lo = { x, z, h };
    }
  }

  it('height query respects the floor clamp', () => {
    expect(terrainHeightAt(0, 0)).toBeGreaterThanOrEqual(TERRAIN_FLOOR - 1e-9);
  });
  it('no sample falls below the floor', () => {
    expect(minH).toBeGreaterThanOrEqual(TERRAIN_FLOOR - 1e-9);
  });
  it('high ground detected uphill', () => {
    expect(hasHighGroundOver(hi.x, hi.z, lo.x, lo.z)).toBe(true);
  });
  it('not detected downhill', () => {
    expect(hasHighGroundOver(lo.x, lo.z, hi.x, hi.z)).toBe(false);
  });
});
