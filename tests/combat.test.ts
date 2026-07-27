import { describe, it, expect } from 'vitest';
import { freshMap, must, run } from './helpers';
import { createWorld, simStep } from '../src/sim/world';
import { spawnUnit } from '../src/sim/entities';
import { cmdMove } from '../src/sim/commands';
import {
  adjacentLegionnaires, effectiveAccuracy, effectiveDefense, expectedDamage,
  maxHp, settleFraction, shieldWallStacks,
} from '../src/sim/combat';
import { COMBAT } from '../src/data/tuning';
import { UNIT_TYPES } from '../src/data/units';
import type { World } from '../src/core/types';

/** A line of Legionnaires spaced so each touches its neighbours. */
function line(world: World, count: number, gap: number) {
  const out = [];
  for (let i = 0; i < count; i++) out.push(spawnUnit(world, 'legionnaire', 'player', i * gap, 0));
  return out;
}

// [33] the Legionnaire shield wall (06 §4 acceptance, design doc §8.7)
describe('[33] Legionnaire defense scales with adjacent Legionnaires', () => {
  it('a lone Legionnaire gets no wall bonus', () => {
    const w = createWorld(1);
    const u = spawnUnit(w, 'legionnaire', 'player', 0, 0);
    expect(adjacentLegionnaires(w, u)).toBe(0);
    expect(effectiveDefense(w, u)).toBe(UNIT_TYPES.legionnaire.combat.defense);
  });

  it('defense rises with each adjacent Legionnaire', () => {
    const w = createWorld(1);
    const units = line(w, 4, COMBAT.shieldWallRadius * 0.9);
    const defenses = units.map(u => effectiveDefense(w, u));
    const lone = createWorld(2);
    const solo = spawnUnit(lone, 'legionnaire', 'player', 0, 0);
    // every unit in the line beats the solo unit
    expect(defenses.every(d => d > effectiveDefense(lone, solo))).toBe(true);
    // and the interior of the line beats its ends
    const first = must(defenses[0]);
    const second = must(defenses[1]);
    expect(second).toBeGreaterThan(first);
  });

  it('a formed line measurably out-trades the same models scattered', () => {
    const formed = createWorld(1);
    line(formed, 5, COMBAT.shieldWallRadius * 0.9);
    const scattered = createWorld(1);
    line(scattered, 5, COMBAT.shieldWallRadius * 6);
    const attacker = spawnUnit(scattered, 'marksman', 'rival', 100, 100);
    attacker.stillTicks = COMBAT.settleTicks;

    const dmgFormed = formed.units.map(u => expectedDamage(formed, attacker, u));
    const dmgScattered = scattered.units
      .filter(u => u.type === 'legionnaire')
      .map(u => expectedDamage(scattered, attacker, u));
    const avg = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
    expect(avg(dmgFormed)).toBeLessThan(avg(dmgScattered));
  });

  it('the bonus is capped, so infinite stacking does nothing', () => {
    const w = createWorld(1);
    // pile far more neighbours than the cap into one spot
    for (let i = 0; i < COMBAT.shieldWallMaxNeighbours + 6; i++) {
      spawnUnit(w, 'legionnaire', 'player', 0.01 * i, 0);
    }
    const u = must(w.units[0]);
    expect(adjacentLegionnaires(w, u)).toBeGreaterThan(COMBAT.shieldWallMaxNeighbours);
    expect(shieldWallStacks(w, u)).toBe(COMBAT.shieldWallMaxNeighbours);
  });

  it('defense never exceeds the ceiling', () => {
    const w = createWorld(1);
    for (let i = 0; i < 30; i++) spawnUnit(w, 'legionnaire', 'player', 0.01 * i, 0);
    expect(effectiveDefense(w, must(w.units[0]))).toBeLessThanOrEqual(COMBAT.maxDefense);
  });

  it('enemy Legionnaires do not reinforce your wall', () => {
    const w = createWorld(1);
    const mine = spawnUnit(w, 'legionnaire', 'player', 0, 0);
    spawnUnit(w, 'legionnaire', 'rival', 0.4, 0);
    expect(adjacentLegionnaires(w, mine)).toBe(0);
  });

  it('other unit types do not reinforce the wall', () => {
    const w = createWorld(1);
    const mine = spawnUnit(w, 'legionnaire', 'player', 0, 0);
    spawnUnit(w, 'marksman', 'player', 0.4, 0);
    spawnUnit(w, 'worker', 'player', 0.5, 0);
    expect(adjacentLegionnaires(w, mine)).toBe(0);
  });

  it('only Legionnaires get a wall at all', () => {
    const w = createWorld(1);
    const m = spawnUnit(w, 'marksman', 'player', 0, 0);
    spawnUnit(w, 'marksman', 'player', 0.3, 0);
    expect(shieldWallStacks(w, m)).toBe(0);
  });
});

// [34] the Marksman (06 §4 acceptance, design doc §8.7)
describe('[34] Marksman accuracy is better stationary than moving', () => {
  it('stationary accuracy beats moving accuracy in the data', () => {
    const c = UNIT_TYPES.marksman.combat;
    expect(c.accuracyStationary).toBeGreaterThan(c.accuracyMoving);
  });

  it('a settled Marksman is measurably more accurate than a walking one', () => {
    const w = freshMap();
    const settled = spawnUnit(w, 'marksman', 'player', -6, 6);
    const walking = spawnUnit(w, 'marksman', 'player', -4, 6);
    cmdMove(w, [walking.id], 12, 12);
    run(w, COMBAT.settleTicks + 10);

    expect(walking.target).not.toBeNull();          // still en route
    expect(settleFraction(settled)).toBe(1);
    expect(effectiveAccuracy(settled)).toBeGreaterThan(effectiveAccuracy(walking));
    expect(effectiveAccuracy(settled)).toBeCloseTo(UNIT_TYPES.marksman.combat.accuracyStationary, 6);
    expect(effectiveAccuracy(walking)).toBeCloseTo(UNIT_TYPES.marksman.combat.accuracyMoving, 6);
  });

  it('it takes time to set up — stopping does not restore accuracy instantly', () => {
    const w = createWorld(1);
    const m = spawnUnit(w, 'marksman', 'player', 0, 0);
    cmdMove(w, [m.id], 8, 0);
    run(w, 20);
    const movingAcc = effectiveAccuracy(m);
    cmdMove(w, [m.id], m.x, m.z);        // effectively "stop here"
    run(w, 1);
    const justStopped = effectiveAccuracy(m);
    run(w, COMBAT.settleTicks + 2);
    const settled = effectiveAccuracy(m);

    expect(justStopped).toBeLessThan(settled);
    expect(movingAcc).toBeLessThan(settled);
    expect(settled).toBeCloseTo(UNIT_TYPES.marksman.combat.accuracyStationary, 6);
  });

  it('moving again immediately costs the setup', () => {
    const w = createWorld(1);
    const m = spawnUnit(w, 'marksman', 'player', 0, 0);
    run(w, COMBAT.settleTicks + 5);
    expect(settleFraction(m)).toBe(1);
    cmdMove(w, [m.id], 20, 0);
    run(w, 3);
    expect(settleFraction(m)).toBeLessThan(1);
  });

  it('the Legionnaire is not punished for moving — that is the Marksman trade', () => {
    const c = UNIT_TYPES.legionnaire.combat;
    expect(c.accuracyMoving).toBe(c.accuracyStationary);
  });

  it('kiting is worse than holding: expected damage drops while moving', () => {
    const w = freshMap();
    const settled = spawnUnit(w, 'marksman', 'player', -6, 6);
    const kiting = spawnUnit(w, 'marksman', 'player', -4, 6);
    const target = spawnUnit(w, 'legionnaire', 'rival', 20, 20);
    cmdMove(w, [kiting.id], 12, 12);
    run(w, COMBAT.settleTicks + 10);
    expect(expectedDamage(w, kiting, target)).toBeLessThan(expectedDamage(w, settled, target));
  });
});

// [35] combat stat plumbing
describe('[35] units carry combat state', () => {
  it('every unit type spawns at full hp', () => {
    const w = createWorld(1);
    for (const type of ['legionnaire', 'marksman', 'worker'] as const) {
      const u = spawnUnit(w, type, 'player', 0, 0);
      expect(u.hp).toBe(maxHp(u));
      expect(u.hp).toBeGreaterThan(0);
    }
  });

  it('the Marksman outranges the Legionnaire', () => {
    expect(UNIT_TYPES.marksman.combat.range).toBeGreaterThan(UNIT_TYPES.legionnaire.combat.range);
  });

  it('the Legionnaire is tougher than the Marksman', () => {
    expect(UNIT_TYPES.legionnaire.combat.hp).toBeGreaterThan(UNIT_TYPES.marksman.combat.hp);
  });

  it('a spawned unit starts unsettled and settles by standing still', () => {
    const w = createWorld(1);
    const u = spawnUnit(w, 'marksman', 'player', 0, 0);
    expect(u.stillTicks).toBe(0);
    run(w, COMBAT.settleTicks);
    expect(settleFraction(u)).toBe(1);
  });

  it('settling is deterministic across identical runs', () => {
    const play = () => {
      const w = freshMap(11);
      const m = spawnUnit(w, 'marksman', 'player', -6, 6);
      cmdMove(w, [m.id], 0, 0);
      run(w, 120);
      return [m.stillTicks, m.x.toFixed(9), m.z.toFixed(9)].join(',');
    };
    expect(play()).toBe(play());
  });

  it('the sim still runs a full map with the new unit in it', () => {
    const w = freshMap();
    spawnUnit(w, 'marksman', 'player', -10, 8);
    expect(() => { for (let i = 0; i < 300; i++) simStep(w); }).not.toThrow();
  });
});
