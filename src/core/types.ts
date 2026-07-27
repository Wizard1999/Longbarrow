// Shared ids, vectors and enums. Deliberately dependency-free so that both the
// sim and the presentation layers can name the same things without the sim
// ever reaching outward (06 §3).

export type EntityId = number;

export type Team = 'player' | 'rival';
export const TEAMS: readonly Team[] = ['player', 'rival'];

export type UnitTypeKey = 'legionnaire' | 'marksman' | 'worker';
export type BuildingTypeKey = 'standard' | 'outpost';

export interface Vec2 {
  x: number;
  z: number;
}

/** Four-state worker job machine. Once it leaves 'idle' it never returns
 *  without a new order — that is the whole of §8.2 set-and-forget. */
export type GatherState = 'idle' | 'toNode' | 'gathering' | 'toBase' | 'depositing';

export interface GatherJob {
  state: GatherState;
  nodeId: EntityId | null;
  carrying: number;
  timer: number;
}

/** Progress lives on the site, not here — that is what makes reassignment
 *  pause construction instead of cancelling it (§8.1). */
export interface BuildJob {
  siteId: EntityId | null;
}

export interface Unit {
  id: EntityId;
  type: UnitTypeKey;
  team: Team;
  x: number;
  z: number;
  prevX: number;
  prevZ: number;
  facing: number;
  prevFacing: number;
  speed: number;
  radius: number;
  target: Vec2 | null;
  selected: boolean;
  gather: GatherJob | null;
  build: BuildJob | null;
  hp: number;
  /** Consecutive ticks spent not moving. Drives the Marksman's settle ramp —
   *  stopping doesn't restore accuracy instantly, which is what stops kiting
   *  from being free (§8.7). */
  stillTicks: number;
}

export interface QueueItem {
  type: UnitTypeKey;
  ticksLeft: number;
}

export interface Building {
  id: EntityId;
  type: BuildingTypeKey;
  team: Team;
  x: number;
  z: number;
  radius: number;
  queue: QueueItem[];
  rally: Vec2;
}

export interface ResourceNode {
  id: EntityId;
  x: number;
  z: number;
  amount: number;
  maxAmount: number;
}

export interface Site {
  id: EntityId;
  type: BuildingTypeKey;
  team: Team;
  x: number;
  z: number;
  radius: number;
  progress: number;
  required: number;
}

export interface Scenery {
  kind: 'rock' | 'tree';
  x: number;
  z: number;
  scale: number;
  spin: number;
}

/**
 * The four Phase 1 behaviours (§4 / blueprint 1.7). Two complete and hand over
 * to the next step; two are ongoing and hold the squad until it is redirected.
 */
export type BehaviourKind = 'move' | 'attackmove' | 'gather' | 'patrol';

export interface ChainStep {
  kind: BehaviourKind;
  x: number;
  z: number;
}

/**
 * A squad is a PERSISTENT group, not a transient selection (assumption Q1). It
 * has to persist for §8.3 to mean anything — you cannot cap "how many squads
 * are running a chain" if a squad stops existing the moment you click
 * elsewhere.
 */
export interface Squad {
  id: EntityId;
  team: Team;
  number: number;
  memberIds: EntityId[];
  chain: ChainStep[];
  index: number;
  running: boolean;
  /** Chains loop by default (Q3), with this per-chain toggle. */
  loop: boolean;
  dispatched: boolean;
  stepTicks: number;
  patrolFrom: Vec2 | null;
  patrolTo: Vec2 | null;
  patrolHeading: 'to' | 'from';
}

export interface World {
  seed: number;
  /** Plain-number PRNG state, not a closure — snapshot/restore and hashing
   *  depend on every byte of sim state being reachable data (D-010). */
  rngState: number;
  /** Seed for map generation, deliberately separate from the match seed. Same
   *  mapSeed always yields the same map; browsing maps never touches the match
   *  generator. */
  mapSeed: number;
  /** Generator version the map was built with — a seed alone cannot reproduce
   *  a map if the generator has changed underneath it. */
  mapVersion: number;
  tick: number;
  /** Tick offset into the day/night cycle at match start, so a game can
   *  begin at any hour and still replay identically. */
  dayStartTick: number;
  nextId: EntityId;
  units: Unit[];
  buildings: Building[];
  nodes: ResourceNode[];
  sites: Site[];
  scenery: Scenery[];
  squads: Squad[];
  resources: Record<Team, number>;
}

export interface CommandResult {
  ok: boolean;
  reason?: string;
  siteId?: EntityId;
}
