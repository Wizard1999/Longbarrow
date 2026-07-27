import { describe, expect, it } from 'vitest';
import { resolvePick } from '../src/input/pickPriority';

describe('resolvePick', () => {
  it('returns null for no valid candidates', () => {
    expect(resolvePick([])).toBeNull();
    expect(resolvePick([{ kind: 'unit', distance: Number.NaN, value: 1 }])).toBeNull();
  });

  it('prefers a unit within the same visible layer', () => {
    const result = resolvePick([
      { kind: 'building', distance: 10, value: 'base' },
      { kind: 'unit', distance: 10.3, value: 'worker' },
    ]);
    expect(result?.value).toBe('worker');
  });

  it('does not select a target hidden well behind the nearest surface', () => {
    const result = resolvePick([
      { kind: 'building', distance: 10, value: 'base' },
      { kind: 'unit', distance: 12, value: 'hidden unit' },
    ]);
    expect(result?.value).toBe('base');
  });

  it('uses distance to break ties within one kind', () => {
    const result = resolvePick([
      { kind: 'site', distance: 8.4, value: 'far' },
      { kind: 'site', distance: 8.1, value: 'near' },
    ]);
    expect(result?.value).toBe('near');
  });
});
