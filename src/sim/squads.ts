import type {
  BehaviourKind, EntityId, Squad, Team, Unit, Vec2, World,
} from '../core/types';
import { AUTOMATION } from '../data/tuning';
import { assignGather, nearestNodeWithResources } from './economy';
import { supplyCap } from './supply';

/**
 * A chain is a short list of steps the squad walks through on its own. Two
 * behaviours complete and hand over to the next step; two are ongoing and hold
 * the squad there until it is redirected.
 */
export const BEHAVIOURS: Record<BehaviourKind, { label: string; ongoing: boolean }> = {
  move: { label: 'Move', ongoing: false },
  // Completes on arrival; it will engage en route once combat lands at 1.9.
  attackmove: { label: 'Attack-move', ongoing: false },
  gather: { label: 'Gather', ongoing: true },
  patrol: { label: 'Patrol', ongoing: true },
};

/** Assumption A4: Command gates both the population cap and the number of
 *  squads that can run a chain simultaneously (§8.3). */
export function automationSlots(world: World, team: Team): number {
  return Math.floor(supplyCap(world, team) / AUTOMATION.commandPerSlot);
}

export function runningSquads(world: World, team: Team): number {
  return world.squads.filter(s => s.team === team && s.running).length;
}

export function findSquad(world: World, id: EntityId | null): Squad | null {
  return world.squads.find(s => s.id === id) ?? null;
}

export function squadByNumber(world: World, team: Team, n: number): Squad | null {
  return world.squads.find(s => s.team === team && s.number === n) ?? null;
}

export function squadMembers(world: World, squad: Squad): Unit[] {
  return world.units.filter(u => squad.memberIds.includes(u.id));
}

export function squadOf(world: World, unitId: EntityId): Squad | null {
  return world.squads.find(s => s.memberIds.includes(unitId)) ?? null;
}

export function createSquad(
  world: World, team: Team, unitIds: EntityId[], number: number,
): Squad {
  // a unit belongs to at most one squad
  for (const sq of world.squads) {
    sq.memberIds = sq.memberIds.filter(id => !unitIds.includes(id));
  }
  const existing = world.squads.findIndex(s => s.team === team && s.number === number);
  if (existing >= 0) world.squads.splice(existing, 1);
  const squad: Squad = {
    id: world.nextId++,
    team, number,
    memberIds: [...unitIds],
    chain: [],
    index: 0,
    running: false,
    loop: true,
    dispatched: false,
    stepTicks: 0,
    patrolFrom: null,
    patrolTo: null,
    patrolHeading: 'to',
  };
  world.squads.push(squad);
  pruneSquads(world);
  return squad;
}

/** Drop dead members; disband squads that have none left. */
export function pruneSquads(world: World): void {
  const alive = new Set(world.units.map(u => u.id));
  for (let i = world.squads.length - 1; i >= 0; i--) {
    const sq = world.squads[i];
    if (!sq) continue;
    sq.memberIds = sq.memberIds.filter(id => alive.has(id));
    if (!sq.memberIds.length) world.squads.splice(i, 1);
  }
}

export function squadCentre(world: World, squad: Squad): Vec2 | null {
  const ms = squadMembers(world, squad);
  if (!ms.length) return null;
  let x = 0;
  let z = 0;
  for (const u of ms) { x += u.x; z += u.z; }
  return { x: x / ms.length, z: z / ms.length };
}

/** Send the squad to a point in formation. Same spread rule as a manual order,
 *  so an automated move looks exactly like a hand-issued one. */
function dispatchTo(world: World, squad: Squad, x: number, z: number): void {
  const ms = squadMembers(world, squad);
  ms.forEach((u, i) => {
    if (u.gather) { u.gather.state = 'idle'; u.gather.nodeId = null; }
    if (u.build) u.build.siteId = null;
    if (ms.length === 1) { u.target = { x, z }; return; }
    const a = (i / ms.length) * Math.PI * 2;
    const spread = Math.min(0.5 * ms.length, 3.0);
    u.target = { x: x + Math.cos(a) * spread, z: z + Math.sin(a) * spread };
  });
}

function squadArrived(world: World, squad: Squad, x: number, z: number): boolean {
  const ms = squadMembers(world, squad);
  if (!ms.length) return true;
  return ms.every(u => Math.hypot(u.x - x, u.z - z) <= AUTOMATION.arriveRadius + ms.length * 0.12);
}

function advanceStep(squad: Squad): void {
  squad.index++;
  squad.dispatched = false;
  squad.stepTicks = 0;
  squad.patrolFrom = null;
  squad.patrolTo = null;
  if (squad.index >= squad.chain.length) {
    if (squad.loop && squad.chain.length) squad.index = 0;
    else { squad.index = Math.max(0, squad.chain.length - 1); squad.running = false; }
  }
}

export function stepSquads(world: World): void {
  pruneSquads(world);
  for (const squad of world.squads) {
    if (!squad.running || !squad.chain.length) continue;
    const ms = squadMembers(world, squad);
    if (!ms.length) continue;
    const step = squad.chain[squad.index];
    if (!step) { squad.running = false; continue; }
    squad.stepTicks++;

    // A step that cannot finish (unreachable point, blocked) must not wedge the
    // whole chain forever — give up and move on.
    if (squad.stepTicks > AUTOMATION.stepTimeout && !BEHAVIOURS[step.kind].ongoing) {
      advanceStep(squad);
      continue;
    }

    if (step.kind === 'move' || step.kind === 'attackmove') {
      if (!squad.dispatched) { dispatchTo(world, squad, step.x, step.z); squad.dispatched = true; }
      if (squadArrived(world, squad, step.x, step.z)) advanceStep(squad);
      continue;
    }

    if (step.kind === 'gather') {
      // ongoing: put every worker in the squad on the nearest live node
      if (!squad.dispatched) {
        const node = nearestNodeWithResources(world, step.x, step.z);
        if (node) {
          const ids = ms.filter(u => u.gather).map(u => u.id);
          if (ids.length) assignGather(world, ids, node.id);
          // members that cannot gather just stand guard at the point
          for (const u of ms) {
            if (!u.gather) u.target = { x: step.x, z: step.z };
          }
        }
        squad.dispatched = true;
      }
      // if the node ran out and no worker is still employed, fall through
      const stillWorking = ms.some(u => u.gather && u.gather.state !== 'idle');
      if (!stillWorking && !nearestNodeWithResources(world, step.x, step.z)) advanceStep(squad);
      continue;
    }

    if (step.kind === 'patrol') {
      // ongoing: pace between the previous step's point and this one
      if (!squad.patrolFrom || !squad.patrolTo) {
        const prev = squad.chain[squad.index - 1];
        const c = squadCentre(world, squad);
        squad.patrolFrom = prev ? { x: prev.x, z: prev.z } : { x: c?.x ?? step.x, z: c?.z ?? step.z };
        squad.patrolTo = { x: step.x, z: step.z };
        squad.patrolHeading = 'to';
        dispatchTo(world, squad, squad.patrolTo.x, squad.patrolTo.z);
      }
      const goal = squad.patrolHeading === 'to' ? squad.patrolTo : squad.patrolFrom;
      if (squadArrived(world, squad, goal.x, goal.z)) {
        squad.patrolHeading = squad.patrolHeading === 'to' ? 'from' : 'to';
        const next = squad.patrolHeading === 'to' ? squad.patrolTo : squad.patrolFrom;
        dispatchTo(world, squad, next.x, next.z);
      }
    }
  }
}

/** Stops any running chain that owns one of these units. This is what "runs
 *  unattended until redirected" (§4) means mechanically: a manual order to a
 *  squad member takes the squad off automation rather than fighting it. */
export function stopSquadsContaining(world: World, unitIds: EntityId[]): void {
  for (const sq of world.squads) {
    if (!sq.running) continue;
    if (unitIds.some(id => sq.memberIds.includes(id))) sq.running = false;
  }
}
