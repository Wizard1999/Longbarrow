import type { Unit } from '../core/types';
import type { MapBoundary } from './mapBoundary';
import { DT } from '../core/loop';
import { UNIT_TYPES } from '../data/units';
import { clampPointToMapBoundary } from './mapBoundary';

export function stepMovement(u: Unit, boundary: MapBoundary): void {
  if (!u.target) return;
  const safe = clampPointToMapBoundary(boundary, u.target.x, u.target.z, u.radius + 0.05);
  u.target = safe;
  const dx = u.target.x - u.x;
  const dz = u.target.z - u.z;
  const dist = Math.hypot(dx, dz);
  const eps = UNIT_TYPES[u.type].arriveEpsilon;
  if (dist <= eps) {
    if (u.orderMode === 'patrol' && u.patrolFrom && u.patrolTo) {
      u.patrolHeading = u.patrolHeading === 'to' ? 'from' : 'to';
      const next = u.patrolHeading === 'to' ? u.patrolTo : u.patrolFrom;
      u.target = { x: next.x, z: next.z };
    } else {
      u.target = null;
      if (u.orderMode === 'move' || u.orderMode === 'attackMove') u.orderMode = 'idle';
    }
    return;
  }
  const step = Math.min(u.speed * DT, dist);
  u.x += (dx / dist) * step;
  u.z += (dz / dist) * step;
  const clamped = clampPointToMapBoundary(boundary, u.x, u.z, u.radius);
  u.x = clamped.x;
  u.z = clamped.z;
  u.facing = Math.atan2(dx, dz);
}
