/**
 * Quality tiers.
 *
 * The hard constraint on this project is that the game runs on practically any
 * machine straight from the website. That is not something you bolt on at the
 * end — it decides what the renderer is allowed to do. So the look is defined
 * once and the *cost* is tiered, rather than having a pretty version and a
 * separate ugly one.
 *
 * The painterly shading model itself is in every tier: it is fragment maths and
 * costs essentially nothing. What scales is the expensive, optional dressing —
 * shadow resolution, cloud shadows, antialiasing, pixel ratio.
 */
export type QualityTier = 'low' | 'medium' | 'high';

export interface QualitySettings {
  tier: QualityTier;
  label: string;
  antialias: boolean;
  shadows: boolean;
  shadowMapSize: number;
  cloudShadows: boolean;
  /** Hard cap on devicePixelRatio — the cheapest, biggest lever on a weak GPU. */
  maxPixelRatio: number;
  /** Terrain mesh subdivisions per side. */
  terrainSegments: number;
  /** Radial segments on unit/building bodies. Triangles are cheap; this is
   *  where "not needlessly low-poly" gets spent. */
  bodySegments: number;
  sceneryDetail: number;
}

export const QUALITY: Record<QualityTier, QualitySettings> = {
  low: {
    tier: 'low', label: 'Low',
    antialias: false, shadows: false, shadowMapSize: 512, cloudShadows: false,
    maxPixelRatio: 1, terrainSegments: 48, bodySegments: 8, sceneryDetail: 0,
  },
  medium: {
    tier: 'medium', label: 'Medium',
    antialias: true, shadows: true, shadowMapSize: 1024, cloudShadows: true,
    maxPixelRatio: 1.5, terrainSegments: 96, bodySegments: 12, sceneryDetail: 1,
  },
  high: {
    tier: 'high', label: 'High',
    antialias: true, shadows: true, shadowMapSize: 2048, cloudShadows: true,
    maxPixelRatio: 2, terrainSegments: 144, bodySegments: 16, sceneryDetail: 2,
  },
};

const STORAGE_KEY = 'rts.quality';

/**
 * Picks a starting tier. Deliberately conservative: it is far better to open
 * smooth and let someone turn detail up than to open at 12fps on a laptop and
 * have them close the tab. Renderer info is a weak signal, so this leans on
 * coarse, reliable hints only.
 */
export function detectTier(): QualityTier {
  const requested = readRequestedTier();
  if (requested) return requested;

  const stored = readStoredTier();
  if (stored) return stored;

  const cores = navigator.hardwareConcurrency ?? 4;
  const mem = (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 4;
  const mobile = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);

  if (mobile || cores <= 4 || mem <= 4) return 'low';
  if (cores >= 8 && mem >= 8) return 'high';
  return 'medium';
}


/**
 * Temporary URL override for repeatable benchmarking, e.g.
 * `?dev=performance&quality=low`. It deliberately does not write storage, so a
 * tester can compare tiers without changing their normal preference.
 */
export function readRequestedTier(): QualityTier | null {
  try {
    const value = new URLSearchParams(window.location.search).get('quality');
    return value === 'low' || value === 'medium' || value === 'high' ? value : null;
  } catch {
    return null;
  }
}

export function readStoredTier(): QualityTier | null {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    return v === 'low' || v === 'medium' || v === 'high' ? v : null;
  } catch {
    return null;   // private mode, storage disabled — not worth failing over
  }
}

export function storeTier(tier: QualityTier): void {
  try {
    localStorage.setItem(STORAGE_KEY, tier);
  } catch {
    /* ignore */
  }
}
