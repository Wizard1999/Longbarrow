import type { BuildingTypeKey, UnitTypeKey } from '../core/types';
import type { ResourceCost } from './resources';

/**
 * Command structures. `command` is the supply this building contributes;
 * `controlRadius` is the territory it holds. §8.1 has Command extend control
 * range and population cap *together*, so they are two properties of one
 * building rather than two separate systems.
 */
/**
 * How a building reads as a shape.
 *
 * Declared per building for the same reason units are (`SilhouetteDef` in
 * `units.ts`): the Outpost was previously the Standard scaled down by radius
 * alone, so the two were the same object at two sizes and told you nothing about
 * their role. A game author should set how their structures read rather than
 * inherit whatever one form the renderer happens to build.
 */
export interface BuildingSilhouette {
  /** Radius at the top and base of the main drum, as multiples of `radius`. */
  drumTop: number;
  drumBottom: number;
  drumHeight: number;
  /** Standing ribs around the drum. Fossil, not machinery (§8.8). */
  ribCount: number;
  ribHeight: number;
  /** The "still faintly alive" core: size and how high it floats. */
  coreScale: number;
  coreHeight: number;
}

export interface BuildingDef {
  radius: number;
  hp: number;
  dropoff: boolean;
  command: number;
  controlRadius: number;
  cost: ResourceCost;
  silhouette: BuildingSilhouette;
  /** Sight radius, in world units — a balance number, kept out of the fog code. */
  vision: number;
  buildTicks: number;
  produces: readonly UnitTypeKey[];
  label: string;
}

export const BUILDING_TYPES: Record<BuildingTypeKey, BuildingDef> = {
  standard: {
    radius: 2.2, hp: 2200, dropoff: true, command: 15, controlRadius: 18,
    cost: {}, vision: 17, buildTicks: 0,
    produces: ['worker', 'legionnaire', 'marksman', 'outrider'], label: 'Standard',
    // Tall, ribbed and crowned: the thing you defend, and the thing whose loss
    // ends the match, so it should dominate the skyline of its own base.
    silhouette: {
      drumTop: 0.91, drumBottom: 1.09, drumHeight: 0.68,
      ribCount: 6, ribHeight: 1.18, coreScale: 0.33, coreHeight: 1.14,
    },
  },
  outpost: {
    radius: 1.4, hp: 1100, dropoff: true, command: 8, controlRadius: 11,
    cost: { material: 100 }, vision: 13, buildTicks: 150, produces: ['worker'], label: 'Outpost',
    // Squat and wide-based, with fewer and shorter ribs and the core sunk low:
    // reads as a forward holding, not a small capital.
    silhouette: {
      drumTop: 1.02, drumBottom: 1.24, drumHeight: 0.82,
      ribCount: 4, ribHeight: 0.78, coreScale: 0.28, coreHeight: 0.92,
    },
  },
};
