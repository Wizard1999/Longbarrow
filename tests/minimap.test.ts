import { describe, expect, it } from 'vitest';
import { mapBoundaryForSeed } from '../src/sim/mapBoundary';
import {
  minimapCanvasToWorld, minimapTransform, minimapWorldToCanvas,
} from '../src/ui/minimap';

describe('polygon minimap transforms', () => {
  it('round-trips world coordinates through canvas space', () => {
    const boundary = mapBoundaryForSeed(1337);
    const transform = minimapTransform(boundary, 240, 180);
    const canvas = minimapWorldToCanvas(transform, 8.25, -11.5);
    const world = minimapCanvasToWorld(transform, canvas.x, canvas.y);
    expect(world.x).toBeCloseTo(8.25, 8);
    expect(world.z).toBeCloseTo(-11.5, 8);
  });

  it('centres the canonical map centre in the canvas', () => {
    const boundary = mapBoundaryForSeed(42);
    const transform = minimapTransform(boundary, 300, 200);
    const centre = minimapWorldToCanvas(transform, boundary.center.x, boundary.center.z);
    expect(centre.x).toBeCloseTo(150, 8);
    expect(centre.y).toBeCloseTo(100, 8);
  });
});
