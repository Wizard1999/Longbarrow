import { describe, expect, it } from 'vitest';
import { createWorld, simStep } from '../src/sim/world';
import { buildTestMap } from '../src/sim/map';
import { hash } from '../src/sim/snapshot';
import { Recorder, playback } from '../src/sim/replay';
import { ReplayTimeline } from '../src/replay/timeline';

function recordedReplay() {
  const world = buildTestMap(createWorld(2468, 9, 1357));
  const recorder = new Recorder(2468, 9, 1357, 'none');
  const unit = world.units.find(candidate => candidate.team === 'player');
  if (!unit) throw new Error('test map has no player unit');

  recorder.apply(world, { t: 'move', units: [unit.id], x: 8, z: -3 });
  for (let i = 0; i < 780; i++) simStep(world);
  return recorder.finish(world);
}

describe('ReplayTimeline', () => {
  it('matches correctness-baseline playback at arbitrary ticks', () => {
    const replay = recordedReplay();
    const timeline = new ReplayTimeline(replay, 120);

    for (const tick of [0, 1, 119, 120, 121, 377, 779, 780]) {
      expect(hash(timeline.seek(tick))).toBe(hash(playback(replay, tick)));
    }
  });

  it('creates reusable keyframes while seeking forward', () => {
    const timeline = new ReplayTimeline(recordedReplay(), 100);
    timeline.seek(350);
    expect(timeline.cachedKeyframeTicks()).toEqual([0, 100, 200, 300]);

    timeline.seek(250);
    expect(timeline.cachedKeyframeTicks()).toEqual([0, 100, 200, 300]);
  });

  it('clamps seeks to the recorded range', () => {
    const replay = recordedReplay();
    const timeline = new ReplayTimeline(replay, 100);
    expect(hash(timeline.seek(-50))).toBe(hash(playback(replay, 0)));
    expect(hash(timeline.seek(999999))).toBe(hash(playback(replay, replay.endTick ?? 0)));
  });

  it('rejects invalid keyframe intervals', () => {
    expect(() => new ReplayTimeline(recordedReplay(), 0)).toThrow(/positive integer/);
  });
});
