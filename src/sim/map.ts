import type { World } from '../core/types';
import { rngSeed } from '../core/rng';
import { generateScenery, spawnBuilding, spawnResourceNode, spawnSquad } from './entities';
import { mapBoundaryForSeed, mapLayoutForBoundary } from './mapBoundary';
import { RESOURCES, RESOURCE_ORDER } from '../data/resources';

// Chosen by declared abundance rather than by name, so the engine stays unaware
// of which resources this game happens to ship (D-029/D-031).
const COMMON = RESOURCE_ORDER.find(id => RESOURCES[id].abundance === 'common') ?? RESOURCE_ORDER[0]!;
const RARE = RESOURCE_ORDER.find(id => RESOURCES[id].abundance === 'rare') ?? COMMON;

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
export const MAP_VERSION = 4;

/**
 * Phase 1 seeded map (assumption A5). Boundary-derived and rotationally symmetric: rotate 180° about
 * the origin and the two sides match, satisfying §2's "maps are symmetric from
 * spawns, no spawn has an inherent advantage". Enforced by test, not by eye.
 */
export function buildTestMap(world: World): World {
  // Map generation draws from the map seed, kept entirely separate from the
  // match generator, so the same mapSeed always yields the same map regardless
  // of what the match does — and so previewing a map costs the match nothing.
  const mapRng = { rngState: rngSeed(world.mapSeed) };
  const boundary = mapBoundaryForSeed(world.mapSeed);
  const layout = mapLayoutForBoundary(boundary);

  spawnBuilding(world, 'standard', 'player', layout.playerBase.x, layout.playerBase.z);
  spawnBuilding(world, 'standard', 'rival', layout.rivalBase.x, layout.rivalBase.z);

  // Common nodes sit near each base; the scarce ones are out on contested
  // ground, which is what makes holding territory an economic decision (D-031).
  for (const n of layout.playerResources) spawnResourceNode(world, n.x, n.z, COMMON);
  for (const n of layout.rivalResources) spawnResourceNode(world, n.x, n.z, COMMON);
  for (const n of layout.contestedResources) spawnResourceNode(world, n.x, n.z, RARE);

  spawnSquad(world, 'worker', 'player', layout.playerWorkers.x, layout.playerWorkers.z, 4);
  spawnSquad(world, 'legionnaire', 'player', layout.playerArmy.x, layout.playerArmy.z, 4);
  spawnSquad(world, 'worker', 'rival', layout.rivalWorkers.x, layout.rivalWorkers.z, 4);
  spawnSquad(world, 'legionnaire', 'rival', layout.rivalArmy.x, layout.rivalArmy.z, 4);

  generateScenery(world, 26, mapRng);
  return world;
}
