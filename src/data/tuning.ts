// EVERY balance number lives in data/. All of these are placeholders — the
// blueprint's scope-discipline note is explicit that systems get implemented
// faithfully now and tuned at Phase 4.4.

export const BUILD = {
  // Flat rate whenever at least one assigned worker is present (assumption A8).
  // Deliberately NOT "more workers = faster": stacking workers to rush a
  // building is a different race's fantasy, and Cohort's gather curve is "flat
  // and reliable" (§8.1). The interesting decision is meant to be *whether to
  // leave the worker there*, not how many to pile on.
  progressPerTick: 1,
  buildRange: 2.0,      // how close a builder must be for progress to run
  builderStandoff: 0.9, // parked just outside the site footprint
};

export const SUPPLY_MAX = 200;      // hard ceiling regardless of Command built
export const MAX_QUEUE = 5;         // production queue depth per building
export const PLACE_CLEARANCE = 1.0; // gap required between a new building and anything else

// Automation (§4, §8.3). Command gates how many squads can run a chain at
// once — Cohort's flavour of the multitasking skill is bandwidth of standing
// orders, so the cap is a count, not a distance or a complexity limit.
export const AUTOMATION = {
  commandPerSlot: 8,  // 15 command -> 1 squad; an outpost (+8) buys another
  arriveRadius: 2.2,  // how close counts as "the squad got there"
  stepTimeout: 1350,  // 45s at 30Hz — a step that cannot finish must not deadlock the chain
  maxChainSteps: 6,
  maxSquads: 5,       // squads are bound to number keys 1–5
};

// Combat (§2, §8.6, §8.7). Positioning decides fights, so every number here is
// about *where* units are, not how fast the player clicks.
export const COMBAT = {
  /** Shield wall: how close two Legionnaires must be to count as adjacent. */
  shieldWallRadius: 1.5,
  /** Defense added per adjacent Legionnaire. */
  shieldWallPerNeighbour: 0.07,
  /** Neighbours counted, at most. See assumption A12 — the design doc says
   *  "up to cohesion cap", which is ambiguous between this local adjacency
   *  limit and §8.6's ~20-unit squad cap (which arrives at 1.10). */
  shieldWallMaxNeighbours: 5,
  /** Defense can never exceed this, however tight the formation. */
  maxDefense: 0.75,
  /** Ticks of standing still before a unit is fully "set up". */
  settleTicks: 30,   // 1s
};

export const ECON = {
  gatherTicks: 45,      // 1.5s to fill up — Cohort is "flat and reliable" (§8.1)
  carryAmount: 8,       // essence per trip
  depositTicks: 6,      // 0.2s to unload
  gatherRange: 1.4,     // how close a worker must be to a node
  gatherStandoff: 1.05, // where a worker parks — each gets its own slot
  slotEpsilon: 0.12,    // how close to its slot counts as arrived
  dropoffRange: 2.6,    // how close a worker must be to a base
  nodeCapacity: 1200,   // finite: matches can run until the map is exhausted (§3)
};
