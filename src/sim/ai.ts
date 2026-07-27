import type { AiState, EntityId, Team, World } from '../core/types';
import { AI } from '../data/tuning';
import { UNIT_TYPES } from '../data/units';
import { cmdGather, cmdMove, cmdPlaceBuilding, cmdTrain } from './commands';
import { findTarget } from './combat';
import { supplyCap, supplyFree } from './supply';
import { availableTech, cmdResearch } from './tech';
import { TECH } from '../data/tech';
import { SUPPLY_MAX } from '../data/tuning';
import { circleInMapBoundary, mapBoundaryForSeed } from './mapBoundary';

/**
 * A simple AI opponent (step 1.11).
 *
 * Deliberately "simple, not necessarily smart" per the Phase 1 scope. Its value
 * right now is not being a worthy opponent — it is being *something to play
 * against*, and being a continuous integration test of the systems it drives.
 * If the AI stops gathering, gathering is broken; if it stops attacking, target
 * acquisition is broken. That is worth more in Phase 1 than cleverness.
 *
 * Two rules it must keep obeying as it grows (D-009):
 *
 * 1. **It issues the same commands a human does**, through `sim/commands.ts`.
 *    No privileged mutation of world state, no reaching past the command layer.
 *    That keeps it honest, keeps it replayable, and means anything it can do a
 *    player could also do.
 * 2. **It reads only what it could legitimately see.** There is no fog of war
 *    yet, so this is currently on trust — when fog arrives, this is the file
 *    that has to start respecting it rather than a thing to bolt on afterwards.
 *
 * It runs on a slow cadence rather than every tick: it has no reflexes to
 * exercise, and thinking 30 times a second would cost real time at 100+ units
 * for no behavioural gain.
 */

export function createAi(team: Team): AiState {
  return { team, nextThinkTick: 0, attacking: false };
}

/** Give a world an AI opponent. Opt-in, so a bare world stays inert. */
export function enableAi(world: World, team: Team = 'rival'): World {
  world.ai = createAi(team);
  return world;
}

function myUnits(world: World, team: Team) {
  return world.units.filter(u => u.team === team && u.hp > 0);
}

/**
 * One decision pass. Cheap, greedy, and ordered by priority: keep the economy
 * running, then build an army, then commit it.
 */
export function stepAi(world: World, ai: AiState): void {
  if (world.winner) return;
  if (world.tick < ai.nextThinkTick) return;
  ai.nextThinkTick = world.tick + AI.thinkInterval;

  const units = myUnits(world, ai.team);
  const workers = units.filter(u => u.gather);
  const fighters = units.filter(u => !u.gather);
  const base = world.buildings.find(b => b.team === ai.team);
  if (!base) return;

  // 1. Idle workers go and gather. This is the whole economy: set-and-forget
  //    (§8.2) means an idle worker is always a mistake, never a decision.
  //    Excluding anyone already assigned to a build site: cmdAssignBuilders
  //    parks a builder's gather job in 'idle', so without this check the AI
  //    would re-task its own builder back to mining on the very next think and
  //    no construction would ever finish.
  const idle = workers.filter(u =>
    (!u.gather || u.gather.state === 'idle') && !u.build?.siteId);
  if (idle.length && world.nodes.length) {
    let nearest = world.nodes[0]!;
    let best = Infinity;
    for (const n of world.nodes) {
      if (n.amount <= 0) continue;
      const d = Math.hypot(n.x - base.x, n.z - base.z);
      if (d < best) { best = d; nearest = n; }
    }
    cmdGather(world, idle.map(u => u.id), nearest.id);
  }

  // 2. Expand supply before it becomes the binding constraint.
  //
  //    Command gates population, control range and automation together (§8.1),
  //    so an AI that never builds simply stops: its starting Standard provides
  //    just enough Command for its starting army, and it then banks essence
  //    forever with a full supply bar. Outposts are the only way out.
  const capped = supplyFree(world, ai.team) <= AI.expandAtSupplyFree;
  const roomToGrow = supplyCap(world, ai.team) < SUPPLY_MAX;
  const building = world.sites.some(st => st.team === ai.team);
  if (capped && roomToGrow && !building && workers.length > 1) {
    const spot = expansionSpot(world, base.x, base.z);
    if (spot) {
      // Send one worker, not the whole economy — construction is a flat rate
      // regardless of how many are assigned (§8.1), so extra builders are
      // pure economic loss.
      const builder = workers.filter(u => !u.build?.siteId).at(-1);
      cmdPlaceBuilding(world, ai.team, 'outpost', spot.x, spot.z,
                       builder ? [builder.id] : []);
    }
  }

  // 3. Keep producing. Workers until the economy is staffed, then army.
  //    Training is attempted rather than gated on affordability: cmdTrain
  //    already validates, and letting it refuse is simpler than duplicating
  //    the cost rules here where they would drift out of sync.
  const wantWorkers = workers.length < AI.targetWorkers;
  const unit = wantWorkers
    ? 'worker'
    : (fighters.length % 3 === 2 ? 'marksman' : 'legionnaire');
  if (base.queue.length < AI.maxQueueDepth) {
    cmdTrain(world, base.id, unit);
  }

  // 4. Research whatever is affordable and reachable.
  //
  //    Without this the AI falls permanently behind any human who techs, since
  //    upgrades are category-wide multipliers that compound. It picks the
  //    cheapest available option rather than planning a build: Cohort's track
  //    is deliberately forgiving (§8.5, D-028), so researching in cost order is
  //    a genuinely reasonable strategy rather than a placeholder.
  if (!world.tech[ai.team].researching) {
    const options = availableTech(world, ai.team)
      .filter(id => TECH[id].cost <= world.resources[ai.team] - AI.techReserve)
      .sort((a, b) => TECH[a].cost - TECH[b].cost || (a < b ? -1 : 1));
    const pick = options[0];
    if (pick) cmdResearch(world, ai.team, pick);
  }

  // 5. Commit the army once it is big enough, and keep it committed. Pulling
  //    back and re-attacking would be a real decision; this AI does not make
  //    it yet, and pretending otherwise would just produce dithering.
  if (!ai.attacking && fighters.length >= AI.attackAtArmySize) ai.attacking = true;
  if (ai.attacking && fighters.length === 0) ai.attacking = false;

  if (ai.attacking) {
    const objective = pickObjective(world, ai.team);
    if (objective) {
      // Only redirect units that are not already busy fighting something, so
      // an ordered advance does not repeatedly interrupt an ongoing fight.
      const free = fighters.filter(u => findTarget(world, u) === null);
      if (free.length) cmdMove(world, free.map(u => u.id), objective.x, objective.z);
    }
  } else {
    // Hold near home, loosely, so the army is not standing in the mining line.
    const idleFighters = fighters.filter(u => !u.target && findTarget(world, u) === null);
    const rallyX = base.x + (base.x < 0 ? 4 : -4);
    for (const f of idleFighters) {
      if (Math.hypot(f.x - rallyX, f.z - base.z) > AI.rallySlack) {
        cmdMove(world, [f.id], rallyX, base.z);
      }
    }
  }
}

/**
 * Somewhere to put an Outpost: near the base, clear of everything else.
 *
 * Deterministic by construction — it walks a fixed ring of candidate angles and
 * takes the first that fits, rather than sampling randomly. Two peers must pick
 * the same spot from the same state (D-010), and it keeps the AI off the RNG.
 */
function expansionSpot(
  world: World, cx: number, cz: number,
): { x: number; z: number } | null {
  for (let ring = 0; ring < AI.expandRings; ring++) {
    const r = AI.expandMinRadius + ring * AI.expandRingStep;
    for (let i = 0; i < AI.expandAngles; i++) {
      const a = (i / AI.expandAngles) * Math.PI * 2;
      const x = cx + Math.cos(a) * r;
      const z = cz + Math.sin(a) * r;
      if (!circleInMapBoundary(mapBoundaryForSeed(world.mapSeed), x, z, 4.5)) continue;
      const clearOfBuildings = world.buildings.every(b => Math.hypot(b.x - x, b.z - z) > b.radius + 4);
      const clearOfSites = world.sites.every(st => Math.hypot(st.x - x, st.z - z) > st.radius + 4);
      const clearOfNodes = world.nodes.every(n => Math.hypot(n.x - x, n.z - z) > 4);
      if (clearOfBuildings && clearOfSites && clearOfNodes) return { x, z };
    }
  }
  return null;
}

/**
 * What to attack: the nearest enemy building, since the win condition is pure
 * base destruction (§2). Falls back to the nearest enemy unit so an army with
 * nothing left to siege still does something.
 */
function pickObjective(world: World, team: Team): { x: number; z: number } | null {
  let best: { x: number; z: number } | null = null;
  let bestD = Infinity;
  const origin = world.buildings.find(b => b.team === team);
  const ox = origin?.x ?? 0;
  const oz = origin?.z ?? 0;

  for (const b of world.buildings) {
    if (b.team === team) continue;
    const d = Math.hypot(b.x - ox, b.z - oz);
    if (d < bestD) { bestD = d; best = { x: b.x, z: b.z }; }
  }
  if (best) return best;

  for (const u of world.units) {
    if (u.team === team || u.hp <= 0) continue;
    const d = Math.hypot(u.x - ox, u.z - oz);
    if (d < bestD) { bestD = d; best = { x: u.x, z: u.z }; }
  }
  return best;
}

/** Ids of everything the AI commands — used by tests and debug overlays. */
export function aiUnitIds(world: World, ai: AiState): EntityId[] {
  return myUnits(world, ai.team)
    .filter(u => !UNIT_TYPES[u.type].isWorker)
    .map(u => u.id);
}
