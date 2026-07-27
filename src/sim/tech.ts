import type { CommandResult, Team, UnitTypeKey, World } from '../core/types';
import { TECH, techCategoryOf } from '../data/tech';
import type { TechCategory, TechEffect, TechId } from '../data/tech';
import { UNIT_TYPES } from '../data/units';

/**
 * Research (§8.5). Deterministic, hashed and replayed like everything else in
 * `sim/`.
 *
 * The one interesting design constraint: modifiers are recomputed from the
 * researched list on demand rather than being baked into units when a tech
 * completes. Baking would be faster, but it makes `restore()` and replay
 * subtly wrong — rewinding to a tick before a tech finished would leave units
 * carrying stats they should not have, and nothing would catch it because the
 * stats are not themselves hashed. Deriving keeps the researched list as the
 * single source of truth, which is what actually gets hashed (D-010).
 */

export interface TechModifiers {
  damageMul: number;
  defenseAdd: number;
  hpMul: number;
  carryMul: number;
  siegeMul: number;
}

const NEUTRAL: TechModifiers = {
  damageMul: 1, defenseAdd: 0, hpMul: 1, carryMul: 1, siegeMul: 1,
};

export function createTechState(): { researched: TechId[]; researching: null } {
  return { researched: [], researching: null };
}

export function hasTech(world: World, team: Team, id: TechId): boolean {
  return world.tech[team].researched.includes(id);
}

/** Prerequisites met, not already researched, not currently being researched. */
export function canResearch(world: World, team: Team, id: TechId): CommandResult {
  const def = TECH[id];
  if (!def) return { ok: false, reason: 'no such technology' };
  const state = world.tech[team];
  if (state.researched.includes(id)) return { ok: false, reason: 'already researched' };
  if (state.researching) return { ok: false, reason: 'already researching something' };
  for (const req of def.requires) {
    if (!state.researched.includes(req)) {
      return { ok: false, reason: `requires ${TECH[req].label}` };
    }
  }
  if (world.resources[team] < def.cost) return { ok: false, reason: 'insufficient resources' };
  return { ok: true };
}

export function cmdResearch(world: World, team: Team, id: TechId): CommandResult {
  const check = canResearch(world, team, id);
  if (!check.ok) return check;
  const def = TECH[id];
  world.resources[team] -= def.cost;
  world.tech[team].researching = { id, ticksLeft: def.researchTicks };
  return { ok: true };
}

/** Refunds in full. Cancelling a half-finished upgrade is a reversal of a
 *  decision, not a punishment — Cohort's track is explicitly forgiving. */
export function cmdCancelResearch(world: World, team: Team): CommandResult {
  const state = world.tech[team];
  if (!state.researching) return { ok: false, reason: 'nothing being researched' };
  world.resources[team] += TECH[state.researching.id].cost;
  state.researching = null;
  return { ok: true };
}

export function stepTech(world: World): void {
  for (const team of ['player', 'rival'] as const) {
    const state = world.tech[team];
    const active = state.researching;
    if (!active) continue;
    active.ticksLeft--;
    if (active.ticksLeft > 0) continue;
    state.researched.push(active.id);
    state.researching = null;
  }
}

function applyEffect(into: TechModifiers, e: TechEffect): void {
  if (e.damageMul !== undefined) into.damageMul *= e.damageMul;
  if (e.defenseAdd !== undefined) into.defenseAdd += e.defenseAdd;
  if (e.hpMul !== undefined) into.hpMul *= e.hpMul;
  if (e.carryMul !== undefined) into.carryMul *= e.carryMul;
  if (e.siegeMul !== undefined) into.siegeMul *= e.siegeMul;
}

/**
 * Modifiers in force for one category. Effects targeting 'all' apply on top of
 * the category's own, so a doctrine upgrade lifts the whole army without being
 * duplicated per category in the data table.
 */
export function modifiersFor(world: World, team: Team, category: TechCategory): TechModifiers {
  const out: TechModifiers = { ...NEUTRAL };
  for (const id of world.tech[team].researched) {
    for (const e of TECH[id].effects) {
      if (e.category === category || e.category === 'all') applyEffect(out, e);
    }
  }
  return out;
}

export function modifiersForUnit(world: World, team: Team, type: UnitTypeKey): TechModifiers {
  const def = UNIT_TYPES[type];
  return modifiersFor(world, team, techCategoryOf(def.isWorker, def.combat.range));
}

/** What the UI offers: everything whose prerequisites are already met. */
export function availableTech(world: World, team: Team): TechId[] {
  const state = world.tech[team];
  return (Object.keys(TECH) as TechId[]).filter(id => {
    if (state.researched.includes(id)) return false;
    return TECH[id].requires.every(req => state.researched.includes(req));
  });
}
