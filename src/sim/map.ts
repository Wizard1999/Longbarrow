import type { World } from '../core/types';
import { rngSeed } from '../core/rng';
import { generateScenery, spawnBuilding, spawnResourceNode, spawnSquad } from './entities';

/**
 * Bump whenever map generation changes shape — different terrain, different
 * node placement, different scenery rules.
 *
 * A map seed alone is not enough to reproduce a map: the *generator* has to
 * match too. Without a version, changing the generator would silently make
 * every existing seed produce a different map, and old replays would play out
 * on terrain that no longer matches what was recorded. Versioning turns that
 * from a silent wrong answer into an explicit rejection.
 */
export const MAP_VERSION = 1;

/**
 * Phase 1 test map (assumption A5). Rotationally symmetric: rotate 180° about
 * the origin and the two sides match, satisfying §2's "maps are symmetric from
 * spawns, no spawn has an inherent advantage". Enforced by test, not by eye.
 */
export function buildTestMap(world: World): World {
  // Map generation draws from the map seed, kept entirely separate from the
  // match generator, so the same mapSeed always yields the same map regardless
  // of what the match does — and so previewing a map costs the match nothing.
  const mapRng = { rngState: rngSeed(world.mapSeed) };

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

  generateScenery(world, 26, mapRng);
  return world;
}
