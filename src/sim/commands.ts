import type {
  BuildingTypeKey, CommandResult, EntityId, Team, UnitTypeKey, World,
} from '../core/types';
import { BUILDING_TYPES } from '../data/buildings';
import { UNIT_TYPES } from '../data/units';
import { canTrain } from './production';
import { canPlaceBuilding, findSite, spawnSite } from './construction';
import { findNode } from './economy';

// The ONLY way anything outside the sim mutates the sim.

export function cmdMove(world: World, unitIds: EntityId[], x: number, z: number): void {
  const ids = new Set(unitIds);
  const group = world.units.filter(u => ids.has(u.id));
  group.forEach((u, i) => {
    // An explicit move order cancels a gather job. Standard RTS expectation,
    // and it's the player's escape hatch from "set and forget".
    if (u.gather) { u.gather.state = 'idle'; u.gather.nodeId = null; }
    // Releasing a builder PAUSES its site — progress stays on the site (§8.1).
    if (u.build) u.build.siteId = null;
    if (group.length === 1) { u.target = { x, z }; return; }
    const angle = (i / group.length) * Math.PI * 2;
    const spread = Math.min(0.5 * group.length, 2.5);
    u.target = { x: x + Math.cos(angle) * spread, z: z + Math.sin(angle) * spread };
  });
}

/** One command, indefinite loop, no further input — §8.2 "set-and-forget".
 *  Returns the ids that actually accepted the order (workers only). */
export function cmdGather(world: World, unitIds: EntityId[], nodeId: EntityId): EntityId[] {
  const ids = new Set(unitIds);
  const node = findNode(world, nodeId);
  if (!node) return [];
  const accepted: EntityId[] = [];
  for (const u of world.units) {
    if (!ids.has(u.id) || !u.gather) continue;
    if (u.build) u.build.siteId = null;      // pauses whatever it was building
    u.gather.nodeId = nodeId;
    u.gather.state = u.gather.carrying > 0 ? 'toBase' : 'toNode';
    u.target = null;
    accepted.push(u.id);
  }
  return accepted;
}

export function cmdTrain(world: World, buildingId: EntityId, unitType: UnitTypeKey): CommandResult {
  const check = canTrain(world, buildingId, unitType);
  if (!check.ok) return check;
  const b = world.buildings.find(x => x.id === buildingId);
  if (!b) return { ok: false, reason: 'no such building' };
  world.resources[b.team] -= UNIT_TYPES[unitType].cost;
  b.queue.push({ type: unitType, ticksLeft: UNIT_TYPES[unitType].buildTicks });
  return { ok: true };
}

export function cmdCancelTrain(world: World, buildingId: EntityId, index: number): CommandResult {
  const b = world.buildings.find(x => x.id === buildingId);
  if (!b || index < 0 || index >= b.queue.length) return { ok: false, reason: 'nothing to cancel' };
  const [item] = b.queue.splice(index, 1);
  if (!item) return { ok: false, reason: 'nothing to cancel' };
  world.resources[b.team] += UNIT_TYPES[item.type].cost;   // full refund
  return { ok: true };
}

export function cmdSetRally(world: World, buildingId: EntityId, x: number, z: number): CommandResult {
  const b = world.buildings.find(x2 => x2.id === buildingId);
  if (!b) return { ok: false, reason: 'no such building' };
  b.rally = { x, z };
  return { ok: true };
}

/** Placing does not build. It commits the essence and creates a site; a worker
 *  still has to walk there. Any workers passed in are assigned immediately. */
export function cmdPlaceBuilding(
  world: World, team: Team, typeKey: BuildingTypeKey, x: number, z: number,
  builderIds: EntityId[] = [],
): CommandResult {
  const check = canPlaceBuilding(world, team, typeKey, x, z);
  if (!check.ok) return check;
  world.resources[team] -= BUILDING_TYPES[typeKey].cost;
  const site = spawnSite(world, typeKey, team, x, z);
  if (builderIds.length) cmdAssignBuilders(world, builderIds, site.id);
  return { ok: true, siteId: site.id };
}

export function cmdAssignBuilders(world: World, unitIds: EntityId[], siteId: EntityId): EntityId[] {
  const site = findSite(world, siteId);
  if (!site) return [];
  const ids = new Set(unitIds);
  const accepted: EntityId[] = [];
  for (const u of world.units) {
    if (!ids.has(u.id) || !u.build || u.team !== site.team) continue;
    if (u.gather) { u.gather.state = 'idle'; u.gather.nodeId = null; }  // one job at a time
    u.build.siteId = siteId;
    u.target = null;
    accepted.push(u.id);
  }
  return accepted;
}

export function cmdCancelSite(world: World, siteId: EntityId): CommandResult {
  const i = world.sites.findIndex(s => s.id === siteId);
  if (i < 0) return { ok: false, reason: 'no such site' };
  const [site] = world.sites.splice(i, 1);
  if (!site) return { ok: false, reason: 'no such site' };
  world.resources[site.team] += BUILDING_TYPES[site.type].cost;   // full refund
  for (const u of world.units) {
    if (u.build && u.build.siteId === siteId) { u.build.siteId = null; u.target = null; }
  }
  return { ok: true };
}

export function cmdSetSelection(world: World, unitIds: EntityId[]): void {
  const ids = new Set(unitIds);
  for (const u of world.units) u.selected = ids.has(u.id);
}
