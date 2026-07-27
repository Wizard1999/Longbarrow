

/**
 * Cohort's tech track (§8.5 — "Linear & Reliable").
 *
 * The design is explicit about the *shape* this must take, and it is unusual
 * enough to be worth restating, because the obvious RTS default violates it:
 *
 *   - **Mostly linear.** Researching everything in order works fine. Mastery
 *     comes from *timing* upgrades against scouted information, not from
 *     picking the correct branch.
 *   - **Nothing permanently locked out.** Doctrine pairs let you choose which
 *     to take *first*; the other stays available. This is the opposite of
 *     Conclave, whose branches genuinely foreclose (§8.5).
 *   - **Category-wide effects.** An upgrade improves "every melee unit", never
 *     "the Legionnaire". Single-unit upgrades would make the roster a list of
 *     independent tuning knobs instead of a doctrine.
 *
 * Effects are declarative data rather than functions, so they survive
 * `structuredClone` and JSON, and so the sim can hash what has been researched
 * without hashing behaviour (D-010).
 */

export type TechId =
  | 'reinforcedPlate'
  | 'measuredVolley'
  | 'quarryDiscipline'
  | 'deepSeams'
  | 'attritionDoctrine'
  | 'vanguardDoctrine'
  | 'enduringFrames';

/** Which units an upgrade touches. Category-wide by design, never a single unit. */
export type TechCategory = 'melee' | 'ranged' | 'worker' | 'all';

export interface TechEffect {
  category: TechCategory;
  /** Multiplied into outgoing damage. */
  damageMul?: number;
  /** Added to the flat defense fraction, before the shield-wall bonus. */
  defenseAdd?: number;
  /** Multiplied into max HP. */
  hpMul?: number;
  /** Multiplied into resources carried per gather trip. */
  carryMul?: number;
  /** Multiplied into damage dealt to buildings. */
  siegeMul?: number;
}

export interface TechDef {
  id: TechId;
  label: string;
  cost: number;
  researchTicks: number;
  /** All of these must be researched first. Kept short — this is a track, not a web. */
  requires: readonly TechId[];
  /**
   * The other half of a doctrine pair. Purely informational: taking one does
   * NOT lock the other out (§8.5). The UI uses it to present the choice.
   */
  pairedWith?: TechId;
  effects: readonly TechEffect[];
  blurb: string;
}

export const TECH: Record<TechId, TechDef> = {
  // --- Tier 1: broad, cheap, always-correct openers ----------------------
  reinforcedPlate: {
    id: 'reinforcedPlate',
    label: 'Reinforced Plate',
    cost: 120,
    researchTicks: 450,          // 15s at 30Hz
    requires: [],
    effects: [{ category: 'melee', defenseAdd: 0.06 }],
    blurb: 'Melee units ignore more incoming damage. Stacks with the shield wall.',
  },
  measuredVolley: {
    id: 'measuredVolley',
    label: 'Measured Volley',
    cost: 120,
    researchTicks: 450,
    requires: [],
    effects: [{ category: 'ranged', damageMul: 1.15 }],
    blurb: 'Ranged units hit harder once set up.',
  },
  quarryDiscipline: {
    id: 'quarryDiscipline',
    label: 'Quarry Discipline',
    cost: 100,
    researchTicks: 360,
    requires: [],
    effects: [{ category: 'worker', carryMul: 1.25 }],
    blurb: 'Workers carry more per trip. The economy upgrade you never regret.',
  },

  // --- Tier 2 ------------------------------------------------------------
  deepSeams: {
    id: 'deepSeams',
    label: 'Deep Seams',
    cost: 180,
    researchTicks: 540,
    requires: ['quarryDiscipline'],
    effects: [{ category: 'worker', carryMul: 1.25 }],
    blurb: 'Workers carry more still. Compounds with Quarry Discipline.',
  },

  /**
   * The doctrine pair. Both remain researchable — the decision is which comes
   * first, and therefore which army you have during the window before the
   * second one lands. That is the "timing against scouted info" §8.5 asks for.
   */
  attritionDoctrine: {
    id: 'attritionDoctrine',
    label: 'Attrition Doctrine',
    cost: 220,
    researchTicks: 600,
    requires: ['reinforcedPlate'],
    pairedWith: 'vanguardDoctrine',
    effects: [{ category: 'all', hpMul: 1.15 }],
    blurb: 'Everything endures longer. Favours holding ground.',
  },
  vanguardDoctrine: {
    id: 'vanguardDoctrine',
    label: 'Vanguard Doctrine',
    cost: 220,
    researchTicks: 600,
    requires: ['reinforcedPlate'],
    pairedWith: 'attritionDoctrine',
    effects: [{ category: 'all', damageMul: 1.12 }],
    blurb: 'Everything hits harder. Favours taking ground.',
  },

  // --- Tier 3 ------------------------------------------------------------
  enduringFrames: {
    id: 'enduringFrames',
    label: 'Enduring Frames',
    cost: 300,
    researchTicks: 750,
    requires: ['attritionDoctrine', 'vanguardDoctrine'],
    effects: [
      { category: 'all', hpMul: 1.1 },
      { category: 'all', siegeMul: 1.4 },
    ],
    blurb: 'Fossil frames hold together under siege work. Structures fall faster.',
  },
};

export const ALL_TECH_IDS = Object.keys(TECH) as TechId[];

/** Category membership for a unit type. Kept here so a new unit joins the
 *  existing upgrade track by declaring its category, not by editing effects. */
export function techCategoryOf(isWorker: boolean, range: number): TechCategory {
  if (isWorker) return 'worker';
  return range > 2 ? 'ranged' : 'melee';
}
