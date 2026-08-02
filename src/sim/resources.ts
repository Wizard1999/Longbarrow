import { RESOURCES, RESOURCE_ORDER } from '../data/resources';
import type { ResourceBag, ResourceCost, ResourceId } from '../data/resources';

/**
 * Resource mechanics, read generically from the registry in `src/data/`.
 *
 * Nothing here knows how many resources exist or what any of them is called.
 * Every function walks `RESOURCE_ORDER`, which is the declared order from the
 * content table — never `Object.keys()`, whose insertion order must never reach
 * a simulation result or a state hash.
 *
 * See D-031. The mistake this shape exists to prevent is named fields on
 * `World` (`world.material`, `world.legacy`), which would weld one game's
 * economy into the engine and pass every test while doing it.
 */

export function emptyBag(): ResourceBag {
  const bag = {} as ResourceBag;
  for (const id of RESOURCE_ORDER) bag[id] = 0;
  return bag;
}

export function canAfford(bag: ResourceBag, cost: ResourceCost): boolean {
  for (const id of RESOURCE_ORDER) {
    const need = cost[id] ?? 0;
    if (need > 0 && bag[id] < need) return false;
  }
  return true;
}

/** Deducts a cost. Call `canAfford` first — this does not check. */
export function pay(bag: ResourceBag, cost: ResourceCost): void {
  for (const id of RESOURCE_ORDER) {
    const need = cost[id] ?? 0;
    if (need !== 0) bag[id] = Math.max(0, bag[id] - need);
  }
}

/** Returns a cost in full. Cancelling is a reversal of a decision, not a fine. */
export function refund(bag: ResourceBag, cost: ResourceCost): void {
  for (const id of RESOURCE_ORDER) {
    const back = cost[id] ?? 0;
    if (back !== 0) bag[id] += back;
  }
}

/**
 * A cost as one comparable number.
 *
 * Only for ordering and heuristics — the AI sorting research by expense, a UI
 * wanting a single figure. Never use it to decide affordability: two resources
 * summing to the same total are not interchangeable, which is the entire point
 * of having more than one.
 */
export function costMagnitude(cost: ResourceCost): number {
  let total = 0;
  for (const id of RESOURCE_ORDER) total += cost[id] ?? 0;
  return total;
}

/**
 * Which resource a team should gather next, or null if none is declared.
 *
 * Compares each resource's actual share of the team's stock against the share
 * declared in the registry and returns whichever is furthest behind. This is
 * what keeps a multi-resource economy compatible with "workers do not need
 * babysitting" (D-031): the split resolves itself, so the player's economic
 * decision stays *which nodes to hold* rather than which worker mines what.
 *
 * Ties resolve by declared order, so the choice is deterministic.
 */
export function neediestResource(bag: ResourceBag): ResourceId | null {
  let total = 0;
  for (const id of RESOURCE_ORDER) total += bag[id];

  let best: ResourceId | null = null;
  let bestDeficit = -Infinity;
  for (const id of RESOURCE_ORDER) {
    const share = RESOURCES[id].gatherShare;
    if (share <= 0) continue;
    // With an empty stock every resource is equally starved, so this falls
    // through to declared order rather than dividing by zero.
    const held = total > 0 ? bag[id] / total : 0;
    const deficit = share - held;
    if (deficit > bestDeficit) { bestDeficit = deficit; best = id; }
  }
  return best;
}

/**
 * A copy of `bag` with `amount` held back from every resource.
 *
 * Lets a caller ask "could I afford this and still keep a buffer?" without
 * knowing which resources exist. The AI uses it so a research purchase cannot
 * empty the account it needs for army production.
 */
export function afterReserve(bag: ResourceBag, amount: number): ResourceBag {
  const out = emptyBag();
  for (const id of RESOURCE_ORDER) out[id] = Math.max(0, bag[id] - amount);
  return out;
}
