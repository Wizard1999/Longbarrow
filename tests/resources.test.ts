import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { createWorld } from '../src/sim/world';
import { buildTestMap } from '../src/sim/map';
import { hash } from '../src/sim/snapshot';
import { RESOURCES, RESOURCE_ORDER } from '../src/data/resources';
import {
  afterReserve, canAfford, costMagnitude, emptyBag, neediestResource, pay, refund,
} from '../src/sim/resources';
import { cmdResearch } from '../src/sim/tech';
import { TECH } from '../src/data/tech';
import { workersOf, gatherOf, run, banked, fund, stock } from './helpers';
import { cmdGather } from '../src/sim/commands';

const fresh = (seed = 1337) => buildTestMap(createWorld(seed));

describe('the resource registry is content, not architecture (D-031)', () => {
  it('declares at least one resource, in a stable order', () => {
    expect(RESOURCE_ORDER.length).toBeGreaterThan(0);
    expect([...RESOURCE_ORDER]).toEqual([...RESOURCE_ORDER]);
  });

  it('every declared resource has a definition', () => {
    for (const id of RESOURCE_ORDER) expect(RESOURCES[id]).toBeDefined();
  });

  it('a fresh world holds a bag with an entry per declared resource', () => {
    const w = fresh();
    for (const id of RESOURCE_ORDER) expect(w.resources.player[id]).toBe(0);
  });

  it('the sim never reaches for a resource by name', () => {
    // The specific regression this guards: `world.resources.player.material`
    // compiles, passes every gameplay test, and quietly welds this game's
    // economy into the engine. Only the registry may name a resource.
    const dir = join(import.meta.dirname, '..', 'src', 'sim');
    const offenders: string[] = [];
    for (const file of readdirSync(dir).filter(f => f.endsWith('.ts'))) {
      const src = readFileSync(join(dir, file), 'utf8')
        .replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
      for (const id of RESOURCE_ORDER) {
        if (new RegExp(`\\b${id}\\b`, 'i').test(src)) offenders.push(`${file}:${id}`);
      }
    }
    expect(offenders).toEqual([]);
  });
});

describe('paying for things', () => {
  it('affords a cost it can cover in every resource', () => {
    const bag = emptyBag();
    for (const id of RESOURCE_ORDER) bag[id] = 100;
    expect(canAfford(bag, { material: 50, legacy: 50 })).toBe(true);
  });

  it('refuses when any single resource is short, however rich the rest', () => {
    // The reason affordability cannot be a sum: 1000 of one currency does not
    // buy something that needs 5 of another.
    const bag = emptyBag();
    bag.material = 1000;
    bag.legacy = 4;
    expect(canAfford(bag, { material: 10, legacy: 5 })).toBe(false);
  });

  it('treats an omitted resource as costing nothing', () => {
    expect(canAfford(emptyBag(), { })).toBe(true);
    const bag = emptyBag();
    bag.material = 10;
    expect(canAfford(bag, { material: 10 })).toBe(true);
  });

  it('pays and refunds symmetrically', () => {
    const bag = emptyBag();
    for (const id of RESOURCE_ORDER) bag[id] = 100;
    const cost = { material: 30, legacy: 10 };
    pay(bag, cost);
    expect(bag.material).toBe(70);
    expect(bag.legacy).toBe(90);
    refund(bag, cost);
    expect(bag.material).toBe(100);
    expect(bag.legacy).toBe(100);
  });

  it('never drives a stock negative', () => {
    const bag = emptyBag();
    pay(bag, { material: 500 });
    expect(bag.material).toBe(0);
  });

  it('holds a reserve back from every resource', () => {
    const bag = emptyBag();
    for (const id of RESOURCE_ORDER) bag[id] = 100;
    const left = afterReserve(bag, 40);
    for (const id of RESOURCE_ORDER) expect(left[id]).toBe(60);
    // Non-destructive: the caller's bag is untouched.
    expect(bag.material).toBe(100);
  });

  it('sums a cost only for ordering, not for affording', () => {
    expect(costMagnitude({ material: 90, legacy: 30 })).toBe(120);
  });
});

describe('workers rebalance themselves (D-031 guard rail)', () => {
  it('names a resource to chase when the stock is empty', () => {
    expect(neediestResource(emptyBag())).not.toBeNull();
  });

  it('chases whichever resource is furthest below its declared share', () => {
    const bag = emptyBag();
    // Flooded with the common one; the rare one is now the deficit.
    bag.material = 1000;
    bag.legacy = 0;
    expect(neediestResource(bag)).toBe('legacy');
  });

  it('switches back once the rare one is over its share', () => {
    const bag = emptyBag();
    bag.material = 0;
    bag.legacy = 1000;
    expect(neediestResource(bag)).toBe('material');
  });

  it('gathers every declared resource with no player input at all', () => {
    // This is the whole guard rail: two currencies must not reintroduce worker
    // micro. Nobody assigns anything here beyond the initial order.
    const w = fresh();
    const ws = workersOf(w, 'player');
    cmdGather(w, ws.map(u => u.id), w.nodes[0]!.id);
    run(w, 6000);
    for (const id of RESOURCE_ORDER) {
      expect(w.resources.player[id]).toBeGreaterThan(0);
    }
  });

  it('keeps workers employed rather than idling between resources', () => {
    const w = fresh();
    const ws = workersOf(w, 'player');
    cmdGather(w, ws.map(u => u.id), w.nodes[0]!.id);
    run(w, 3000);
    expect(ws.every(u => gatherOf(u).state !== 'idle')).toBe(true);
  });
});

describe('the map declares which resource each node yields', () => {
  it('places both a common and a rare resource', () => {
    const w = fresh();
    const kinds = new Set(w.nodes.map(n => n.resource));
    expect(kinds.size).toBeGreaterThan(1);
  });

  it('puts the rare resource on ground neither base owns', () => {
    // Position is the point of a scarce resource: if it sat in your own base it
    // would just be a slower common one.
    const w = fresh();
    const rare = w.nodes.filter(n => RESOURCES[n.resource].abundance === 'rare');
    expect(rare.length).toBeGreaterThan(0);

    const playerBase = w.buildings.find(b => b.team === 'player')!;
    const rivalBase = w.buildings.find(b => b.team === 'rival')!;
    for (const node of rare) {
      const toPlayer = Math.hypot(node.x - playerBase.x, node.z - playerBase.z);
      const toRival = Math.hypot(node.x - rivalBase.x, node.z - rivalBase.z);
      // Equidistant within a tolerance, rather than exactly: the polygon clamp
      // can nudge a node inside the boundary.
      expect(Math.abs(toPlayer - toRival)).toBeLessThan(6);
    }
  });

  it('gives rare nodes the capacity declared for them, not a shared default', () => {
    const w = fresh();
    for (const n of w.nodes) {
      expect(n.maxAmount).toBe(RESOURCES[n.resource].nodeCapacity);
    }
  });
});

describe('resources are hashed in declared order', () => {
  it('a difference in any single resource changes the hash', () => {
    for (const id of RESOURCE_ORDER) {
      const a = fresh();
      const b = fresh();
      expect(hash(a)).toBe(hash(b));
      b.resources.player[id] += 1;
      expect(hash(a)).not.toBe(hash(b));
    }
  });

  it('a carried load is hashed with the resource it is', () => {
    const a = fresh();
    const b = fresh();
    const wa = workersOf(a, 'player')[0]!;
    const wb = workersOf(b, 'player')[0]!;
    gatherOf(wa).carrying = 5;
    gatherOf(wb).carrying = 5;
    gatherOf(wa).carryResource = 'material';
    gatherOf(wb).carryResource = 'legacy';
    // Same amount in hand, different substance — two peers disagreeing about
    // which would diverge the moment either one banked it.
    expect(hash(a)).not.toBe(hash(b));
  });
});

describe('research is paid in both currencies', () => {
  it('refuses when only the common resource is available', () => {
    const w = fresh();
    w.resources.player.material = 100_000;
    w.resources.player.legacy = 0;
    const paidInBoth = Object.values(TECH).find(t => (t.cost.legacy ?? 0) > 0);
    expect(paidInBoth).toBeDefined();
    const id = (Object.keys(TECH) as (keyof typeof TECH)[])
      .find(k => (TECH[k].cost.legacy ?? 0) > 0 && TECH[k].requires.length === 0)!;
    expect(cmdResearch(w, 'player', id).ok).toBe(false);
  });

  it('succeeds once the rare resource is in hand', () => {
    const w = fresh();
    fund(w, 'player', 100_000);
    const id = (Object.keys(TECH) as (keyof typeof TECH)[])
      .find(k => TECH[k].requires.length === 0)!;
    expect(cmdResearch(w, 'player', id).ok).toBe(true);
    expect(stock(w, 'player', 'legacy')).toBeLessThan(100_000);
  });
});

describe('nothing is created or destroyed across both resources', () => {
  it('banked + carried + still in the ground equals the starting total', () => {
    const w = fresh();
    const startOnMap = w.nodes.reduce((s, n) => s + n.amount, 0);
    cmdGather(w, workersOf(w, 'player').map(u => u.id), w.nodes[0]!.id);
    run(w, 4000);
    const carried = workersOf(w, 'player').reduce((s, u) => s + gatherOf(u).carrying, 0);
    const remaining = w.nodes.reduce((s, n) => s + n.amount, 0);
    expect(banked(w, 'player') + carried + remaining).toBe(startOnMap);
  });
});
