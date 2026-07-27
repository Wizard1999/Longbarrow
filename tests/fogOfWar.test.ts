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

describe('coverage texture (B-004)', () => {
  // The softness fix samples a texture instead of drawing a quad per cell, so
  // the field has to be exportable as bytes and correct at the polygon rim.
  const boundary = mapBoundaryForSeed(1337);

  it('reports a length matching its grid', () => {
    const fog = new FogOfWarField(boundary, 16, 16);
    expect(fog.coverageLength).toBe(256);
  });

  it('writes fogged for unexplored ground inside the polygon', () => {
    const fog = new FogOfWarField(boundary, 16, 16);
    const out = new Uint8Array(fog.coverageLength);
    fog.coverage(out);
    // Somewhere inside must be fogged; if everything came back clear the
    // overlay would render nothing at all.
    expect(Array.from(out).some(v => v === 0)).toBe(true);
  });

  it('writes clear outside the polygon, so the rim fades instead of cutting', () => {
    const fog = new FogOfWarField(boundary, 16, 16);
    const out = new Uint8Array(fog.coverageLength);
    fog.coverage(out);
    // Corners of the bounding box lie outside a generated polygon.
    expect(out[0]).toBe(255);
    expect(out[out.length - 1]).toBe(255);
  });

  it('writes the three states distinctly', () => {
    const fog = new FogOfWarField(boundary, 24, 24);
    const centre = { x: boundary.bounds.minX + boundary.bounds.width / 2,
                     z: boundary.bounds.minZ + boundary.bounds.depth / 2 };
    fog.update([{ ...centre, radius: 10 }]);
    const seen = new Uint8Array(fog.coverageLength);
    fog.coverage(seen);
    expect(Array.from(seen).some(v => v === 255)).toBe(true);

    // Move the observer away: what it saw becomes explored, not clear.
    fog.update([{ x: centre.x + 40, z: centre.z + 40, radius: 4 }]);
    const after = new Uint8Array(fog.coverageLength);
    fog.coverage(after);
    expect(Array.from(after).some(v => v === 128)).toBe(true);
  });

  it('agrees with stateAt, so the sampled and queried fields cannot drift', () => {
    const fog = new FogOfWarField(boundary, 20, 20);
    const centre = { x: boundary.bounds.minX + boundary.bounds.width / 2,
                     z: boundary.bounds.minZ + boundary.bounds.depth / 2 };
    fog.update([{ ...centre, radius: 12 }]);
    const out = new Uint8Array(fog.coverageLength);
    fog.coverage(out);

    const col = Math.floor(((centre.x - boundary.bounds.minX) / boundary.bounds.width) * 20);
    const row = Math.floor(((centre.z - boundary.bounds.minZ) / boundary.bounds.depth) * 20);
    const expected = fog.stateAt(centre.x, centre.z) === 2 ? 255 : 128;
    expect(out[row * 20 + col]).toBe(expected);
  });
});
