import { describe, expect, it } from 'vitest';
import { UNIT_TYPES } from '../../src/data/units';
import type { UnitTypeKey } from '../../src/core/types';
import { QUALITY } from '../../src/render/quality';
import {
  disposeUnitGeometry, unitBodyGeometry, unitGeometryCount,
} from '../../src/render/unitGeometry';

const types = Object.keys(UNIT_TYPES) as UnitTypeKey[];

describe('unit geometry is shared, not per-unit', () => {
  it('returns the identical geometry for two units of a type', () => {
    // A hundred units meant a hundred identical CylinderGeometry uploads before
    // this cache existed — the same cost materials.ts already avoids.
    disposeUnitGeometry();
    const a = unitBodyGeometry('legionnaire', 'high');
    const b = unitBodyGeometry('legionnaire', 'high');
    expect(a.body).toBe(b.body);
    expect(a.head).toBe(b.head);
  });

  it('costs one entry per type and tier, however many units exist', () => {
    disposeUnitGeometry();
    for (let i = 0; i < 50; i++) unitBodyGeometry('legionnaire', 'high');
    expect(unitGeometryCount()).toBe(1);
  });

  it('keys on tier, so a quality change cannot hand back stale geometry', () => {
    disposeUnitGeometry();
    const low = unitBodyGeometry('legionnaire', 'low');
    const high = unitBodyGeometry('legionnaire', 'high');
    expect(low.body).not.toBe(high.body);
    expect(unitGeometryCount()).toBe(2);
  });
});

describe('the quality budget is actually spent', () => {
  it('gives higher tiers more radial segments', () => {
    // The regression this pins: QUALITY.bodySegments declared 8/12/16 and
    // nothing consumed it, so every unit was a six-sided cylinder even on High.
    const seg = (tier: 'low' | 'medium' | 'high') =>
      unitBodyGeometry('legionnaire', tier).body.parameters.radialSegments;
    expect(seg('low')).toBe(QUALITY.low.bodySegments);
    expect(seg('high')).toBe(QUALITY.high.bodySegments);
    expect(seg('high')).toBeGreaterThan(seg('low'));
  });

  it('never drops below the old hardcoded six', () => {
    for (const tier of ['low', 'medium', 'high'] as const) {
      expect(unitBodyGeometry('worker', tier).body.parameters.radialSegments)
        .toBeGreaterThanOrEqual(6);
    }
  });
});

describe('silhouette carries the role', () => {
  it('gives every declared unit type a profile', () => {
    for (const t of types) expect(unitBodyGeometry(t, 'high').bodyHeight).toBeGreaterThan(0);
  });

  it('makes the worker the smallest thing on the field', () => {
    // It must never be mistaken for a soldier when a base is under attack.
    const worker = unitBodyGeometry('worker', 'high').bodyHeight;
    for (const t of types) {
      if (UNIT_TYPES[t].isWorker) continue;
      expect(unitBodyGeometry(t, 'high').bodyHeight).toBeGreaterThan(worker);
    }
  });

  it('gives line infantry shoulders and nobody else', () => {
    // Declared per unit in src/data/, not inferred from combat stats — that
    // inference was wrong twice before this test existed (D-029).
    expect(unitBodyGeometry('legionnaire', 'high').shoulders).not.toBeNull();
    expect(unitBodyGeometry('marksman', 'high').shoulders).toBeNull();
    expect(unitBodyGeometry('outrider', 'high').shoulders).toBeNull();
    expect(unitBodyGeometry('worker', 'high').shoulders).toBeNull();
  });

  it('makes the scout narrower than the line infantry it flanks', () => {
    const scout = unitBodyGeometry('outrider', 'high').body.parameters;
    const line = unitBodyGeometry('legionnaire', 'high').body.parameters;
    expect(scout.radiusBottom).toBeLessThan(line.radiusBottom);
  });

  it('distinguishes every roster silhouette from every other', () => {
    // If two units share a profile the battlefield stops being readable, which
    // is the whole justification for the exaggerated proportions.
    const shapes = types.map(t => {
      const g = unitBodyGeometry(t, 'high');
      return `${g.bodyHeight}:${g.body.parameters.radiusTop}:${g.body.parameters.radiusBottom}`;
    });
    expect(new Set(shapes).size).toBe(types.length);
  });
});
