import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

// New in 1.1 — not part of the 85 ported behaviour tests. These guard the rule
// from 06 §3 statically, so a violation fails CI even if it happens to be
// harmless at runtime today. ESLint enforces the same rule at lint time; this
// catches it in the test run too, since that is what people actually watch.

const SIM_DIR = join(import.meta.dirname, '..', 'src', 'sim');

const simFiles = readdirSync(SIM_DIR)
  .filter(f => f.endsWith('.ts'))
  .map(f => ({ name: f, src: readFileSync(join(SIM_DIR, f), 'utf8') }));

const stripComments = (src: string) =>
  src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');

describe('sim purity (06 §3)', () => {
  it('there are sim modules to check', () => {
    expect(simFiles.length).toBeGreaterThan(0);
  });

  it('no sim module imports three', () => {
    const bad = simFiles.filter(f => /from\s+['"]three/.test(stripComments(f.src)));
    expect(bad.map(f => f.name)).toEqual([]);
  });

  it('no sim module imports from render, input or ui', () => {
    const bad = simFiles.filter(f => /from\s+['"][^'"]*\/(render|input|ui)\//.test(stripComments(f.src)));
    expect(bad.map(f => f.name)).toEqual([]);
  });

  it('no sim module calls Math.random()', () => {
    const bad = simFiles.filter(f => /Math\s*\.\s*random/.test(stripComments(f.src)));
    expect(bad.map(f => f.name)).toEqual([]);
  });

  it('no sim module touches the DOM or wall-clock time', () => {
    const forbidden = /\b(document|window|localStorage|requestAnimationFrame)\b|Date\s*\.\s*now|performance\s*\.\s*now/;
    const bad = simFiles.filter(f => forbidden.test(stripComments(f.src)));
    expect(bad.map(f => f.name)).toEqual([]);
  });
});

// D-029 (engine-first) had no test until now, which is exactly why a proposed
// two-resource schema that would have hardcoded Greenmantle's economy into
// `World` passed the full gate on review. The rule was written down; nothing
// checked it. These guard the *content* boundary the way the block above guards
// the purity boundary: `src/sim/` is an RTS engine that happens to be running
// Greenmantle, so it must not know the name of anything a game author could
// replace. See `ENGINE_VISION.md` and `START_HERE.md` §2C.

/** Names of game content — units, races, resources — that `sim/` must not know. */
const CONTENT_NOUNS = [
  'legionnaire', 'marksman', 'outrider', 'ballista', 'chronicler', 'sentinel',
  'warbringer', 'worker',
  'cohort', 'mycora', 'conclave', 'titanfolk',
  'essence', 'legacy', 'material', 'dominion', 'relic',
];

// Known, tracked debt. Each entry is a promise to remove, not a permanent
// exemption — see TODO.md "Engine-first cleanup". Adding a file here needs a
// reason; the list must only ever get shorter.
const CONTENT_DEBT: Record<string, string> = {
  'ai.ts': "hardcodes 'worker'/'legionnaire'/'marksman'; needs a race-roster lookup",
  'map.ts': "hardcodes the starting roster; belongs in src/data/ as a declared match setup",
};

describe('engine-first content boundary (D-029)', () => {
  const nounPattern = new RegExp(`\\b(${CONTENT_NOUNS.join('|')})\\b`, 'i');

  it('no sim module names game content, except tracked debt', () => {
    const offenders = simFiles
      .filter(f => !(f.name in CONTENT_DEBT))
      .filter(f => nounPattern.test(stripComments(f.src)))
      .map(f => `${f.name} (matched: ${nounPattern.exec(stripComments(f.src))?.[1]})`);
    expect(offenders).toEqual([]);
  });

  it('every debt entry is still actually in debt', () => {
    // Stops the exemption list outliving the problem: once a file is clean it
    // must leave the list, or the list stops meaning anything.
    const stale = Object.keys(CONTENT_DEBT).filter(name => {
      const f = simFiles.find(x => x.name === name);
      return f && !nounPattern.test(stripComments(f.src));
    });
    expect(stale).toEqual([]);
  });

  it('sim declares no per-resource fields, so resources stay data-driven (D-031)', () => {
    // A resource *registry* keyed by id can be extended or replaced by a game
    // author; named fields cannot. This is the specific mistake the review
    // caught: two currencies is content, two fields is architecture.
    const bad = simFiles.filter(f =>
      /\b(materialAmount|legacyAmount|essenceAmount)\b|resources\s*\.\s*(material|legacy|essence)\b/
        .test(stripComments(f.src)),
    );
    expect(bad.map(f => f.name)).toEqual([]);
  });
});
