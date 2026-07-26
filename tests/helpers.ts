import type { Team, Unit, World } from '../src/core/types';
import { createWorld, simStep } from '../src/sim/world';
import { buildTestMap } from '../src/sim/map';

/** Narrow away `undefined` from array/lookup access without scattering
 *  non-null assertions through the suites. */
export function must<T>(value: T | null | undefined, what = 'value'): T {
  if (value === null || value === undefined) throw new Error(`expected ${what} to exist`);
  return value;
}

export const freshMap = (seed = 1337): World => buildTestMap(createWorld(seed));

export const run = (w: World, n: number): void => {
  for (let i = 0; i < n; i++) simStep(w);
};

export const workersOf = (w: World, team: Team): Unit[] =>
  w.units.filter(u => u.team === team && u.gather);

export const gatherOf = (u: Unit) => must(u.gather, 'gather job');
export const buildOf = (u: Unit) => must(u.build, 'build job');
