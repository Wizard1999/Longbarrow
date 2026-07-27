import { describe, expect, it } from 'vitest';
import { lodDistance3D, lodForDistance, shouldShowWorldSupport, strategicMarkerScale } from '../src/render/lod';

describe('render LOD policy', () => {
  it('moves from close to world detail as distance grows', () => {
    expect(lodForDistance(10, 'medium')).toBe('close');
    expect(lodForDistance(60, 'medium')).toBe('tactical');
    expect(lodForDistance(150, 'medium')).toBe('strategic');
    expect(lodForDistance(300, 'medium')).toBe('world');
  });

  it('keeps detail farther away on higher quality tiers', () => {
    expect(lodForDistance(38, 'low')).toBe('tactical');
    expect(lodForDistance(38, 'high')).toBe('close');
  });

  it('uses true 3D distance', () => {
    expect(lodDistance3D(0, 3, 4, 0, 0, 0)).toBe(5);
  });

  it('keeps strategic markers readable without unbounded growth', () => {
    expect(strategicMarkerScale(80, 'tactical')).toBe(1);
    expect(strategicMarkerScale(160, 'strategic')).toBeGreaterThan(1);
    expect(strategicMarkerScale(520, 'world')).toBeGreaterThan(strategicMarkerScale(180, 'world'));
    expect(strategicMarkerScale(100000, 'world')).toBe(4.6);
  });

  it('reveals the mythic support only at world-view distance', () => {
    expect(shouldShowWorldSupport(100)).toBe(false);
    expect(shouldShowWorldSupport(180)).toBe(true);
  });
});
