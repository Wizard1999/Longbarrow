import { describe, it, expect } from 'vitest';
import { banked, freshMap, gatherOf, must, run, stock, workersOf } from './helpers';
import { simStep } from '../src/sim/world';
import { cmdGather, cmdMove } from '../src/sim/commands';
import { totalResourcesRemaining } from '../src/sim/economy';
import type { Unit } from '../src/core/types';
import { RESOURCES } from '../src/data/resources';

// [6] gather loop — one command, runs forever (set-and-forget, §8.2)
describe('[6] gather loop', () => {
  const w = freshMap();
  const ws = workersOf(w, 'player');
  const node = must(w.nodes.find(n => n.x < 0));
  const accepted = cmdGather(w, ws.map(u => u.id), node.id);
  const startedAtZero = stock(w, 'player') === 0;
  run(w, 200);                       // 10 seconds
  const at10s = banked(w, 'player');
  run(w, 1000);                      // 50 more seconds, still no input
  const atMinute = banked(w, 'player');

  it('all four workers accepted the order', () => expect(accepted.length).toBe(4));
  it('resources start at zero', () => expect(startedAtZero).toBe(true));
  it('essence is being delivered', () => expect(at10s).toBeGreaterThan(0));
  it('still delivering a minute later with zero further input', () => {
    expect(atMinute).toBeGreaterThan(at10s * 4);
  });
  it('every worker is still employed', () => {
    expect(ws.every(u => gatherOf(u).state !== 'idle')).toBe(true);
  });
});

// [7] conservation — nothing created or destroyed
describe('[7] conservation', () => {
  const w = freshMap();
  const startOnMap = totalResourcesRemaining(w);
  cmdGather(w, workersOf(w, 'player').map(u => u.id), must(w.nodes[0]).id);
  run(w, 1500);
  const carried = workersOf(w, 'player').reduce((s, u) => s + gatherOf(u).carrying, 0);

  it('banked + carried + remaining == starting total', () => {
    expect(banked(w, 'player') + carried + totalResourcesRemaining(w)).toBe(startOnMap);
  });
  it('rival gained nothing', () => expect(banked(w, 'rival')).toBe(0));
});

// [8] carry amounts are exact multiples (no rounding drift)
describe('[8] carry amounts are exact multiples', () => {
  const w = freshMap();
  const u = must(workersOf(w, 'player')[0]);
  cmdGather(w, [u.id], must(w.nodes[0]).id);
  run(w, 3000);

  it('banked essence is a whole multiple of carryAmount', () => {
    expect(stock(w, 'player') % RESOURCES.material.carryAmount).toBe(0);
  });
});

// [9] node depletion and automatic re-tasking
describe('[9] node depletion and automatic re-tasking', () => {
  const w = freshMap();
  const target = must(w.nodes.find(n => n.x < 0));
  target.amount = RESOURCES.material.carryAmount * 2;         // nearly dry
  const u = must(workersOf(w, 'player')[0]);
  cmdGather(w, [u.id], target.id);
  run(w, 1200);

  it('the node was drained to zero', () => expect(target.amount).toBe(0));
  it('worker re-tasked itself to another node without input', () => {
    expect(gatherOf(u).state).not.toBe('idle');
    expect(gatherOf(u).nodeId).not.toBe(target.id);
  });
  it('and is still banking essence', () => {
    expect(banked(w, 'player')).toBeGreaterThan(RESOURCES.material.carryAmount * 2);
  });
});

// [10] graceful stop when the map is exhausted
describe('[10] graceful stop when the map is exhausted', () => {
  const w = freshMap();
  for (const n of w.nodes) n.amount = 0;
  const first = must(w.nodes[0]);
  first.amount = RESOURCES.material.carryAmount;
  const u = must(workersOf(w, 'player')[0]);
  cmdGather(w, [u.id], first.id);
  run(w, 2000);

  it('map fully exhausted', () => expect(totalResourcesRemaining(w)).toBe(0));
  it('last load was still delivered', () => expect(stock(w, 'player')).toBe(RESOURCES.material.carryAmount));
  it('worker went idle instead of spinning', () => expect(gatherOf(u).state).toBe('idle'));
  it('and dropped its target', () => expect(u.target).toBeNull());
});

// [11] orders interact correctly
describe('[11] orders interact correctly', () => {
  const w = freshMap();
  const ws = workersOf(w, 'player');
  const fighters = w.units.filter(u => u.team === 'player' && !u.gather);
  const first = must(ws[0]);
  cmdGather(w, ws.map(u => u.id), must(w.nodes[0]).id);
  run(w, 60);
  cmdMove(w, [first.id], 0, 0);

  it('a move order cancels gathering', () => {
    expect(gatherOf(first).state).toBe('idle');
    expect(gatherOf(first).nodeId).toBeNull();
  });
  it('other workers are unaffected', () => {
    expect(ws.slice(1).every(u => gatherOf(u).state !== 'idle')).toBe(true);
  });
  it('non-workers reject gather orders', () => {
    expect(cmdGather(w, fighters.map(u => u.id), must(w.nodes[0]).id).length).toBe(0);
  });
  it('gather on a nonexistent node is a no-op', () => {
    expect(cmdGather(w, ws.map(u => u.id), 999999).length).toBe(0);
  });
});

// [12] workers park in their own slots, not on top of each other.
// NOTE: workers still pass through each other in transit. That is unit
// collision, which arrives with pathfinding — out of scope for 1.4.
describe('[12] workers park in their own slots', () => {
  const w = freshMap();
  const ws = workersOf(w, 'player');
  cmdGather(w, ws.map(u => u.id), must(w.nodes[0]).id);
  let worstParked = Infinity;
  let sawParkedPair = false;
  // sample across a full cycle rather than at one arbitrary tick
  for (let t = 0; t < 900; t++) {
    simStep(w);
    const parked: Unit[] = ws.filter(u => gatherOf(u).state === 'gathering');
    for (let i = 0; i < parked.length; i++) {
      for (let j = i + 1; j < parked.length; j++) {
        const a = must(parked[i]);
        const b = must(parked[j]);
        sawParkedPair = true;
        worstParked = Math.min(worstParked, Math.hypot(a.x - b.x, a.z - b.z));
      }
    }
  }

  it('two or more workers were parked simultaneously', () => expect(sawParkedPair).toBe(true));
  // worker radius is 0.36, so anything under ~0.72 is visible overlap
  it('parked workers never overlap', () => expect(worstParked).toBeGreaterThan(0.72));
});
