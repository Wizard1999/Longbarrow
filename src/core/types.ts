// Shared ids, vectors and enums. Deliberately dependency-free so that both the
// sim and the presentation layers can name the same things without the sim
// ever reaching outward (06 §3).

export type EntityId = number;

export type Team = 'player' | 'rival';
export const TEAMS: readonly Team[] = ['player', 'rival'];

export type UnitTypeKey = 'legionnaire' | 'worker';
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

export interface World {
  seed: number;
  rng: () => number;
  tick: number;
  nextId: EntityId;
  units: Unit[];
  buildings: Building[];
  nodes: ResourceNode[];
  sites: Site[];
  scenery: Scenery[];
  resources: Record<Team, number>;
}

export interface CommandResult {
  ok: boolean;
  reason?: string;
  siteId?: EntityId;
}
