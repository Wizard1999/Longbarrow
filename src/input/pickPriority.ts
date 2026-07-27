export type PickKind = 'unit' | 'site' | 'building';

export interface PickCandidate<T = unknown> {
  kind: PickKind;
  distance: number;
  value: T;
}

const PRIORITY: Record<PickKind, number> = {
  unit: 3,
  site: 2,
  building: 1,
};

/**
 * Resolve overlapping RTS click targets without letting a large base mesh steal
 * every click from a unit standing on its doorstep. Only candidates close to
 * the front-most hit are considered; within that visual layer, controllable
 * units win over sites and buildings.
 */
export function resolvePick<T>(
  candidates: readonly PickCandidate<T>[], distanceSlack = 0.55,
): PickCandidate<T> | null {
  const finite = candidates.filter(c => Number.isFinite(c.distance) && c.distance >= 0);
  if (!finite.length) return null;
  const nearest = Math.min(...finite.map(c => c.distance));
  return [...finite]
    .filter(c => c.distance <= nearest + distanceSlack)
    .sort((a, b) => PRIORITY[b.kind] - PRIORITY[a.kind] || a.distance - b.distance)[0] ?? null;
}
