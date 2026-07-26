import type { CommandResult, EntityId, UnitTypeKey, World } from '../core/types';
import { GOLDEN_ANGLE } from '../core/loop';
import { BUILDING_TYPES } from '../data/buildings';
import { UNIT_TYPES } from '../data/units';
import { MAX_QUEUE } from '../data/tuning';
import { supplyFree } from './supply';
import { spawnUnit } from './entities';

export function canTrain(world: World, buildingId: EntityId, unitType: UnitTypeKey): CommandResult {
  const b = world.buildings.find(x => x.id === buildingId);
  if (!b) return { ok: false, reason: 'no such building' };
  const bt = BUILDING_TYPES[b.type];
  if (!bt.produces.includes(unitType)) return { ok: false, reason: 'cannot build that here' };
  if (b.queue.length >= MAX_QUEUE) return { ok: false, reason: 'queue full' };
  const ut = UNIT_TYPES[unitType];
  if (world.resources[b.team] < ut.cost) return { ok: false, reason: 'not enough essence' };
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
    const u = spawnUnit(world, item.type, b.team,
      b.x + Math.cos(a) * (t.radius + 0.9),
      b.z + Math.sin(a) * (t.radius + 0.9));
    u.target = { x: b.rally.x, z: b.rally.z };
  }
}
