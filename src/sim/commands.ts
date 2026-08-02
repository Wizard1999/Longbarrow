import type {
  BehaviourKind, Building, BuildingTypeKey, CommandResult, EntityId, RallyKind, RallyPoint,
  Squad, Team, UnitTypeKey, World,
} from '../core/types';
import { BUILDING_TYPES } from '../data/buildings';
import { UNIT_TYPES } from '../data/units';
import { AUTOMATION } from '../data/tuning';
import { canTrain } from './production';
import { canPlaceBuilding, findSite, spawnSite } from './construction';
import { assignGather } from './economy';
import {
  automationSlots, createSquad, findSquad, runningSquads, stopSquadsContaining,
} from './squads';
import { clampPointToMapBoundary, mapBoundaryForSeed } from './mapBoundary';
import { pay, refund } from './resources';

// The ONLY way anything outside the sim mutates the sim.

function clearDirectOrder(u: World['units'][number]): void {
  u.patrolFrom = null;
  u.patrolTo = null;
  u.patrolHeading = 'to';
}

export function cmdMove(world: World, unitIds: EntityId[], x: number, z: number): void {
  stopSquadsContaining(world, unitIds);
  const ids = new Set(unitIds);
  const group = world.units.filter(u => ids.has(u.id));
  const boundary = mapBoundaryForSeed(world.mapSeed);
  group.forEach((u, i) => {
    // An explicit move order cancels a gather job. Standard RTS expectation,
    // and it's the player's escape hatch from "set and forget".
    if (u.gather) { u.gather.state = 'idle'; u.gather.nodeId = null; }
    // Releasing a builder PAUSES its site — progress stays on the site (§8.1).
    if (u.build) u.build.siteId = null;
    clearDirectOrder(u);
    u.orderMode = 'move';
    if (group.length === 1) { u.target = clampPointToMapBoundary(boundary, x, z, u.radius); return; }
    const angle = (i / group.length) * Math.PI * 2;
    const spread = Math.min(0.5 * group.length, 2.5);
    u.target = clampPointToMapBoundary(
      boundary, x + Math.cos(angle) * spread, z + Math.sin(angle) * spread, u.radius,
    );
  });
}



/** Move toward a destination while retaining normal autonomous combat. */
export function cmdAttackMove(world: World, unitIds: EntityId[], x: number, z: number): void {
  cmdMove(world, unitIds, x, z);
  const ids = new Set(unitIds);
  for (const u of world.units) if (ids.has(u.id) && !u.gather) u.orderMode = 'attackMove';
}

/** Repeatedly travel between the current position and a chosen destination. */
export function cmdPatrol(world: World, unitIds: EntityId[], x: number, z: number): void {
  stopSquadsContaining(world, unitIds);
  const ids = new Set(unitIds);
  const boundary = mapBoundaryForSeed(world.mapSeed);
  for (const u of world.units) {
    if (!ids.has(u.id)) continue;
    if (u.gather) { u.gather.state = 'idle'; u.gather.nodeId = null; }
    if (u.build) u.build.siteId = null;
    u.orderMode = 'patrol';
    u.patrolFrom = { x: u.x, z: u.z };
    u.patrolTo = clampPointToMapBoundary(boundary, x, z, u.radius);
    u.patrolHeading = 'to';
    u.target = { ...u.patrolTo };
  }
}

/** Cancel jobs and movement, but retain normal defensive auto-fire. */
export function cmdStop(world: World, unitIds: EntityId[]): void {
  stopSquadsContaining(world, unitIds);
  const ids = new Set(unitIds);
  for (const u of world.units) {
    if (!ids.has(u.id)) continue;
    if (u.gather) { u.gather.state = 'idle'; u.gather.nodeId = null; }
    if (u.build) u.build.siteId = null;
    u.target = null;
    u.targetId = null;
    clearDirectOrder(u);
    u.orderMode = 'idle';
  }
}

/** Hold the current ground. Units still fire at enemies already in range. */
export function cmdHoldPosition(world: World, unitIds: EntityId[]): void {
  cmdStop(world, unitIds);
  const ids = new Set(unitIds);
  for (const u of world.units) if (ids.has(u.id)) u.orderMode = 'hold';
}
/** One command, indefinite loop, no further input — §8.2 "set-and-forget".
 *  Returns the ids that actually accepted the order (workers only). */
export function cmdGather(world: World, unitIds: EntityId[], nodeId: EntityId): EntityId[] {
  const accepted = assignGather(world, unitIds, nodeId);
  if (accepted.length) stopSquadsContaining(world, accepted);
  return accepted;
}

export function cmdTrain(world: World, buildingId: EntityId, unitType: UnitTypeKey): CommandResult {
  const check = canTrain(world, buildingId, unitType);
  if (!check.ok) return check;
  const b = world.buildings.find(x => x.id === buildingId);
  if (!b) return { ok: false, reason: 'no such building' };
  pay(world.resources[b.team], UNIT_TYPES[unitType].cost);
  b.queue.push({ type: unitType, ticksLeft: UNIT_TYPES[unitType].buildTicks });
  return { ok: true };
}

export function cmdCancelTrain(world: World, buildingId: EntityId, index: number): CommandResult {
  const b = world.buildings.find(x => x.id === buildingId);
  if (!b || index < 0 || index >= b.queue.length) return { ok: false, reason: 'nothing to cancel' };
  const [item] = b.queue.splice(index, 1);
  if (!item) return { ok: false, reason: 'nothing to cancel' };
  refund(world.resources[b.team], UNIT_TYPES[item.type].cost);   // full refund
  return { ok: true };
}

export interface RallyOptions {
  /** Set the rally for one unit type only. Omit for the building default. */
  unitType?: UnitTypeKey;
  /** What arriving units should do. Defaults to walking there. */
  kind?: RallyKind;
  /** The node or site a 'gather' or 'build' rally refers to. */
  targetId?: EntityId | null;
}

/**
 * Set a rally point, optionally for a single unit type and optionally with a
 * standing job attached.
 *
 * Validates the target up front rather than at spawn time. A rally that points
 * at a node which no longer exists should be refused when the player sets it,
 * while they are looking at it — discovering it silently three workers later,
 * when they walk to an empty patch and idle, is exactly the babysitting the
 * design is trying to remove.
 */
export function cmdSetRally(
  world: World, buildingId: EntityId, x: number, z: number, opts: RallyOptions = {},
): CommandResult {
  const b = world.buildings.find(x2 => x2.id === buildingId);
  if (!b) return { ok: false, reason: 'no such building' };

  const boundary = mapBoundaryForSeed(world.mapSeed);
  const safe = clampPointToMapBoundary(boundary, x, z, 0.5);
  x = safe.x; z = safe.z;

  const kind: RallyKind = opts.kind ?? 'move';
  const targetId = opts.targetId ?? null;

  if (kind === 'gather') {
    if (targetId === null) return { ok: false, reason: 'gather rally needs a node' };
    if (!world.nodes.some(n => n.id === targetId)) return { ok: false, reason: 'no such node' };
  }
  if (kind === 'build') {
    if (targetId === null) return { ok: false, reason: 'build rally needs a site' };
    const site = world.sites.find(st => st.id === targetId);
    if (!site) return { ok: false, reason: 'no such site' };
    if (site.team !== b.team) return { ok: false, reason: 'not your site' };
  }

  if (opts.unitType) {
    if (!BUILDING_TYPES[b.type].produces.includes(opts.unitType)) {
      return { ok: false, reason: 'this building does not make that unit' };
    }
    b.rallyByType[opts.unitType] = { x, z, kind, targetId };
  } else {
    b.rally = { x, z, kind, targetId };
  }
  return { ok: true };
}

/** Drop a per-type override so that unit type falls back to the default. */
export function cmdClearRally(
  world: World, buildingId: EntityId, unitType: UnitTypeKey,
): CommandResult {
  const b = world.buildings.find(x2 => x2.id === buildingId);
  if (!b) return { ok: false, reason: 'no such building' };
  delete b.rallyByType[unitType];
  return { ok: true };
}

/** The rally a given unit type will actually use. */
export function rallyFor(b: Building, unitType: UnitTypeKey): RallyPoint {
  return b.rallyByType[unitType] ?? b.rally;
}

/** Placing does not build. It commits the resource cost and creates a site; a worker
 *  still has to walk there. Any workers passed in are assigned immediately. */
export function cmdPlaceBuilding(
  world: World, team: Team, typeKey: BuildingTypeKey, x: number, z: number,
  builderIds: EntityId[] = [],
): CommandResult {
  const check = canPlaceBuilding(world, team, typeKey, x, z);
  if (!check.ok) return check;
  pay(world.resources[team], BUILDING_TYPES[typeKey].cost);
  const site = spawnSite(world, typeKey, team, x, z);
  if (builderIds.length) cmdAssignBuilders(world, builderIds, site.id);
  return { ok: true, siteId: site.id };
}

export function cmdAssignBuilders(world: World, unitIds: EntityId[], siteId: EntityId): EntityId[] {
  const site = findSite(world, siteId);
  if (!site) return [];
  stopSquadsContaining(world, unitIds);
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
  refund(world.resources[site.team], BUILDING_TYPES[site.type].cost);   // full refund
  for (const u of world.units) {
    if (u.build && u.build.siteId === siteId) { u.build.siteId = null; u.target = null; }
  }
  return { ok: true };
}

export function cmdSetSelection(world: World, unitIds: EntityId[]): void {
  const ids = new Set(unitIds);
  for (const u of world.units) u.selected = ids.has(u.id);
}

// ---- squads and behaviour chains (1.7) ----

/** Forms (or replaces) squad `number` from the given units. Persistent, per
 *  assumption Q1 — the group survives clicking elsewhere. */
export function cmdFormSquad(
  world: World, team: Team, unitIds: EntityId[], number: number,
): CommandResult {
  if (number < 1 || number > AUTOMATION.maxSquads) return { ok: false, reason: 'no such squad slot' };
  const own = world.units.filter(u => unitIds.includes(u.id) && u.team === team).map(u => u.id);
  if (!own.length) return { ok: false, reason: 'select some units first' };
  const squad = createSquad(world, team, own, number);
  return { ok: true, siteId: squad.id };
}

export function cmdDisbandSquad(world: World, squadId: EntityId): CommandResult {
  const i = world.squads.findIndex(s => s.id === squadId);
  if (i < 0) return { ok: false, reason: 'no such squad' };
  world.squads.splice(i, 1);
  return { ok: true };
}

export function cmdAddChainStep(
  world: World, squadId: EntityId, kind: BehaviourKind, x: number, z: number,
): CommandResult {
  const squad = findSquad(world, squadId);
  if (!squad) return { ok: false, reason: 'no such squad' };
  if (squad.chain.length >= AUTOMATION.maxChainSteps) {
    return { ok: false, reason: `chains are capped at ${AUTOMATION.maxChainSteps} steps` };
  }
  const safe = clampPointToMapBoundary(mapBoundaryForSeed(world.mapSeed), x, z, 0.5);
  squad.chain.push({ kind, x: safe.x, z: safe.z });
  return { ok: true };
}

export function cmdRemoveChainStep(
  world: World, squadId: EntityId, index: number,
): CommandResult {
  const squad = findSquad(world, squadId);
  if (!squad || index < 0 || index >= squad.chain.length) {
    return { ok: false, reason: 'nothing to remove' };
  }
  squad.chain.splice(index, 1);
  resetChain(squad);
  if (!squad.chain.length) squad.running = false;
  return { ok: true };
}

export function cmdClearChain(world: World, squadId: EntityId): CommandResult {
  const squad = findSquad(world, squadId);
  if (!squad) return { ok: false, reason: 'no such squad' };
  squad.chain = [];
  squad.running = false;
  resetChain(squad);
  return { ok: true };
}

export function cmdSetChainLoop(
  world: World, squadId: EntityId, loop: boolean,
): CommandResult {
  const squad = findSquad(world, squadId);
  if (!squad) return { ok: false, reason: 'no such squad' };
  squad.loop = loop;
  return { ok: true };
}

/**
 * Starts a chain. This is where assumption A4 actually bites: Command gates
 * how many squads may run a chain at once (§8.3), so starting one past the cap
 * is refused rather than silently allowed.
 */
export function cmdRunChain(world: World, squadId: EntityId): CommandResult {
  const squad = findSquad(world, squadId);
  if (!squad) return { ok: false, reason: 'no such squad' };
  if (!squad.chain.length) return { ok: false, reason: 'this squad has no chain yet' };
  if (squad.running) return { ok: true };
  const slots = automationSlots(world, squad.team);
  if (runningSquads(world, squad.team) >= slots) {
    return { ok: false, reason: `not enough Command — ${slots} chain${slots === 1 ? '' : 's'} at a time` };
  }
  resetChain(squad);
  squad.running = true;
  return { ok: true };
}

export function cmdStopChain(world: World, squadId: EntityId): CommandResult {
  const squad = findSquad(world, squadId);
  if (!squad) return { ok: false, reason: 'no such squad' };
  squad.running = false;
  return { ok: true };
}

function resetChain(squad: Squad): void {
  squad.index = 0;
  squad.dispatched = false;
  squad.stepTicks = 0;
  squad.patrolFrom = null;
  squad.patrolTo = null;
  squad.patrolHeading = 'to';
}
