import type {
  BehaviourKind, BuildingTypeKey, EntityId, Team, UnitTypeKey, World,
} from '../core/types';
import { TICK_HZ } from '../core/loop';
import { createWorld, simStep } from './world';
import { MAP_VERSION, buildTestMap } from './map';
import {
  cmdAddChainStep, cmdAssignBuilders, cmdCancelSite, cmdCancelTrain, cmdClearChain,
  cmdDisbandSquad, cmdFormSquad, cmdGather, cmdMove, cmdPlaceBuilding,
  cmdRemoveChainStep, cmdRunChain, cmdSetChainLoop, cmdSetRally, cmdSetSelection,
  cmdStopChain, cmdTrain,
} from './commands';

/**
 * Match recording and playback.
 *
 * A replay is the seed, the starting hour and the stream of commands — never a
 * stream of world states. Command streams are orders of magnitude smaller, and
 * re-simulating is a continuous proof that determinism still holds: if a replay
 * diverges, that is a real determinism bug worth finding.
 *
 * See docs/DECISIONS.md D-008 and D-012.
 */

/** Bump when the meaning of a command or of a sim rule changes. */
export const REPLAY_VERSION = 2;

/**
 * Every player action, as plain serializable data.
 *
 * The discriminated union is the point: it forces commands to stay
 * serializable. A command carrying a function, a Three.js object or an entity
 * reference could not appear here, and that is exactly the constraint replays,
 * rollback and networking all need.
 */
export type Command =
  | { t: 'move'; units: EntityId[]; x: number; z: number }
  | { t: 'gather'; units: EntityId[]; node: EntityId }
  | { t: 'train'; building: EntityId; unit: UnitTypeKey }
  | { t: 'cancelTrain'; building: EntityId; index: number }
  | { t: 'rally'; building: EntityId; x: number; z: number }
  | { t: 'place'; team: Team; type: BuildingTypeKey; x: number; z: number; builders: EntityId[] }
  | { t: 'assignBuilders'; units: EntityId[]; site: EntityId }
  | { t: 'cancelSite'; site: EntityId }
  | { t: 'select'; units: EntityId[] }
  | { t: 'formSquad'; team: Team; units: EntityId[]; number: number }
  | { t: 'disbandSquad'; squad: EntityId }
  | { t: 'addChainStep'; squad: EntityId; kind: BehaviourKind; x: number; z: number }
  | { t: 'removeChainStep'; squad: EntityId; index: number }
  | { t: 'clearChain'; squad: EntityId }
  | { t: 'setChainLoop'; squad: EntityId; loop: boolean }
  | { t: 'runChain'; squad: EntityId }
  | { t: 'stopChain'; squad: EntityId };

export interface TimedCommand {
  tick: number;
  cmd: Command;
}

export interface Replay {
  version: number;
  seed: number;
  /** Hour of the in-game day the match began at. Omitting this would make a
   *  replay silently wrong rather than obviously broken — the sim would run
   *  correctly but at the wrong time of day. */
  startHour: number;
  /** Recorded because tick rate is baked into every duration constant. A replay
   *  from a different tick rate must be rejected, not played. */
  tickRate: number;
  /** The map, recorded separately from the match seed so a replay pins the
   *  terrain it was actually played on. */
  mapSeed: number;
  /** The generator that built that map. A seed alone cannot reproduce a map if
   *  the generator changed underneath it — without this, altering map
   *  generation would silently replay old matches on different terrain. */
  mapVersion: number;
  commands: TimedCommand[];
}

/**
 * Apply one command to the world.
 *
 * The single funnel every player action passes through, so recording is one
 * call rather than 25 scattered ones. Results are intentionally discarded — a
 * rejected command is still part of the honest record of what the player tried.
 */
export function dispatch(world: World, c: Command): void {
  switch (c.t) {
    case 'move': cmdMove(world, c.units, c.x, c.z); break;
    case 'gather': cmdGather(world, c.units, c.node); break;
    case 'train': cmdTrain(world, c.building, c.unit); break;
    case 'cancelTrain': cmdCancelTrain(world, c.building, c.index); break;
    case 'rally': cmdSetRally(world, c.building, c.x, c.z); break;
    case 'place': cmdPlaceBuilding(world, c.team, c.type, c.x, c.z, c.builders); break;
    case 'assignBuilders': cmdAssignBuilders(world, c.units, c.site); break;
    case 'cancelSite': cmdCancelSite(world, c.site); break;
    case 'select': cmdSetSelection(world, c.units); break;
    case 'formSquad': cmdFormSquad(world, c.team, c.units, c.number); break;
    case 'disbandSquad': cmdDisbandSquad(world, c.squad); break;
    case 'addChainStep': cmdAddChainStep(world, c.squad, c.kind, c.x, c.z); break;
    case 'removeChainStep': cmdRemoveChainStep(world, c.squad, c.index); break;
    case 'clearChain': cmdClearChain(world, c.squad); break;
    case 'setChainLoop': cmdSetChainLoop(world, c.squad, c.loop); break;
    case 'runChain': cmdRunChain(world, c.squad); break;
    case 'stopChain': cmdStopChain(world, c.squad); break;
  }
}

/**
 * Records a match while it is played.
 *
 * Commands are stamped with the tick they were issued on. In live play a
 * command is issued during a render frame and takes effect before the next
 * `simStep`, so playback applies every command stamped `t` *before* stepping
 * from `t`. Getting that ordering wrong produces a replay that is subtly one
 * tick out and diverges slowly — the worst kind of bug to chase.
 */
export class Recorder {
  private readonly log: TimedCommand[] = [];

  constructor(
    private readonly seed: number,
    private readonly startHour: number,
    private readonly mapSeed: number = seed,
  ) {}

  /** Record and apply in one step, so the two can never drift apart. */
  apply(world: World, cmd: Command): void {
    this.log.push({ tick: world.tick, cmd });
    dispatch(world, cmd);
  }

  get length(): number {
    return this.log.length;
  }

  finish(): Replay {
    return {
      version: REPLAY_VERSION,
      seed: this.seed,
      startHour: this.startHour,
      tickRate: TICK_HZ,
      mapSeed: this.mapSeed,
      mapVersion: MAP_VERSION,
      commands: [...this.log],
    };
  }
}

export interface ReplayCheck {
  ok: boolean;
  reason?: string;
}

/**
 * Reject replays that cannot be played correctly.
 *
 * Deliberately refuses rather than attempting a best effort: a replay played at
 * the wrong tick rate runs every duration in the game at the wrong speed and
 * looks plausible while being wrong throughout.
 */
export function checkReplay(r: Replay): ReplayCheck {
  if (r.version !== REPLAY_VERSION) {
    return { ok: false, reason: `replay version ${r.version}, expected ${REPLAY_VERSION}` };
  }
  if (r.tickRate !== TICK_HZ) {
    return { ok: false, reason: `replay recorded at ${r.tickRate}Hz, this build runs at ${TICK_HZ}Hz` };
  }
  if (r.mapVersion !== MAP_VERSION) {
    return {
      ok: false,
      reason: `replay built on map generator v${r.mapVersion}, this build has v${MAP_VERSION}`,
    };
  }
  return { ok: true };
}

/**
 * Re-simulate a replay up to `untilTick` and return the resulting world.
 *
 * Plays from tick 0 rather than seeking. Keyframe seeking is a later
 * optimisation and belongs with `snapshot()`; this is the correctness baseline
 * that seeking will be checked against.
 */
export function playback(r: Replay, untilTick: number): World {
  const check = checkReplay(r);
  if (!check.ok) throw new Error(`cannot play replay: ${check.reason}`);

  const world = buildTestMap(createWorld(r.seed, r.startHour, r.mapSeed));

  // Bucket by tick so playback is O(commands) rather than O(ticks x commands).
  const byTick = new Map<number, Command[]>();
  for (const { tick, cmd } of r.commands) {
    const list = byTick.get(tick);
    if (list) list.push(cmd);
    else byTick.set(tick, [cmd]);
  }

  for (let t = 0; t < untilTick; t++) {
    const due = byTick.get(t);
    if (due) for (const c of due) dispatch(world, c);
    simStep(world);
  }
  return world;
}

export function serializeReplay(r: Replay): string {
  return JSON.stringify(r);
}

export function parseReplay(text: string): Replay {
  return JSON.parse(text) as Replay;
}
