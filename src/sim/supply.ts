import type { Team, World } from '../core/types';
import { BUILDING_TYPES } from '../data/buildings';
import { UNIT_TYPES } from '../data/units';
import { SUPPLY_MAX } from '../data/tuning';

// Cohort's Command (§8.1). One stat, three jobs: population cap, control
// range, and — once squads exist at 1.7 — the number of squads that can run an
// automated behaviour chain at once (§8.3, assumption A4).

export function supplyCap(world: World, team: Team): number {
  let cap = 0;
  for (const b of world.buildings) {
    if (b.team !== team) continue;
    cap += BUILDING_TYPES[b.type].command;
  }
  return Math.min(cap, SUPPLY_MAX);
}

/** Queued units count against the cap. Charging only on completion lets a
 *  player over-queue and strand finished units with nowhere to go. */
export function supplyUsed(world: World, team: Team): number {
  let used = 0;
  for (const u of world.units) {
    if (u.team === team) used += UNIT_TYPES[u.type].supply;
  }
  for (const b of world.buildings) {
    if (b.team !== team) continue;
    for (const item of b.queue) used += UNIT_TYPES[item.type].supply;
  }
  return used;
}

export function supplyFree(world: World, team: Team): number {
  return supplyCap(world, team) - supplyUsed(world, team);
}

/**
 * Territory held, for display and for later systems. Deliberately NOT a build
 * restriction: gating placement on network range is Conclave's mechanic
 * ("Project from Network", §8.1), and Cohort's construction identity is
 * "Queue & Walk" — a worker walks wherever you point it. See assumption A7.
 */
export function isInControl(world: World, team: Team, x: number, z: number): boolean {
  for (const b of world.buildings) {
    if (b.team !== team) continue;
    if (Math.hypot(b.x - x, b.z - z) <= BUILDING_TYPES[b.type].controlRadius) return true;
  }
  return false;
}
