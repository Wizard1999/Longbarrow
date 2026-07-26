import type { World } from '../core/types';
import { generateScenery, spawnBuilding, spawnResourceNode, spawnSquad } from './entities';

/**
 * Phase 1 test map (assumption A5). Rotationally symmetric: rotate 180° about
 * the origin and the two sides match, satisfying §2's "maps are symmetric from
 * spawns, no spawn has an inherent advantage". Enforced by test, not by eye.
 */
export function buildTestMap(world: World): World {
  spawnBuilding(world, 'standard', 'player', -14, 10);
  spawnBuilding(world, 'standard', 'rival', 14, -10);

  spawnResourceNode(world, -19.5, 4.0);
  spawnResourceNode(world, -8.0, 15.5);
  spawnResourceNode(world, 19.5, -4.0);
  spawnResourceNode(world, 8.0, -15.5);

  spawnSquad(world, 'worker', 'player', -12.0, 7.0, 4);
  spawnSquad(world, 'legionnaire', 'player', -10.0, 3.0, 4);
  spawnSquad(world, 'worker', 'rival', 12.0, -7.0, 4);
  spawnSquad(world, 'legionnaire', 'rival', 10.0, -3.0, 4);

  generateScenery(world, 26);
  return world;
}
