import type { QualityTier } from './quality';

export type ViewLod = 'close' | 'tactical' | 'strategic' | 'world';

export interface LodThresholds {
  close: number;
  tactical: number;
  strategic: number;
}

const BASE_THRESHOLDS: Record<QualityTier, LodThresholds> = {
  low: { close: 24, tactical: 62, strategic: 155 },
  medium: { close: 32, tactical: 82, strategic: 190 },
  high: { close: 42, tactical: 105, strategic: 230 },
};

export function lodForDistance(distance: number, tier: QualityTier): ViewLod {
  const t = BASE_THRESHOLDS[tier];
  if (distance <= t.close) return 'close';
  if (distance <= t.tactical) return 'tactical';
  if (distance <= t.strategic) return 'strategic';
  return 'world';
}

export function lodDistance3D(
  cameraX: number, cameraY: number, cameraZ: number,
  objectX: number, objectY: number, objectZ: number,
): number {
  return Math.hypot(cameraX - objectX, cameraY - objectY, cameraZ - objectZ);
}

export function shouldShowWorldSupport(cameraDistanceFromOrigin: number): boolean {
  return cameraDistanceFromOrigin >= 145;
}

/**
 * Keeps strategic markers legible across the enormous tabletop camera range.
 * The marker remains world-space geometry (and therefore selectable), but its
 * radius grows gently with camera distance instead of vanishing into a pixel.
 */
export function strategicMarkerScale(distance: number, lod: ViewLod): number {
  if (lod === 'close' || lod === 'tactical') return 1;
  const base = lod === 'world' ? 1.55 : 1;
  return Math.min(4.6, base * Math.sqrt(Math.max(1, distance) / 110));
}
