import { describe, expect, it } from 'vitest';
import { createWorld, simStep } from '../src/sim/world';
import { buildTestMap } from '../src/sim/map';
import { hash, restore, snapshot } from '../src/sim/snapshot';
import { cmdSetSelection, cmdFormSquad } from '../src/sim/commands';
import { rngNext } from '../src/core/rng';
import type { World } from '../src/core/types';

/**
 * These tests guard the foundation under rollback netcode, replays and
 * server-side match validation (docs/DECISIONS.md D-008, D-010).
 *
 * They are cheap to run and catch a whole class of bug that is otherwise
 * invisible until two machines disagree in a live match.
 */

function fresh(seed = 1337): World {
  return buildTestMap(createWorld(seed));
}

/** A scripted command stream — stands in for one player's match input. */
function drive(w: World, ticks: number): void {
  for (let t = 0; t < ticks; t++) {
    if (t === 5) cmdSetSelection(w, w.units.filter(u => u.team === 'player').map(u => u.id));
    if (t === 9) {
      cmdFormSquad(w, 'player', w.units.filter(u => u.selected).map(u => u.id), 1);
    }
    simStep(w);
  }
}

describe('determinism', () => {
  it('same seed and same inputs produce an identical world', () => {
    const a = fresh();
    const b = fresh();
    drive(a, 200);
    drive(b, 200);
    expect(hash(a)).toBe(hash(b));
  });

  it('different seeds produce different worlds', () => {
    const a = fresh(1337);
    const b = fresh(9001);
    drive(a, 200);
    drive(b, 200);
    expect(hash(a)).not.toBe(hash(b));
  });

  it('the hash actually changes as the sim advances', () => {
    // Guards against a hash so lossy it reports everything as identical, which
    // would make every other test here pass for the wrong reason.
    const w = fresh();
    const seen = new Set<string>();
    for (let i = 0; i < 40; i++) { simStep(w); seen.add(hash(w)); }
    expect(seen.size).toBeGreaterThan(30);
  });
});

describe('snapshot / restore', () => {
  it('restoring rewinds the world exactly', () => {
    const w = fresh();
    drive(w, 60);
    const snap = snapshot(w);
    const at60 = hash(w);

    drive(w, 40);
    expect(hash(w)).not.toBe(at60);

    restore(w, snap);
    expect(hash(w)).toBe(at60);
    expect(w.tick).toBe(60);
  });

  it('re-simulating after a restore reproduces the same future', () => {
    // This is precisely the rollback operation: rewind, then replay forward.
    const w = fresh();
    drive(w, 60);
    const snap = snapshot(w);

    for (let i = 0; i < 30; i++) simStep(w);
    const future = hash(w);

    restore(w, snap);
    for (let i = 0; i < 30; i++) simStep(w);
    expect(hash(w)).toBe(future);
  });

  it('a snapshot is not aliased to the live world', () => {
    const w = fresh();
    drive(w, 30);
    const snap = snapshot(w);
    const before = hash(snap as World);
    drive(w, 30);
    expect(hash(snap as World)).toBe(before);
  });

  it('restore is in place, so held references stay valid', () => {
    // Rollback must not swap the World object — views hold a long-lived
    // reference to it and would end up pointed at an orphan.
    const w = fresh();
    const ref = w;
    drive(w, 40);
    const snap = snapshot(w);
    drive(w, 20);
    restore(w, snap);
    expect(ref).toBe(w);
    expect(ref.tick).toBe(40);
  });
});

describe('rng is snapshot-safe state, not a closure', () => {
  it('rng state is a plain number on the world', () => {
    const w = fresh();
    expect(typeof w.rngState).toBe('number');
  });

  it('restoring rewinds the generator position too', () => {
    const w = fresh();
    const snap = snapshot(w);
    const first = [rngNext(w), rngNext(w), rngNext(w)];
    restore(w, snap);
    expect([rngNext(w), rngNext(w), rngNext(w)]).toEqual(first);
  });

  it('survives a serialize/deserialize round trip', () => {
    // Replays and match validation both cross a wire. A closure would not.
    const w = fresh();
    drive(w, 50);
    const wire = JSON.parse(JSON.stringify(w)) as World;
    expect(hash(wire)).toBe(hash(w));

    for (let i = 0; i < 25; i++) simStep(w);
    for (let i = 0; i < 25; i++) simStep(wire);
    expect(hash(wire)).toBe(hash(w));
  });
});
