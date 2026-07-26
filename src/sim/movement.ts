import type { Unit } from '../core/types';
import { DT } from '../core/loop';
import { UNIT_TYPES } from '../data/units';

export function stepMovement(u: Unit): void {
  if (!u.target) return;
  const dx = u.target.x - u.x;
  const dz = u.target.z - u.z;
  const dist = Math.hypot(dx, dz);
  const eps = UNIT_TYPES[u.type].arriveEpsilon;
  if (dist <= eps) { u.target = null; return; }
  const step = Math.min(u.speed * DT, dist);
  u.x += (dx / dist) * step;
  u.z += (dz / dist) * step;
  u.facing = Math.atan2(dx, dz);
}
