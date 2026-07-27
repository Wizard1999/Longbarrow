import { describe, expect, it } from 'vitest';
import { mapBoundaryForSeed } from '../src/sim/mapBoundary';
import { FogOfWarField } from '../src/ui/fogOfWar';

describe('polygon fog of war field', () => {
  it('starts unexplored and reveals cells around a vision source', () => {
    const fog = new FogOfWarField(mapBoundaryForSeed(1337), 32, 32);
    expect(fog.stateAt(0, 0)).toBe(0);
    fog.update([{ x: 0, z: 0, radius: 10 }]);
    expect(fog.stateAt(0, 0)).toBe(2);
    expect(fog.stateAt(25, 0)).toBe(0);
  });

  it('retains explored cells after current vision moves away', () => {
    const fog = new FogOfWarField(mapBoundaryForSeed(42), 40, 40);
    fog.update([{ x: -10, z: 0, radius: 7 }]);
    expect(fog.stateAt(-10, 0)).toBe(2);
    fog.update([{ x: 10, z: 0, radius: 7 }]);
    expect(fog.stateAt(-10, 0)).toBe(1);
    expect(fog.stateAt(10, 0)).toBe(2);
  });

  it('never reports off-map space as visible', () => {
    const boundary = mapBoundaryForSeed(9);
    const fog = new FogOfWarField(boundary);
    fog.update([{ x: 0, z: 0, radius: 1000 }]);
    expect(fog.stateAt(boundary.bounds.maxX + 5, 0)).toBe(0);
  });
});
