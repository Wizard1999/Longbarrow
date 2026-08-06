import { describe, expect, it } from 'vitest';
import { createWorld } from '../src/sim/world';
import { buildTestMap } from '../src/sim/map';
import { spawnUnit } from '../src/sim/entities';
import { UNIT_TYPES } from '../src/data/units';
import { BUILDING_TYPES } from '../src/data/buildings';
import { COMBAT } from '../src/data/tuning';
import { flankMultiplier, resolvedDamage } from '../src/sim/combat';
import { cmdTrain } from '../src/sim/commands';
import { fund, must, run } from './helpers';
import type { Unit, World } from '../src/core/types';

const fresh = (seed = 1337) => buildTestMap(createWorld(seed));

// `facing` is atan2(dx, dz): facing 0 looks toward +z. Both fixtures place the
// attacker at −z; only the defender's facing differs, so the pair isolates the
// positional term.
function rearAttack(w: World, type: Unit['type']): { attacker: Unit; defender: Unit } {
  const defender = spawnUnit(w, 'legionnaire', 'rival', 0, 0);
  defender.facing = 0;                        // looking away, toward +z
  const attacker = spawnUnit(w, type, 'player', 0, -1.2);
  attacker.facing = 0;
  return { attacker, defender };
}

function frontalAttack(w: World, type: Unit['type']): { attacker: Unit; defender: Unit } {
  const defender = spawnUnit(w, 'legionnaire', 'rival', 0, 0);
  defender.facing = Math.PI;                  // turned to meet the attacker
  const attacker = spawnUnit(w, type, 'player', 0, -1.2);
  attacker.facing = 0;
  return { attacker, defender };
}

describe('flank expertise is a trait, not a name (D-029)', () => {
  it('scales only the bonus portion — a frontal attack gains nothing', () => {
    const w = fresh();
    const { attacker, defender } = frontalAttack(w, 'outrider');
    expect(flankMultiplier(attacker, defender)).toBe(1);
  });

  it('doubles the rear bonus for a declared expertise of 2', () => {
    const w = fresh();
    const { attacker, defender } = rearAttack(w, 'outrider');
    const expertise = UNIT_TYPES.outrider.flankExpertise ?? 1;
    expect(flankMultiplier(attacker, defender))
      .toBeCloseTo(1 + (COMBAT.flankBonus - 1) * expertise, 6);
  });

  it('leaves units without the trait at the base bonus', () => {
    const w = fresh();
    const { attacker, defender } = rearAttack(w, 'legionnaire');
    expect(flankMultiplier(attacker, defender)).toBeCloseTo(COMBAT.flankBonus, 6);
  });

  it('feeds all the way through to resolved damage', () => {
    const w = fresh();
    const rear = rearAttack(w, 'outrider');
    const front = frontalAttack(w, 'outrider');
    // Same unit, same target type; the only difference is where it stands.
    expect(resolvedDamage(w, rear.attacker, rear.defender))
      .toBeGreaterThan(resolvedDamage(w, front.attacker, front.defender) * 1.5);
  });
});

describe('the outrider is weak head-on, by the numbers', () => {
  it('declares no defense and less HP than the line it flanks around', () => {
    expect(UNIT_TYPES.outrider.combat.defense).toBe(0);
    expect(UNIT_TYPES.outrider.combat.hp).toBeLessThan(UNIT_TYPES.legionnaire.combat.hp);
  });

  it('is the fastest and furthest-seeing ground unit — the scout half', () => {
    for (const [key, def] of Object.entries(UNIT_TYPES)) {
      if (key === 'outrider') continue;
      expect(UNIT_TYPES.outrider.speed).toBeGreaterThan(def.speed);
      expect(UNIT_TYPES.outrider.vision).toBeGreaterThanOrEqual(def.vision);
    }
  });
});

describe('the outrider is reachable in play', () => {
  it('trains from the Standard', () => {
    expect(BUILDING_TYPES.standard.produces).toContain('outrider');
  });

  it('completes training and joins the world', () => {
    const w = fresh();
    fund(w, 'player', 10_000);
    const base = must(w.buildings.find(b => b.team === 'player'));
    expect(cmdTrain(w, base.id, 'outrider').ok).toBe(true);
    run(w, UNIT_TYPES.outrider.buildTicks + 5);
    expect(w.units.some(u => u.type === 'outrider' && u.team === 'player')).toBe(true);
  });

  it('declares a training hotkey that collides with no other unit', () => {
    const keys = Object.values(UNIT_TYPES).map(d => d.hotkey).filter(Boolean);
    expect(new Set(keys).size).toBe(keys.length);
    expect(UNIT_TYPES.outrider.hotkey).toBeTruthy();
  });
});

describe('vision comes from the data tables', () => {
  it('every unit and building declares a positive sight radius', () => {
    for (const def of Object.values(UNIT_TYPES)) expect(def.vision).toBeGreaterThan(0);
    for (const def of Object.values(BUILDING_TYPES)) expect(def.vision).toBeGreaterThan(0);
  });
});
