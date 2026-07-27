import type { Unit, World } from '../core/types';
import { UNIT_TYPES } from '../data/units';
import { COMBAT } from '../data/tuning';

/**
 * Step 1.8 — the two unit identities, expressed as derived stats.
 *
 * There is no fighting here yet; that arrives at 1.9. What lives in this file
 * is the answer to "how good is this unit right now, standing where it is
 * standing", which is the whole point of a game where positioning beats micro
 * (design doc §2). Everything is a pure function of world state, so both
 * claims in 06 §4 are measurable without a battle.
 */

/** Legionnaires within shield-wall radius, excluding the unit itself. */
export function adjacentLegionnaires(world: World, unit: Unit): number {
  if (unit.type !== 'legionnaire') return 0;
  let n = 0;
  for (const other of world.units) {
    if (other.id === unit.id) continue;
    if (other.type !== 'legionnaire') continue;
    if (other.team !== unit.team) continue;
    if (other.hp <= 0) continue;
    if (Math.hypot(other.x - unit.x, other.z - unit.z) <= COMBAT.shieldWallRadius) n++;
  }
  return n;
}

/** Adjacent Legionnaires that actually count, after the cap. */
export function shieldWallStacks(world: World, unit: Unit): number {
  return Math.min(adjacentLegionnaires(world, unit), COMBAT.shieldWallMaxNeighbours);
}

/**
 * Defense as a fraction of incoming damage ignored. For a Legionnaire this
 * climbs with the shield wall, so a formed line measurably out-trades the same
 * models standing apart — the mechanic §8.7 gives the unit.
 */
export function effectiveDefense(world: World, unit: Unit): number {
  const base = UNIT_TYPES[unit.type].combat.defense;
  const wall = shieldWallStacks(world, unit) * COMBAT.shieldWallPerNeighbour;
  return Math.min(base + wall, COMBAT.maxDefense);
}

/** A unit is "set up" once it has held position for COMBAT.settleTicks. */
export function settleFraction(unit: Unit): number {
  if (COMBAT.settleTicks <= 0) return 1;
  return Math.min(unit.stillTicks / COMBAT.settleTicks, 1);
}

/**
 * Accuracy right now: interpolated from the moving value to the stationary one
 * as the unit settles. For a Marksman the gap is large and the ramp is the
 * reason kiting is a bad idea; for everything else the two values are equal,
 * so this returns a constant.
 */
export function effectiveAccuracy(unit: Unit): number {
  const c = UNIT_TYPES[unit.type].combat;
  return c.accuracyMoving + (c.accuracyStationary - c.accuracyMoving) * settleFraction(unit);
}

/** Expected damage per attack, before positional modifiers (high ground and
 *  flanking arrive with 1.9). Accuracy is folded in as an expectation rather
 *  than a die roll so the value is comparable and testable. */
export function expectedDamage(world: World, attacker: Unit, defender: Unit): number {
  const raw = UNIT_TYPES[attacker.type].combat.damage;
  return raw * effectiveAccuracy(attacker) * (1 - effectiveDefense(world, defender));
}

export function isAlive(unit: Unit): boolean {
  return unit.hp > 0;
}

export function maxHp(unit: Unit): number {
  return UNIT_TYPES[unit.type].combat.hp;
}

/** Tracks how long each unit has held position. Runs after movement so that a
 *  unit which moved this tick is correctly counted as moving. */
export function stepSettle(world: World): void {
  for (const u of world.units) {
    const moved = u.x !== u.prevX || u.z !== u.prevZ;
    if (moved) u.stillTicks = 0;
    else u.stillTicks++;
  }
}
