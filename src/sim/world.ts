import type { World } from '../core/types';
import { makeRng } from '../core/rng';
import { stepProduction } from './production';
import { stepBuild, stepConstruction } from './construction';
import { stepGather } from './economy';
import { stepMovement } from './movement';

export function createWorld(seed: number): World {
  return {
    seed,
    rng: makeRng(seed),
    tick: 0,
    nextId: 1,
    units: [],
    buildings: [],
    nodes: [],
    sites: [],          // construction in progress
    scenery: [],
    resources: { player: 0, rival: 0 },
  };
}

export function simStep(world: World): void {
  world.tick++;
  for (const u of world.units) {
    u.prevX = u.x; u.prevZ = u.z; u.prevFacing = u.facing;
  }
  stepProduction(world);
  stepConstruction(world);
  for (const u of world.units) stepGather(world, u);   // decides where to go
  for (const u of world.units) stepBuild(world, u);    // ...or where to build
  for (const u of world.units) stepMovement(u);        // goes there
}
