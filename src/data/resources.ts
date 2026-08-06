/**
 * The resource registry (D-031).
 *
 * Greenmantle declares two gathered currencies. The engine must not know that
 * number: `src/sim/` reads this table generically, so a game built on this
 * engine can ship one resource or five by editing only this file. That is why
 * stocks are a bag keyed by id rather than named fields on `World`, and why
 * costs are `{ [resourceId]: amount }` rather than a bare number.
 *
 * **Iterate `RESOURCE_ORDER`, never `Object.keys()` on a bag.** Object key order
 * is insertion order, and insertion order must never be able to change a
 * simulation result or a state hash.
 */

export type ResourceId = 'material' | 'legacy';

/**
 * Declared iteration order. Every loop over resources — hashing, HUD rows,
 * affordability — walks this array, so ordering is content, not an accident of
 * how a bag happened to be built.
 */
export const RESOURCE_ORDER: readonly ResourceId[] = ['material', 'legacy'];

export interface ResourceDef {
  label: string;
  /**
   * `common` is the everyday input; `rare` is contested and few. The engine
   * treats this as an opaque tag for generation and presentation weighting —
   * it never branches on the specific value.
   */
  abundance: 'common' | 'rare';
  /** How much one node holds. */
  nodeCapacity: number;
  /** How much a worker carries per trip. */
  carryAmount: number;
  /**
   * Target share of a team's stock, used by the automatic worker rebalance.
   *
   * This is what keeps two resources from reintroducing worker micro (D-031's
   * guard rail): idle workers steer toward whichever resource is furthest below
   * its share, so a player who never touches the economy still gathers both.
   * The decision the player makes is *which nodes to hold*, not which worker
   * mines what.
   */
  gatherShare: number;
}

export const RESOURCES: Record<ResourceId, ResourceDef> = {
  // The physical world: builds and trains. Plentiful, close to both bases.
  material: {
    label: 'Material',
    abundance: 'common',
    nodeCapacity: 1200,
    carryAmount: 8,
    gatherShare: 0.75,
  },
  // Understanding inherited from a dead civilisation: buys research. Few nodes,
  // deliberately placed on contested ground, so the tech curve is paid for with
  // map control rather than with time (D-031, D-025 for the violet).
  legacy: {
    label: 'Legacy',
    abundance: 'rare',
    nodeCapacity: 520,
    carryAmount: 5,
    gatherShare: 0.25,
  },
};

/** A team's stock. Plain object so `structuredClone` carries it (D-010). */
export type ResourceBag = Record<ResourceId, number>;

/** What something costs. Omitted resources cost nothing. */
export type ResourceCost = Partial<Record<ResourceId, number>>;
