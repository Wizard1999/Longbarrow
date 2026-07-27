/**
 * Replay cinematic-director policy.
 *
 * This module is intentionally simulation-agnostic. The deterministic replay
 * or event-observation layer emits plain ReplayEvent records; the director
 * ranks them and decides whether a camera handoff is justified. Rendering and
 * camera interpolation remain outside the simulation.
 */

export type ReplayEventKind =
  | 'battle-start'
  | 'base-breach'
  | 'structure-destroyed'
  | 'high-value-unit-died'
  | 'relic-discovered'
  | 'territory-swing'
  | 'mycora-surge'
  | 'resource-swing'
  | 'match-point'
  | 'match-ended';

export interface ReplayEvent {
  id: string;
  tick: number;
  kind: ReplayEventKind;
  x: number;
  z: number;
  /** Relative importance supplied by the event observer, normally 0..1. */
  magnitude: number;
  /** Optional team associated with the event. */
  team?: number;
  /** Optional entity IDs a follow camera may frame. */
  subjects?: number[];
}

export interface DirectorState {
  currentEventId?: string;
  shotStartedTick: number;
  lastSwitchTick: number;
  manualOverrideUntilTick: number;
}

export interface DirectorPolicy {
  minimumScore: number;
  minimumShotTicks: number;
  switchCooldownTicks: number;
  manualOverrideTicks: number;
  distancePenaltyPerWorldUnit: number;
}

export const DEFAULT_DIRECTOR_POLICY: DirectorPolicy = {
  minimumScore: 35,
  minimumShotTicks: 90,
  switchCooldownTicks: 45,
  manualOverrideTicks: 180,
  distancePenaltyPerWorldUnit: 0.08,
};

const KIND_WEIGHT: Record<ReplayEventKind, number> = {
  'battle-start': 45,
  'base-breach': 80,
  'structure-destroyed': 70,
  'high-value-unit-died': 64,
  'relic-discovered': 50,
  'territory-swing': 56,
  'mycora-surge': 52,
  'resource-swing': 34,
  'match-point': 88,
  'match-ended': 100,
};

export interface DirectorContext {
  tick: number;
  cameraX: number;
  cameraZ: number;
  state: DirectorState;
  policy?: DirectorPolicy;
}

export interface RankedReplayEvent {
  event: ReplayEvent;
  score: number;
}

export function scoreReplayEvent(
  event: ReplayEvent,
  cameraX: number,
  cameraZ: number,
  policy: DirectorPolicy = DEFAULT_DIRECTOR_POLICY,
): number {
  const magnitude = Math.max(0, Math.min(1, event.magnitude));
  const distance = Math.hypot(event.x - cameraX, event.z - cameraZ);
  return KIND_WEIGHT[event.kind] + magnitude * 35 - distance * policy.distancePenaltyPerWorldUnit;
}

export function rankReplayEvents(events: readonly ReplayEvent[], context: DirectorContext): RankedReplayEvent[] {
  const policy = context.policy ?? DEFAULT_DIRECTOR_POLICY;
  return events
    .map((event) => ({
      event,
      score: scoreReplayEvent(event, context.cameraX, context.cameraZ, policy),
    }))
    .sort((a, b) => b.score - a.score || a.event.tick - b.event.tick || a.event.id.localeCompare(b.event.id));
}

/**
 * Select the next event the replay camera should show, or undefined when the
 * current shot/manual camera should be preserved.
 */
export function chooseDirectorEvent(
  events: readonly ReplayEvent[],
  context: DirectorContext,
): RankedReplayEvent | undefined {
  const policy = context.policy ?? DEFAULT_DIRECTOR_POLICY;
  const { state, tick } = context;

  if (tick < state.manualOverrideUntilTick) return undefined;
  if (state.currentEventId && tick - state.shotStartedTick < policy.minimumShotTicks) return undefined;
  if (tick - state.lastSwitchTick < policy.switchCooldownTicks) return undefined;

  const best = rankReplayEvents(events, context)[0];
  if (!best || best.score < policy.minimumScore) return undefined;
  if (best.event.id === state.currentEventId) return undefined;
  return best;
}

export function beginManualCameraOverride(
  state: DirectorState,
  tick: number,
  policy: DirectorPolicy = DEFAULT_DIRECTOR_POLICY,
): DirectorState {
  return {
    ...state,
    manualOverrideUntilTick: tick + policy.manualOverrideTicks,
  };
}
