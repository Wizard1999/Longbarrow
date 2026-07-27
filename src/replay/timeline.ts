import type { World } from '../core/types';
import { enableAi } from '../sim/ai';
import { buildTestMap } from '../sim/map';
import { checkReplay, dispatch, type Command, type Replay } from '../sim/replay';
import { restore, snapshot, type Snapshot } from '../sim/snapshot';
import { createWorld, simStep } from '../sim/world';

export const DEFAULT_KEYFRAME_INTERVAL = 300;

/**
 * Deterministic replay seeking with lazily-created simulation keyframes.
 *
 * The first seek may still simulate from tick zero. Every interval crossed is
 * cached, so later timeline scrubs restore the nearest prior keyframe and only
 * simulate the remaining short span. This class owns its scratch world and
 * never mutates the live gameplay world until the caller explicitly restores
 * the returned snapshot.
 */
export class ReplayTimeline {
  private readonly commandsByTick = new Map<number, Command[]>();
  private readonly keyframes = new Map<number, Snapshot>();
  private readonly scratch: World;

  readonly endTick: number;

  constructor(
    readonly replay: Replay,
    readonly keyframeInterval = DEFAULT_KEYFRAME_INTERVAL,
  ) {
    const check = checkReplay(replay);
    if (!check.ok) throw new Error(`cannot create replay timeline: ${check.reason}`);
    if (!Number.isInteger(keyframeInterval) || keyframeInterval < 1) {
      throw new Error('keyframe interval must be a positive integer');
    }

    for (const { tick, cmd } of replay.commands) {
      const list = this.commandsByTick.get(tick);
      if (list) list.push(cmd);
      else this.commandsByTick.set(tick, [cmd]);
    }

    const base = buildTestMap(createWorld(replay.seed, replay.startHour, replay.mapSeed));
    this.scratch = replay.opponent === 'standardAi' ? enableAi(base) : base;
    this.keyframes.set(0, snapshot(this.scratch));
    this.endTick = replay.endTick ?? Math.max(0, ...replay.commands.map(entry => entry.tick + 1));
  }

  /** Return an isolated snapshot of the replay state at the requested tick. */
  seek(targetTick: number): Snapshot {
    const target = Math.max(0, Math.min(this.endTick, Math.floor(targetTick)));
    const startTick = this.nearestKeyframeAtOrBefore(target);
    const start = this.keyframes.get(startTick);
    if (!start) throw new Error(`missing replay keyframe at tick ${startTick}`);
    restore(this.scratch, start);

    while (this.scratch.tick < target) {
      const due = this.commandsByTick.get(this.scratch.tick);
      if (due) for (const command of due) dispatch(this.scratch, command);
      simStep(this.scratch);
      if (this.scratch.tick % this.keyframeInterval === 0) {
        this.keyframes.set(this.scratch.tick, snapshot(this.scratch));
      }
    }

    return snapshot(this.scratch);
  }

  cachedKeyframeTicks(): number[] {
    return [...this.keyframes.keys()].sort((a, b) => a - b);
  }

  private nearestKeyframeAtOrBefore(targetTick: number): number {
    let nearest = 0;
    for (const tick of this.keyframes.keys()) {
      if (tick <= targetTick && tick > nearest) nearest = tick;
    }
    return nearest;
  }
}
