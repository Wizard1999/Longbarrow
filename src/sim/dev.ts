import type { CommandResult, EntityId, Team, UnitTypeKey, World } from '../core/types';
import { UNIT_TYPES } from '../data/units';
import { spawnSquad } from './entities';

/**
 * Developer commands (cheats), as ordinary deterministic simulation commands.
 *
 * The temptation is to let a dev console reach in and mutate `World` directly —
 * it is only a debug tool, after all. That would silently break every replay of
 * every session the console was used in: playback re-simulates from the command
 * stream, so state changed outside that stream simply never happens again, and
 * the replay diverges from the moment the cheat was used. A desync in a dev
 * session is exactly as expensive to chase as one in a real match, and far more
 * confusing because the cause is invisible.
 *
 * So cheats are commands: recorded, replayed, hashed, refusable. See D-008.
 *
 * `world.devMode` is simulation state rather than a UI flag for the same reason.
 * If dev mode lived in the browser, playback would reject the recorded cheats
 * (dev mode being off during replay) and diverge just as badly. Being sim state
 * also means it is hashed, so a competitive result can prove no cheat was ever
 * enabled — which is the actual product requirement behind "gate it".
 *
 * Nothing here names any unit, resource or race: a dev console belongs to the
 * engine, not to Greenmantle (D-029).
 */

/** Spawning a thousand units on one key press is a hang, not a cheat. */
export const DEV_SPAWN_LIMIT = 200;

/**
 * Enable or disable cheats. A command in its own right, so the replay records
 * *when* dev mode came on — without it, playback would refuse every cheat that
 * followed and the recording would be unplayable.
 */
export function cmdSetDevMode(world: World, enabled: boolean): CommandResult {
  if (world.devMode === enabled) {
    return { ok: false, reason: enabled ? 'dev mode already on' : 'dev mode already off' };
  }
  world.devMode = enabled;
  return { ok: true };
}

/** Every cheat funnels through this, so the gate cannot be forgotten on one of them. */
function requireDevMode(world: World): CommandResult | null {
  return world.devMode ? null : { ok: false, reason: 'dev mode is off' };
}

/**
 * Grant resources to a team.
 *
 * Deliberately generic in the amount and the team, and deliberately unaware of
 * *which* resource — the world holds one stock per team today and a registry-keyed
 * bag after D-031 lands, and this command should need no change either way.
 */
export function cmdDevGrantResources(world: World, team: Team, amount: number): CommandResult {
  const gate = requireDevMode(world);
  if (gate) return gate;
  if (!Number.isFinite(amount)) return { ok: false, reason: 'amount must be a number' };
  // Floor, because a fractional stock would hash differently on two machines
  // that computed it via different routes, and the whole point is determinism.
  const delta = Math.floor(amount);
  world.resources[team] = Math.max(0, world.resources[team] + delta);
  return { ok: true };
}

/** Spawn units at a point. Count is clamped rather than rejected — a dev typing
 *  a silly number wants units, not a lecture. */
export function cmdDevSpawn(
  world: World, type: UnitTypeKey, team: Team, count: number, x: number, z: number,
): CommandResult {
  const gate = requireDevMode(world);
  if (gate) return gate;
  if (!UNIT_TYPES[type]) return { ok: false, reason: 'no such unit type' };
  if (!Number.isFinite(x) || !Number.isFinite(z)) return { ok: false, reason: 'bad position' };
  const n = Math.min(DEV_SPAWN_LIMIT, Math.max(1, Math.floor(count)));
  // spawnSquad clamps every unit inside the map boundary, so a spawn off the
  // edge of the table lands on it instead of creating unreachable units.
  spawnSquad(world, type, team, x, z, n);
  return { ok: true };
}

/**
 * Kill units by id.
 *
 * Takes explicit ids rather than "the current selection" so the command is
 * self-describing in the replay log. A recorded `kill selection` would depend on
 * selection state at playback time, which is a subtle way to make replays wrong.
 */
export function cmdDevKill(world: World, ids: readonly EntityId[]): CommandResult {
  const gate = requireDevMode(world);
  if (gate) return gate;
  if (ids.length === 0) return { ok: false, reason: 'nothing to kill' };
  const doomed = new Set(ids);
  const before = world.units.length;
  // Filter preserves array order for the survivors, which the state hash depends on.
  world.units = world.units.filter(u => !doomed.has(u.id));
  const killed = before - world.units.length;
  if (killed === 0) return { ok: false, reason: 'no matching units' };
  // Dangling references would otherwise survive the units they point at.
  for (const u of world.units) {
    if (u.targetId !== null && doomed.has(u.targetId)) u.targetId = null;
  }
  for (const s of world.squads) s.memberIds = s.memberIds.filter(id => !doomed.has(id));
  return { ok: true };
}
