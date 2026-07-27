import type { World } from '../core/types';
import { rngSeed } from '../core/rng';
import { startTickForHour } from './daynight';
import { MAP_VERSION } from './map';
import { stepProduction } from './production';
import { stepBuild, stepConstruction } from './construction';
import { stepGather } from './economy';
import { stepMovement } from './movement';
import { stepSquads } from './squads';
import { stepSettle } from './combat';

export function createWorld(seed: number, startHour = 8, mapSeed = seed): World {
  return {
    seed,
    rngState: rngSeed(seed),
    mapSeed: rngSeed(mapSeed),
    mapVersion: MAP_VERSION,
    tick: 0,
    dayStartTick: startTickForHour(startHour),
    nextId: 1,
    units: [],
    buildings: [],
    nodes: [],
    sites: [],          // construction in progress
    scenery: [],
    squads: [],         // persistent groups running behaviour chains
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
  stepSquads(world);                                   // standing orders first
  for (const u of world.units) stepGather(world, u);   // decides where to go
  for (const u of world.units) stepBuild(world, u);    // ...or where to build
  for (const u of world.units) stepMovement(u);        // goes there
  stepSettle(world);                                   // ...and settles, or doesn't
}
