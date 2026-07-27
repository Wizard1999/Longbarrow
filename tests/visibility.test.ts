import { describe, expect, it } from 'vitest';
import { FogOfWarField } from '../src/ui/fogOfWar';
import { createVisibilityController, visibilityModeFromSearch } from '../src/ui/visibility';
import type { MapBoundary } from '../src/sim/mapBoundary';

const boundary: MapBoundary = {
  vertices: [
    { x: -20, z: -20 }, { x: 20, z: -20 },
    { x: 20, z: 20 }, { x: -20, z: 20 },
  ],
  center: { x: 0, z: 0 },
  bounds: { minX: -20, maxX: 20, minZ: -20, maxZ: 20, width: 40, depth: 40 },
  radius: Math.hypot(20, 20),
};

describe('visibility policy', () => {
  it('parses explicit spectator and omniscient modes only', () => {
    expect(visibilityModeFromSearch('?vision=omniscient')).toBe('omniscient');
    expect(visibilityModeFromSearch('?vision=spectator')).toBe('omniscient');
    expect(visibilityModeFromSearch('?vision=player')).toBe('player');
    expect(visibilityModeFromSearch('')).toBe('player');
  });

  it('always shows owned entities but hides unseen rivals', () => {
    const fog = new FogOfWarField(boundary, 20, 20);
    fog.update([{ x: -10, z: 0, radius: 5 }]);
    const visibility = createVisibilityController(fog, 'player');

    expect(visibility.entityVisible('player', 15, 0)).toBe(true);
    expect(visibility.entityVisible('rival', 15, 0)).toBe(false);
    expect(visibility.entityVisible('rival', -10, 0)).toBe(true);
  });

  it('remembers discovered resources without exposing hidden enemies', () => {
    const fog = new FogOfWarField(boundary, 20, 20);
    const visibility = createVisibilityController(fog, 'player');
    fog.update([{ x: 0, z: 0, radius: 5 }]);
    expect(visibility.resourceVisible(0, 0)).toBe(true);
    expect(visibility.entityVisible('rival', 0, 0)).toBe(true);

    fog.update([]);
    expect(visibility.resourceVisible(0, 0)).toBe(true);
    expect(visibility.entityVisible('rival', 0, 0)).toBe(false);
  });

  it('omniscient mode bypasses fog without mutating it', () => {
    const fog = new FogOfWarField(boundary, 20, 20);
    const visibility = createVisibilityController(fog, 'player');
    expect(visibility.entityVisible('rival', 15, 0)).toBe(false);

    visibility.setMode('omniscient');
    expect(visibility.stateAt(15, 0)).toBe(2);
    expect(visibility.entityVisible('rival', 15, 0)).toBe(true);
    expect(fog.stateAt(15, 0)).toBe(0);
  });
});
