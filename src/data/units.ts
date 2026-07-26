import type { UnitTypeKey } from '../core/types';

export interface UnitDef {
  speed: number;
  radius: number;
  arriveEpsilon: number;
  isWorker: boolean;
  supply: number;
  cost: number;
  buildTicks: number;
  label: string;
}

export const UNIT_TYPES: Record<UnitTypeKey, UnitDef> = {
  legionnaire: {
    speed: 4.2, radius: 0.42, arriveEpsilon: 0.06, isWorker: false,
    supply: 2, cost: 75, buildTicks: 80, label: 'Legionnaire',
  },
  worker: {
    speed: 3.6, radius: 0.36, arriveEpsilon: 0.06, isWorker: true,
    supply: 1, cost: 50, buildTicks: 60, label: 'Worker',
  },
};
