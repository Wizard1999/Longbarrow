import type { UnitTypeKey } from '../core/types';
import type { ResourceCost } from './resources';

/** Combat stats. Present on every unit — workers have them so they can be
 *  killed at 1.9 and so the win condition at 1.12 has something to chew on,
 *  not because they're meant to fight. */
export interface CombatDef {
  hp: number;
  /** Damage per attack, before defense and positional modifiers. */
  damage: number;
  /** 0 for melee-range units; the sim treats this as reach, not a projectile. */
  range: number;
  /** Ticks between attacks. */
  attackTicks: number;
  /** Chance to land an attack while standing still, 0–1. */
  accuracyStationary: number;
  /** ...and while moving. The gap between these two is the Marksman's
   *  identity: "rewards setup over kiting" (§8.7). */
  accuracyMoving: number;
  /** Flat fraction of incoming damage ignored, before any shield-wall bonus. */
  defense: number;
}

export interface UnitDef {
  speed: number;
  radius: number;
  arriveEpsilon: number;
  isWorker: boolean;
  supply: number;
  cost: ResourceCost;
  buildTicks: number;
  label: string;
  /**
   * Forms a defensive wall with adjacent units of the same type: defense
   * climbs per neighbour, up to a cap.
   *
   * A declared trait rather than a check for `type === 'legionnaire'` in the
   * combat code. The engine must not know Cohort's roster — if the races are
   * ever scrapped and rebuilt, a new race declares this flag and inherits the
   * mechanic with no change to `sim/`.
   */
  formsShieldWall?: boolean;
  combat: CombatDef;
}

export const UNIT_TYPES: Record<UnitTypeKey, UnitDef> = {
  legionnaire: {
    speed: 4.2, radius: 0.42, arriveEpsilon: 0.06, isWorker: false,
    supply: 2, cost: { material: 75 }, buildTicks: 120, label: 'Legionnaire', formsShieldWall: true,
    // Core melee. Its whole identity is the shield wall — see
    // sim/combat.ts shieldWallStacks(): defense climbs with each adjacent
    // Legionnaire, so a formed line is worth far more than the same models
    // scattered (§8.7).
    combat: {
      hp: 120, damage: 9, range: 0.9, attackTicks: 24,
      accuracyStationary: 0.9, accuracyMoving: 0.9, defense: 0.1,
    },
  },
  marksman: {
    speed: 3.8, radius: 0.38, arriveEpsilon: 0.06, isWorker: false,
    supply: 2, cost: { material: 85 }, buildTicks: 135, label: 'Marksman',
    // Ranged. Deliberately punishing to kite with: accuracy while moving is a
    // fraction of its accuracy set up, and it takes COMBAT.settleTicks of
    // standing still to get all the way back (§8.7, design doc §2 — skill
    // should live in positioning, not in execution speed).
    combat: {
      hp: 70, damage: 14, range: 7.5, attackTicks: 36,
      accuracyStationary: 0.95, accuracyMoving: 0.35, defense: 0,
    },
  },
  worker: {
    speed: 3.6, radius: 0.36, arriveEpsilon: 0.06, isWorker: true,
    supply: 1, cost: { material: 50 }, buildTicks: 90, label: 'Worker',
    combat: {
      hp: 60, damage: 3, range: 0.8, attackTicks: 36,
      accuracyStationary: 0.6, accuracyMoving: 0.6, defense: 0,
    },
  },
};
