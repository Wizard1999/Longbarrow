import type { BuildingTypeKey, CommandResult, EntityId, Site, Team, Unit, World } from '../core/types';
import { BUILDING_TYPES } from '../data/buildings';
import { BUILD, PLACE_CLEARANCE } from '../data/tuning';
import { circleInMapBoundary, mapBoundaryForSeed } from './mapBoundary';
import { spawnBuilding } from './entities';
import { approachPoint } from './economy';

// Cohort's "Queue & Walk" (§8.1): a worker walks to the site and builds; the
// worker can be reassigned mid-build and construction PAUSES rather than
// cancelling. Progress is stored on the site so it survives losing every
// builder — that is the whole point of the mechanic.

export function canPlaceBuilding(
  world: World, team: Team, typeKey: BuildingTypeKey, x: number, z: number,
): CommandResult {
  const t = BUILDING_TYPES[typeKey];
  const boundary = mapBoundaryForSeed(world.mapSeed);
  if (!circleInMapBoundary(boundary, x, z, t.radius + 2)) return { ok: false, reason: 'off the map' };
  if (world.resources[team] < t.cost) return { ok: false, reason: 'not enough essence' };
  for (const b of world.buildings) {
    if (Math.hypot(b.x - x, b.z - z) < t.radius + b.radius + PLACE_CLEARANCE) {
      return { ok: false, reason: 'too close to a structure' };
    }
  }
  for (const st of world.sites) {
    if (Math.hypot(st.x - x, st.z - z) < t.radius + st.radius + PLACE_CLEARANCE) {
      return { ok: false, reason: 'too close to a build site' };
    }
  }
  for (const n of world.nodes) {
    if (n.amount > 0 && Math.hypot(n.x - x, n.z - z) < t.radius + 1.6) {
      return { ok: false, reason: 'blocked by essence' };
    }
  }
  return { ok: true };
}

export function spawnSite(
  world: World, typeKey: BuildingTypeKey, team: Team, x: number, z: number,
): Site {
  const t = BUILDING_TYPES[typeKey];
  const site: Site = {
    id: world.nextId++,
    type: typeKey, team, x, z,
    radius: t.radius,
    progress: 0,
    required: t.buildTicks,
  };
  world.sites.push(site);
  return site;
}

export function findSite(world: World, id: EntityId | null): Site | null {
  return world.sites.find(s => s.id === id) ?? null;
}

export function buildersOn(world: World, siteId: EntityId): Unit[] {
  return world.units.filter(u => u.build && u.build.siteId === siteId);
}

/** A builder only counts while it is actually standing at the site. Walking
 *  there does not advance anything. */
export function builderIsWorking(world: World, u: Unit): boolean {
  if (!u.build || u.build.siteId === null) return false;
  const site = findSite(world, u.build.siteId);
  if (!site) return false;
  return Math.hypot(site.x - u.x, site.z - u.z) <= site.radius + BUILD.buildRange;
}

export function stepConstruction(world: World): void {
  for (let i = world.sites.length - 1; i >= 0; i--) {
    const site = world.sites[i];
    if (!site) continue;
    const working = buildersOn(world, site.id).some(u => builderIsWorking(world, u));
    if (!working) continue;                      // paused, progress retained
    site.progress += BUILD.progressPerTick;
    if (site.progress < site.required) continue;

    // finished — becomes a real structure, builders are released
    world.sites.splice(i, 1);
    spawnBuilding(world, site.type, site.team, site.x, site.z);
    for (const u of buildersOn(world, site.id)) {
      if (u.build) u.build.siteId = null;
      u.target = null;
    }
  }
}

/** Walk to the site and stay put. Movement only; progress is stepConstruction's job. */
export function stepBuild(world: World, u: Unit): void {
  if (!u.build || u.build.siteId === null) return;
  const site = findSite(world, u.build.siteId);
  if (!site) { u.build.siteId = null; return; }
  if (builderIsWorking(world, u)) { u.target = null; return; }
  u.target = approachPoint(u, site.x, site.z, site.radius + BUILD.builderStandoff);
}
