import type { BuildingTypeKey, UnitTypeKey } from '../core/types';
import type { ResourceCost } from './resources';

/**
 * Command structures. `command` is the supply this building contributes;
 * `controlRadius` is the territory it holds. §8.1 has Command extend control
 * range and population cap *together*, so they are two properties of one
 * building rather than two separate systems.
 */
export interface BuildingDef {
  radius: number;
  hp: number;
  dropoff: boolean;
  command: number;
  controlRadius: number;
  cost: ResourceCost;
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
  },
  outpost: {
    radius: 1.4, hp: 1100, dropoff: true, command: 8, controlRadius: 11,
    cost: { material: 100 }, vision: 13, buildTicks: 150, produces: ['worker'], label: 'Outpost',
  },
};
