import { describe, expect, it } from 'vitest';
import {
  beginManualCameraOverride,
  chooseDirectorEvent,
  DEFAULT_DIRECTOR_POLICY,
  rankReplayEvents,
  type DirectorContext,
  type ReplayEvent,
} from '../src/replay/director';
import { must } from './helpers';

const baseContext = (tick = 500): DirectorContext => ({
  tick,
  cameraX: 0,
  cameraZ: 0,
  state: {
    shotStartedTick: 0,
    lastSwitchTick: 0,
    manualOverrideUntilTick: 0,
  },
});

const event = (overrides: Partial<ReplayEvent>): ReplayEvent => ({
  id: 'event',
  tick: 490,
  kind: 'battle-start',
  x: 0,
  z: 0,
  magnitude: 0.5,
  ...overrides,
});

describe('replay cinematic director', () => {
  it('prioritises a match-ending event over an ordinary nearby battle', () => {
    const ranked = rankReplayEvents([
      event({ id: 'battle', kind: 'battle-start', magnitude: 1 }),
      event({ id: 'end', kind: 'match-ended', magnitude: 0.2, x: 30 }),
    ], baseContext());
    expect(must(ranked[0]).event.id).toBe('end');
  });

  it('uses distance as a tie breaker without allowing it to erase major event importance', () => {
    const ranked = rankReplayEvents([
      event({ id: 'near', kind: 'territory-swing', x: 2 }),
      event({ id: 'far', kind: 'territory-swing', x: 100 }),
    ], baseContext());
    expect(must(ranked[0]).event.id).toBe('near');
  });

  it('does not interrupt a shot before its minimum duration', () => {
    const context = baseContext(100);
    context.state.currentEventId = 'current';
    context.state.shotStartedTick = 50;
    expect(chooseDirectorEvent([event({ id: 'new', kind: 'match-ended' })], context)).toBeUndefined();
  });

  it('respects manual camera override', () => {
    const context = baseContext(500);
    context.state = beginManualCameraOverride(context.state, 450);
    expect(context.state.manualOverrideUntilTick).toBe(450 + DEFAULT_DIRECTOR_POLICY.manualOverrideTicks);
    expect(chooseDirectorEvent([event({ kind: 'match-ended' })], context)).toBeUndefined();
  });

  it('selects a sufficiently important event after cooldowns expire', () => {
    const choice = chooseDirectorEvent([
      event({ id: 'breach', kind: 'base-breach', magnitude: 0.9 }),
    ], baseContext());
    expect(choice?.event.id).toBe('breach');
  });
});
