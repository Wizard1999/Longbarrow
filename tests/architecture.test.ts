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
