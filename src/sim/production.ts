import type { CommandResult, EntityId, UnitTypeKey, World } from '../core/types';
import { GOLDEN_ANGLE } from '../core/loop';
import { BUILDING_TYPES } from '../data/buildings';
import { UNIT_TYPES } from '../data/units';
import { MAX_QUEUE } from '../data/tuning';
import { supplyFree } from './supply';
import { spawnUnit } from './entities';
import { assignGather } from './economy';
import { clampPointToMapBoundary, mapBoundaryForSeed } from './mapBoundary';
import { canAfford } from './resources';

export function canTrain(world: World, buildingId: EntityId, unitType: UnitTypeKey): CommandResult {
  const b = world.buildings.find(x => x.id === buildingId);
  if (!b) return { ok: false, reason: 'no such building' };
  const bt = BUILDING_TYPES[b.type];
  if (!bt.produces.includes(unitType)) return { ok: false, reason: 'cannot build that here' };
  if (b.queue.length >= MAX_QUEUE) return { ok: false, reason: 'queue full' };
  const ut = UNIT_TYPES[unitType];
  if (!canAfford(world.resources[b.team], ut.cost)) return { ok: false, reason: 'insufficient resources' };
  if (supplyFree(world, b.team) < ut.supply) return { ok: false, reason: 'not enough Command' };
  return { ok: true };
}

export function stepProduction(world: World): void {
  for (const b of world.buildings) {
    const item = b.queue[0];
    if (!item) continue;
    item.ticksLeft--;
    if (item.ticksLeft > 0) continue;
    b.queue.shift();
    // pop out at the building edge, then walk to the rally point
    const t = BUILDING_TYPES[b.type];
    const a = (world.tick * GOLDEN_ANGLE) % (Math.PI * 2);
    const boundary = mapBoundaryForSeed(world.mapSeed);
    const spawn = clampPointToMapBoundary(
      boundary,
      b.x + Math.cos(a) * (t.radius + 0.9),
      b.z + Math.sin(a) * (t.radius + 0.9),
      UNIT_TYPES[item.type].radius,
    );
    const u = spawnUnit(world, item.type, b.team, spawn.x, spawn.z);

    // Per-type rally wins over the building default, so a base can feed workers
    // to a patch and soldiers to the front at the same time.
    const rally = b.rallyByType[item.type] ?? b.rally;
    u.target = clampPointToMapBoundary(boundary, rally.x, rally.z, u.radius);

    // A rally can carry a standing job. Applied here rather than on arrival:
    // gather and build are both "walk there, then work", and the existing job
    // state machines already handle the walking.
    if (rally.kind === 'gather' && rally.targetId !== null && u.gather) {
      // Silently ignored if the node has since been exhausted and removed —
      // the unit still walks to the point, which is the sane fallback.
      assignGather(world, [u.id], rally.targetId);
    } else if (rally.kind === 'build' && rally.targetId !== null && u.build) {
      const site = world.sites.find(st => st.id === rally.targetId);
      if (site && site.team === u.team) u.build.siteId = site.id;
    }
  }
}
