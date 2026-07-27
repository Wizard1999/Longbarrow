import { afterEach, describe, expect, it, vi } from 'vitest';
import { readRequestedTier } from '../../src/render/quality';

/**
 * `readRequestedTier` reads exactly one thing — `window.location.search` — so a
 * stubbed global exercises it for real. Deliberately not pulling in jsdom: this
 * is the only browser-dependent unit under test, and a whole DOM implementation
 * is a heavy dependency to carry for a handful of assertions in a project whose
 * simulation is headless by design.
 */
function withQuery(search: string): void {
  vi.stubGlobal('window', { location: { search } });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('readRequestedTier', () => {
  it('accepts supported temporary quality overrides', () => {
    withQuery('?dev=performance&quality=low');
    expect(readRequestedTier()).toBe('low');
  });

  it.each(['medium', 'high'] as const)('accepts %s', (tier) => {
    withQuery(`?quality=${tier}`);
    expect(readRequestedTier()).toBe(tier);
  });

  it('rejects unknown quality values', () => {
    withQuery('?quality=cinematic');
    expect(readRequestedTier()).toBeNull();
  });

  it('returns null when no override is present', () => {
    withQuery('?dev=performance');
    expect(readRequestedTier()).toBeNull();
  });

  it('returns null rather than throwing when there is no window at all', () => {
    // The headless case: render modules get imported from node contexts by
    // tests and tooling, and must not explode when there is no browser.
    vi.stubGlobal('window', undefined);
    expect(readRequestedTier()).toBeNull();
  });
});
