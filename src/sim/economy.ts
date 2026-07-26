import type { Building, EntityId, ResourceNode, Team, Unit, Vec2, World } from '../core/types';
import { GOLDEN_ANGLE } from '../core/loop';
import { BUILDING_TYPES } from '../data/buildings';
import { ECON } from '../data/tuning';

export function findNode(world: World, id: EntityId | null): ResourceNode | null {
  return world.nodes.find(n => n.id === id) ?? null;
}

export function nearestNodeWithResources(world: World, x: number, z: number): ResourceNode | null {
  let best: ResourceNode | null = null;
  let bestD = Infinity;
  for (const n of world.nodes) {
    if (n.amount <= 0) continue;
    const d = Math.hypot(n.x - x, n.z - z);
    if (d < bestD) { bestD = d; best = n; }
  }
  return best;
}

export function nearestDropoff(world: World, team: Team, x: number, z: number): Building | null {
  let best: Building | null = null;
  let bestD = Infinity;
  for (const b of world.buildings) {
    if (b.team !== team) continue;
    if (!BUILDING_TYPES[b.type].dropoff) continue;
    const d = Math.hypot(b.x - x, b.z - z);
    if (d < bestD) { bestD = d; best = b; }
  }
  return best;
}

/** Approach a point from a stable per-unit angle so workers fan out around a
 *  node instead of piling onto one spot. Deterministic — derived from unit id,
 *  not RNG, so replays and lockstep stay identical. */
export function approachPoint(unit: Unit, tx: number, tz: number, standoff: number): Vec2 {
  const a = (unit.id * GOLDEN_ANGLE) % (Math.PI * 2);
  return { x: tx + Math.cos(a) * standoff, z: tz + Math.sin(a) * standoff };
}

export function stepGather(world: World, u: Unit): void {
  const g = u.gather;
  if (!g || g.state === 'idle') return;

  // --- walking out to the node ---
  if (g.state === 'toNode') {
    let node = findNode(world, g.nodeId);
    // Node ran dry while we were walking: re-target the nearest live one. This
    // is what makes the loop genuinely set-and-forget across a whole match.
    if (!node || node.amount <= 0) {
      node = nearestNodeWithResources(world, u.x, u.z);
      if (!node) {
        // Nothing left anywhere. Deliver what we're holding, then stop.
        if (g.carrying > 0) { g.state = 'toBase'; return; }
        g.state = 'idle'; g.nodeId = null; u.target = null;
        return;
      }
      g.nodeId = node.id;
    }
    // Park at this worker's own slot, not merely "somewhere near the node".
    // Triggering on distance-to-node instead would stop every worker at the
    // point where it first crosses that radius — and since they all arrive
    // from the base, that means they all stop in the same place.
    const slot = approachPoint(u, node.x, node.z, ECON.gatherStandoff);
    if (Math.hypot(slot.x - u.x, slot.z - u.z) <= ECON.slotEpsilon) {
      u.target = null;
      g.state = 'gathering';
      g.timer = ECON.gatherTicks;
    } else {
      u.target = slot;
    }
    return;
  }

  // --- extracting ---
  if (g.state === 'gathering') {
    const node = findNode(world, g.nodeId);
    if (!node || node.amount <= 0) { g.state = 'toNode'; return; }
    g.timer--;
    if (g.timer <= 0) {
      const taken = Math.min(ECON.carryAmount, node.amount);
      node.amount -= taken;
      g.carrying = taken;
      g.state = 'toBase';
    }
    return;
  }

  // --- hauling back ---
  if (g.state === 'toBase') {
    const base = nearestDropoff(world, u.team, u.x, u.z);
    if (!base) { g.state = 'idle'; u.target = null; return; }
    if (Math.hypot(base.x - u.x, base.z - u.z) <= ECON.dropoffRange + base.radius) {
      u.target = null;
      g.state = 'depositing';
      g.timer = ECON.depositTicks;
    } else {
      u.target = approachPoint(u, base.x, base.z, base.radius + 0.8);
    }
    return;
  }

  // --- unloading, then straight back out ---
  if (g.state === 'depositing') {
    g.timer--;
    if (g.timer <= 0) {
      world.resources[u.team] += g.carrying;
      g.carrying = 0;
      g.state = 'toNode';
    }
  }
}

export function totalResourcesRemaining(world: World): number {
  return world.nodes.reduce((sum, n) => sum + n.amount, 0);
}

export function countGathering(world: World, team: Team): number {
  return world.units.filter(u => u.team === team && u.gather && u.gather.state !== 'idle').length;
}
