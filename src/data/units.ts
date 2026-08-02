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
  /**
   * Scales the *bonus portion* of positional flank damage: effective
   * multiplier = 1 + (base − 1) × expertise. Frontal attacks (base 1) are
   * untouched, which is exactly the asymmetry a flanker wants — declared here
   * so the combat engine rewards the trait, never the unit's name (D-029).
   */
  flankExpertise?: number;
  /** Sight radius, in world units. A balance number, so it lives here and not
   *  in the fog-of-war code that consumes it. */
  vision: number;
  /** Training hotkey shown in the HUD and bound by the input layer. Content,
   *  not code: a new unit declares its key here and both pick it up. */
  hotkey?: string;
  combat: CombatDef;
}

export const UNIT_TYPES: Record<UnitTypeKey, UnitDef> = {
  legionnaire: {
    speed: 4.2, radius: 0.42, arriveEpsilon: 0.06, isWorker: false,
    supply: 2, cost: { material: 75 }, buildTicks: 120, label: 'Legionnaire', formsShieldWall: true,
    vision: 11, hotkey: 'e',
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
    vision: 14, hotkey: 'r',
    // Ranged. Deliberately punishing to kite with: accuracy while moving is a
    // fraction of its accuracy set up, and it takes COMBAT.settleTicks of
    // standing still to get all the way back (§8.7, design doc §2 — skill
    // should live in positioning, not in execution speed).
    combat: {
      hp: 70, damage: 14, range: 7.5, attackTicks: 36,
      accuracyStationary: 0.95, accuracyMoving: 0.35, defense: 0,
    },
  },
  outrider: {
    speed: 6.0, radius: 0.4, arriveEpsilon: 0.06, isWorker: false,
    supply: 2, cost: { material: 70 }, buildTicks: 110, label: 'Outrider',
    // Flanker/scout (§8.7): "exploits flank bonuses; weak head-on". The
    // expertise doubles the positional bonus — rear becomes ×1.70, side ×1.30 —
    // while frontal damage stays at the multiplier every unit gets. Weak
    // head-on is the rest of the row: no defense, modest HP, and less damage
    // than a Legionnaire trading front-to-front through a shield wall. The
    // speed and vision are the scout half: it outruns everything on the
    // roster and sees further than the Marksman.
    flankExpertise: 2.0,
    vision: 16, hotkey: 'f',
    combat: {
      hp: 80, damage: 8, range: 0.9, attackTicks: 22,
      accuracyStationary: 0.85, accuracyMoving: 0.7, defense: 0,
    },
  },
  worker: {
    speed: 3.6, radius: 0.36, arriveEpsilon: 0.06, isWorker: true,
    supply: 1, cost: { material: 50 }, buildTicks: 90, label: 'Worker',
    vision: 9, hotkey: 'q',
    combat: {
      hp: 60, damage: 3, range: 0.8, attackTicks: 36,
      accuracyStationary: 0.6, accuracyMoving: 0.6, defense: 0,
    },
  },
};
