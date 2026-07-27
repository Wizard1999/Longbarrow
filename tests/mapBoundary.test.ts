import { describe, expect, it } from 'vitest';
import {
  circleInMapBoundary, clampPointToMapBoundary, mapBoundaryForSeed,
  mapLayoutForBoundary, pointInMapBoundary,
} from '../src/sim/mapBoundary';

describe('deterministic polygon map boundaries', () => {
  it('repeats exactly for the same seed and varies for another seed', () => {
    expect(mapBoundaryForSeed(1337).vertices).toEqual(mapBoundaryForSeed(1337).vertices);
    expect(mapBoundaryForSeed(1337).vertices).not.toEqual(mapBoundaryForSeed(1338).vertices);
  });

  it('is rotationally symmetric for fair opposite spawns', () => {
    const vertices = mapBoundaryForSeed(1337).vertices;
    const half = vertices.length / 2;
    for (let i = 0; i < half; i++) {
      expect(vertices[i + half]!.x).toBeCloseTo(-vertices[i]!.x, 8);
      expect(vertices[i + half]!.z).toBeCloseTo(-vertices[i]!.z, 8);
    }
  });

  it('contains the center but rejects distant points', () => {
    const boundary = mapBoundaryForSeed(1337);
    expect(pointInMapBoundary(boundary, 0, 0)).toBe(true);
    expect(pointInMapBoundary(boundary, 100, 100)).toBe(false);
  });

  it('requires a full construction footprint to remain on the board', () => {
    const boundary = mapBoundaryForSeed(1337);
    expect(circleInMapBoundary(boundary, 0, 0, 4)).toBe(true);
    const edge = boundary.vertices[0]!;
    expect(circleInMapBoundary(boundary, edge.x, edge.z, 1)).toBe(false);
  });
});


describe('polygon-safe gameplay anchors', () => {
  it('clamps an outside destination to a safe point inside the board', () => {
    const boundary = mapBoundaryForSeed(1337);
    const safe = clampPointToMapBoundary(boundary, 500, -300, 1.5);
    expect(circleInMapBoundary(boundary, safe.x, safe.z, 1.5)).toBe(true);
  });

  it('derives mirrored bases, resources, and starting groups from the boundary', () => {
    const boundary = mapBoundaryForSeed(7331);
    const layout = mapLayoutForBoundary(boundary);
    expect(layout.rivalBase.x).toBeCloseTo(-layout.playerBase.x, 8);
    expect(layout.rivalBase.z).toBeCloseTo(-layout.playerBase.z, 8);
    expect(layout.rivalWorkers.x).toBeCloseTo(-layout.playerWorkers.x, 8);
    expect(layout.rivalArmy.z).toBeCloseTo(-layout.playerArmy.z, 8);
    for (const point of [
      layout.playerBase, layout.rivalBase,
      ...layout.playerResources, ...layout.rivalResources,
      layout.playerWorkers, layout.rivalWorkers,
      layout.playerArmy, layout.rivalArmy,
    ]) {
      expect(pointInMapBoundary(boundary, point.x, point.z)).toBe(true);
    }
  });
});
