import { describe, expect, it } from 'vitest';
import { BUILDING_TYPES } from '../../src/data/buildings';
import type { BuildingTypeKey } from '../../src/core/types';

const types = Object.keys(BUILDING_TYPES) as BuildingTypeKey[];

describe('building silhouettes are declared, not scaled copies', () => {
  it('every building type declares one', () => {
    for (const t of types) {
      const sil = BUILDING_TYPES[t].silhouette;
      expect(sil.drumHeight).toBeGreaterThan(0);
      expect(sil.ribCount).toBeGreaterThan(0);
    }
  });

  it('no two buildings share a profile', () => {
    // The Outpost used to be the Standard scaled by radius alone, so the two
    // were one object at two sizes and told you nothing about their roles.
    const shapes = types.map(t => {
      const s = BUILDING_TYPES[t].silhouette;
      return `${s.drumTop}:${s.drumBottom}:${s.drumHeight}:${s.ribCount}:${s.ribHeight}`;
    });
    expect(new Set(shapes).size).toBe(types.length);
  });

  it('makes the Outpost squatter and wider-based than the Standard', () => {
    // Proportions, not absolute size: the Outpost is smaller either way, so the
    // difference has to live in the ratios to read as a different structure.
    const std = BUILDING_TYPES.standard.silhouette;
    const out = BUILDING_TYPES.outpost.silhouette;
    expect(out.drumBottom).toBeGreaterThan(std.drumBottom);
    expect(out.ribHeight).toBeLessThan(std.ribHeight);
    expect(out.coreHeight).toBeLessThan(std.coreHeight);
  });

  it('gives the Standard the most ribs, so a capital reads as the crowned one', () => {
    const std = BUILDING_TYPES.standard.silhouette;
    for (const t of types) {
      if (t === 'standard') continue;
      expect(BUILDING_TYPES[t].silhouette.ribCount).toBeLessThanOrEqual(std.ribCount);
    }
  });

  it('keeps every rib inside its own footprint', () => {
    // Ribs are placed at 0.84 x radius; a drum wider than that would swallow
    // them, and one much narrower would leave them floating off the structure.
    for (const t of types) {
      const sil = BUILDING_TYPES[t].silhouette;
      expect(sil.drumBottom).toBeGreaterThan(0.84);
      expect(sil.drumBottom).toBeLessThan(1.6);
    }
  });
});
