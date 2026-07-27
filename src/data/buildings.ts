import type { BuildingTypeKey, UnitTypeKey } from '../core/types';

/**
 * Command structures. `command` is the supply this building contributes;
 * `controlRadius` is the territory it holds. §8.1 has Command extend control
 * range and population cap *together*, so they are two properties of one
 * building rather than two separate systems.
 */
export interface BuildingDef {
  radius: number;
  dropoff: boolean;
  command: number;
  controlRadius: number;
  cost: number;
  buildTicks: number;
  produces: readonly UnitTypeKey[];
  label: string;
}

export const BUILDING_TYPES: Record<BuildingTypeKey, BuildingDef> = {
  standard: {
    radius: 2.2, dropoff: true, command: 15, controlRadius: 18,
    cost: 0, buildTicks: 0, produces: ['worker', 'legionnaire', 'marksman'], label: 'Standard',
  },
  outpost: {
    radius: 1.4, dropoff: true, command: 8, controlRadius: 11,
    cost: 100, buildTicks: 150, produces: ['worker'], label: 'Outpost',
  },
};
