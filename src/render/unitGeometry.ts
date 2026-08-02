import * as THREE from 'three';
import { UNIT_TYPES } from '../data/units';
import type { UnitTypeKey } from '../core/types';
import { QUALITY } from './quality';
import type { QualityTier } from './quality';

/**
 * Unit body geometry, shared per unit type and quality tier.
 *
 * Two things were wrong before this existed.
 *
 * **The quality budget was declared and never spent.** `QUALITY.bodySegments`
 * promises 8/12/16 radial segments and says outright that this is "where 'not
 * needlessly low-poly' gets spent" — and every unit was built with a hardcoded
 * six-sided cylinder at every tier, High included. That is the whole reason
 * units read as cylinders: the setting existed, nothing consumed it.
 *
 * **Geometry was allocated per unit.** A hundred units meant a hundred
 * identical `CylinderGeometry` objects and a hundred GPU uploads. Materials
 * were already shared for exactly this reason (`materials.ts`); geometry was
 * not, and it is the same cost in a different place.
 *
 * Caching by `type:tier` fixes both. The tier is part of the key because
 * switching quality rebuilds views, and a cache keyed on type alone would hand
 * the new renderer the old tier's meshes.
 *
 * Proportions come from each unit's declared `silhouette` in `src/data/`, never
 * inferred from combat stats. Inference was tried and got it wrong twice —
 * melee "range" is 0.9 rather than 0, and the speeds cluster too tightly for a
 * threshold to isolate a scout. How a unit reads is an authoring decision
 * (D-029).
 */

export interface UnitBodyGeometry {
  body: THREE.CylinderGeometry;
  head: THREE.IcosahedronGeometry;
  /** Shoulder mass, for units whose role should read as "front line". */
  shoulders: THREE.CylinderGeometry | null;
  /** Height of the body cylinder, so callers can place heads and accessories. */
  bodyHeight: number;
}

const cache = new Map<string, UnitBodyGeometry>();

export function unitBodyGeometry(type: UnitTypeKey, tier: QualityTier): UnitBodyGeometry {
  const key = `${type}:${tier}`;
  const hit = cache.get(key);
  if (hit) return hit;

  const p = UNIT_TYPES[type].silhouette;
  const segments = QUALITY[tier].bodySegments;
  // Head detail follows the tier too: a subdivided icosahedron at high, a raw
  // one at low. Cheap, and it is the part closest to the camera at miniature
  // zoom, so it is where extra triangles are most visible.
  const headDetail = segments >= 16 ? 1 : 0;

  const geo: UnitBodyGeometry = {
    body: new THREE.CylinderGeometry(p.radiusTop, p.radiusBottom, p.height, segments),
    head: new THREE.IcosahedronGeometry(p.headScale, headDetail),
    shoulders: p.shoulderRadius > 0
      ? new THREE.CylinderGeometry(p.shoulderRadius, p.shoulderRadius * 0.82, 0.22, segments)
      : null,
    bodyHeight: p.height,
  };
  cache.set(key, geo);
  return geo;
}

/** How many distinct geometries the unit set costs. Tests use this to catch
 *  per-unit allocation creeping back in. */
export function unitGeometryCount(): number {
  return cache.size;
}

/**
 * Drops the cache and frees the GPU buffers.
 *
 * Not needed for a quality change today — `ui/qualityControl.ts` reloads the
 * page, which discards everything. This exists for the case that does not:
 * an embedded or multi-match session that rebuilds the renderer in place would
 * otherwise keep every tier it had ever shown.
 */
export function disposeUnitGeometry(): void {
  for (const g of cache.values()) {
    g.body.dispose();
    g.head.dispose();
    g.shoulders?.dispose();
  }
  cache.clear();
}
