import { describe, expect, it } from 'vitest';
import { createWorld, simStep } from '../src/sim/world';
import { buildTestMap } from '../src/sim/map';
import { cmdClearRally, cmdSetRally, cmdTrain, rallyFor } from '../src/sim/commands';
import { hash } from '../src/sim/snapshot';
import { UNIT_TYPES } from '../src/data/units';
import { fund, must, run, stock } from './helpers';
import type { Building, World } from '../src/core/types';

const fresh = (seed = 1337) => buildTestMap(createWorld(seed));
const playerBase = (w: World): Building =>
  must(w.buildings.find(b => b.team === 'player'), 'player base');

/** Train one unit to completion and hand back the unit that popped out. */
function trainOne(w: World, type: 'worker' | 'legionnaire' | 'marksman') {
  const before = new Set(w.units.map(u => u.id));
  fund(w, 'player', 10_000);
  const base = playerBase(w);
  const res = cmdTrain(w, base.id, type);
  expect(res.ok).toBe(true);
  run(w, UNIT_TYPES[type].buildTicks + 2);
  return w.units.find(u => !before.has(u.id));
}

describe('default rally still works', () => {
  it('a trained unit walks to the building rally', () => {
    const w = fresh();
    const base = playerBase(w);
    expect(cmdSetRally(w, base.id, 5, -6).ok).toBe(true);
    const u = trainOne(w, 'legionnaire');
    expect(u?.target).toEqual({ x: 5, z: -6 });
  });
});

describe('per-unit-type rally', () => {
  it('a type override beats the building default', () => {
    const w = fresh();
    const base = playerBase(w);
    cmdSetRally(w, base.id, 1, 1);
    expect(cmdSetRally(w, base.id, -9, 9, { unitType: 'worker' }).ok).toBe(true);

    expect(rallyFor(base, 'worker')).toMatchObject({ x: -9, z: 9 });
    expect(rallyFor(base, 'legionnaire')).toMatchObject({ x: 1, z: 1 });
  });

  it('workers and soldiers can be sent to different places at once', () => {
    // The actual point of the feature: one base feeding two destinations
    // without the player retargeting between builds.
    const w = fresh();
    const base = playerBase(w);
    cmdSetRally(w, base.id, 12, 0, { unitType: 'legionnaire' });
    cmdSetRally(w, base.id, -12, 0, { unitType: 'worker' });

    const soldier = trainOne(w, 'legionnaire');
    const worker = trainOne(w, 'worker');
    expect(soldier?.target).toEqual({ x: 12, z: 0 });
    expect(worker?.target).toEqual({ x: -12, z: 0 });
  });

  it('clearing an override falls back to the default', () => {
    const w = fresh();
    const base = playerBase(w);
    cmdSetRally(w, base.id, 2, 2);
    cmdSetRally(w, base.id, -8, -8, { unitType: 'worker' });
    expect(rallyFor(base, 'worker')).toMatchObject({ x: -8, z: -8 });

    expect(cmdClearRally(w, base.id, 'worker').ok).toBe(true);
    expect(rallyFor(base, 'worker')).toMatchObject({ x: 2, z: 2 });
  });

  it('refuses an override for a unit the building cannot make', () => {
    const w = fresh();
    const outpost = w.buildings.find(b => b.type === 'outpost');
    if (!outpost) return;                       // test map may have none yet
    const res = cmdSetRally(w, outpost.id, 0, 0, { unitType: 'legionnaire' });
    expect(res.ok).toBe(false);
  });
});

describe('a rally can carry a standing job', () => {
  it('sends new workers straight to a node and they start gathering', () => {
    // "Automatically send workers here when completed" -- the set-and-forget
    // economy pillar (§8.2), expressed as one decision instead of a move order
    // repeated after every worker.
    const w = fresh();
    const base = playerBase(w);
    const node = must(w.nodes[0], 'node');
    expect(cmdSetRally(w, base.id, node.x, node.z,
      { unitType: 'worker', kind: 'gather', targetId: node.id }).ok).toBe(true);

    const worker = trainOne(w, 'worker');
    expect(worker?.gather?.nodeId).toBe(node.id);
    expect(worker?.gather?.state).not.toBe('idle');
  });

  it('a gathering rally actually produces income, unattended', () => {
    const w = fresh();
    const base = playerBase(w);
    const node = must(w.nodes[0], 'node');
    cmdSetRally(w, base.id, node.x, node.z,
      { unitType: 'worker', kind: 'gather', targetId: node.id });
    fund(w, 'player', 10_000);
    cmdTrain(w, base.id, 'worker');
    run(w, UNIT_TYPES.worker.buildTicks + 2);

    const banked = stock(w, 'player');
    run(w, 900);
    expect(stock(w, 'player')).toBeGreaterThan(banked);
  });

  it('refuses a gather rally with no node, at the moment it is set', () => {
    // Refused while the player is looking at it, rather than discovered three
    // workers later when they walk to an empty patch and idle.
    const w = fresh();
    const base = playerBase(w);
    expect(cmdSetRally(w, base.id, 0, 0, { kind: 'gather' }).ok).toBe(false);
    expect(cmdSetRally(w, base.id, 0, 0, { kind: 'gather', targetId: 99999 }).ok).toBe(false);
  });

  it('refuses a build rally pointed at another team\'s site', () => {
    const w = fresh();
    const base = playerBase(w);
    w.sites.push({
      id: w.nextId++, type: 'outpost', team: 'rival',
      x: 5, z: 5, radius: 1.4, progress: 0, required: 150,
    });
    const enemySite = must(w.sites.at(-1), 'site');
    const res = cmdSetRally(w, base.id, 5, 5, { kind: 'build', targetId: enemySite.id });
    expect(res.ok).toBe(false);
  });
});

describe('rally is deterministic state', () => {
  it('is part of the hash', () => {
    // It changes what every future unit does, so peers disagreeing about it
    // would diverge the moment anything finishes training.
    const a = fresh(4);
    const b = fresh(4);
    expect(hash(a)).toBe(hash(b));
    cmdSetRally(a, playerBase(a).id, 7, 7, { unitType: 'worker' });
    expect(hash(a)).not.toBe(hash(b));
  });

  it('survives a serialize round trip', () => {
    const w = fresh();
    const node = must(w.nodes[0], 'node');
    cmdSetRally(w, playerBase(w).id, node.x, node.z,
      { unitType: 'worker', kind: 'gather', targetId: node.id });
    const wire = JSON.parse(JSON.stringify(w)) as World;
    expect(hash(wire)).toBe(hash(w));

    for (let i = 0; i < 50; i++) { simStep(w); simStep(wire); }
    expect(hash(wire)).toBe(hash(w));
  });
});
