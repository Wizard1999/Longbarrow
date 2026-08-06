import type { Team, Unit, World } from '../src/core/types';
import { createWorld, simStep } from '../src/sim/world';
import { buildTestMap } from '../src/sim/map';
import { RESOURCE_ORDER } from '../src/data/resources';
import type { ResourceId } from '../src/data/resources';

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

/**
 * Fill every declared resource to `amount` (D-031).
 *
 * Tests that just need "enough to pay for things" should not have to know the
 * economy's shape — that is the point of the registry, and it keeps these tests
 * from needing an edit every time the resource set changes.
 */
export function fund(world: World, team: Team, amount: number): void {
  for (const id of RESOURCE_ORDER) world.resources[team][id] = amount;
}

/** Read one resource's stock. */
export function stock(world: World, team: Team, id: ResourceId = 'material'): number {
  return world.resources[team][id];
}

/** Total banked across every declared resource — "how much economy happened". */
export function banked(world: World, team: Team): number {
  let total = 0;
  for (const id of RESOURCE_ORDER) total += world.resources[team][id];
  return total;
}
