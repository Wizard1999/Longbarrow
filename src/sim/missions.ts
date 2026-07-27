import type {
  CommandResult, EntityId, Mission, MissionObjective, MissionPriority, Team, Vec2, World,
} from '../core/types';

/**
 * Missions (D-007). The player's unit of intent, sitting above squads.
 *
 * A mission is deliberately inert on its own — it records what the player
 * intends (objective, priority, fallback) and which squads are carrying it
 * out, but it does not yet reach into squad behaviour. That wiring belongs to
 * the mission-panel UI work this unblocks, once there is a UI to decide what
 * "assigned to an assault mission" should actually make a squad do. Landing
 * the data model and commands first means that UI is built against a real,
 * replayable primitive instead of inventing its own ad-hoc state.
 */

export function findMission(world: World, missionId: EntityId): Mission | undefined {
  return world.missions.find(m => m.id === missionId);
}

export function cmdCreateMission(
  world: World, team: Team, objective: MissionObjective,
  opts: { priority?: MissionPriority; squadIds?: EntityId[]; fallback?: Vec2 | null } = {},
): CommandResult {
  const squadIds = (opts.squadIds ?? []).filter(id =>
    world.squads.some(sq => sq.id === id && sq.team === team));

  const mission: Mission = {
    id: world.nextId++,
    team,
    objective,
    priority: opts.priority ?? 'normal',
    status: 'active',
    squadIds,
    fallback: opts.fallback ?? null,
    createdTick: world.tick,
  };
  world.missions.push(mission);
  return { ok: true, siteId: mission.id };
}

/** A squad serves at most one mission at a time — it is dropped from any
 *  other mission it was carrying out, the same way forming a new squad
 *  supersedes a unit's old one. */
export function cmdAssignSquadToMission(
  world: World, missionId: EntityId, squadId: EntityId,
): CommandResult {
  const mission = findMission(world, missionId);
  if (!mission) return { ok: false, reason: 'no such mission' };
  if (mission.status !== 'active') return { ok: false, reason: 'mission is not active' };
  const squad = world.squads.find(sq => sq.id === squadId);
  if (!squad) return { ok: false, reason: 'no such squad' };
  if (squad.team !== mission.team) return { ok: false, reason: 'not your squad' };

  for (const m of world.missions) {
    if (m.id !== mission.id) m.squadIds = m.squadIds.filter(id => id !== squadId);
  }
  if (!mission.squadIds.includes(squadId)) mission.squadIds.push(squadId);
  return { ok: true };
}

export function cmdRemoveSquadFromMission(
  world: World, missionId: EntityId, squadId: EntityId,
): CommandResult {
  const mission = findMission(world, missionId);
  if (!mission) return { ok: false, reason: 'no such mission' };
  mission.squadIds = mission.squadIds.filter(id => id !== squadId);
  return { ok: true };
}

export function cmdSetMissionPriority(
  world: World, missionId: EntityId, priority: MissionPriority,
): CommandResult {
  const mission = findMission(world, missionId);
  if (!mission) return { ok: false, reason: 'no such mission' };
  mission.priority = priority;
  return { ok: true };
}

export function cmdSetMissionFallback(
  world: World, missionId: EntityId, fallback: Vec2 | null,
): CommandResult {
  const mission = findMission(world, missionId);
  if (!mission) return { ok: false, reason: 'no such mission' };
  mission.fallback = fallback;
  return { ok: true };
}

/** Cancelling is explicit and terminal, distinct from completion/failure —
 *  those are outcome judgements a future objective-tracking system makes;
 *  cancellation is simply the player calling it off. */
export function cmdCancelMission(world: World, missionId: EntityId): CommandResult {
  const mission = findMission(world, missionId);
  if (!mission) return { ok: false, reason: 'no such mission' };
  if (mission.status !== 'active') return { ok: false, reason: 'mission is already over' };
  mission.status = 'cancelled';
  return { ok: true };
}

/**
 * Per-tick upkeep: drop squad ids that no longer exist.
 *
 * Squads are pruned by `combat.stepReaper` when their last member dies, which
 * would otherwise leave a mission holding a dangling id — invisible until
 * something tries to look the squad up and finds nothing, or a hash disagrees
 * because one peer pruned and the other has not gotten there yet. Run this
 * every tick, not lazily, so it is never a source of order-dependent drift.
 */
export function stepMissions(world: World): void {
  if (!world.missions.length) return;
  const liveSquads = new Set(world.squads.map(sq => sq.id));
  for (const m of world.missions) {
    if (m.squadIds.length) m.squadIds = m.squadIds.filter(id => liveSquads.has(id));
  }
}
