import { describe, expect, it } from 'vitest';
import { createWorld, simStep } from '../src/sim/world';
import { enableAi } from '../src/sim/ai';
import { buildTestMap } from '../src/sim/map';
import { hash } from '../src/sim/snapshot';
import { TICK_HZ } from '../src/core/loop';
import { dayHour } from '../src/sim/daynight';
import {
  REPLAY_VERSION, Recorder, checkReplay, parseReplay, playback, serializeReplay, verifyReplay,
} from '../src/sim/replay';
import type { Replay } from '../src/sim/replay';
import type { World } from '../src/core/types';

const SEED = 4242;
const HOUR = 17;

/**
 * Plays a short scripted match through the Recorder, exactly as live play
 * would: commands are applied at a tick, then the tick is stepped.
 */
function playMatch(ticks = 300): { world: World; replay: Replay } {
  const world = buildTestMap(createWorld(SEED, HOUR));
  const rec = new Recorder(SEED, HOUR);

  for (let t = 0; t < ticks; t++) {
    if (t === 3) {
      rec.apply(world, {
        t: 'select',
        units: world.units.filter(u => u.team === 'player').map(u => u.id),
      });
    }
    if (t === 10) {
      const workers = world.units.filter(u => u.team === 'player' && u.gather);
      const node = world.nodes[0];
      if (workers.length && node) {
        rec.apply(world, { t: 'gather', units: workers.map(u => u.id), node: node.id });
      }
    }
    if (t === 40) {
      const base = world.buildings.find(b => b.team === 'player');
      if (base) rec.apply(world, { t: 'train', building: base.id, unit: 'legionnaire' });
    }
    if (t === 80) {
      const fighters = world.units.filter(u => u.team === 'player' && !u.gather);
      if (fighters.length) {
        rec.apply(world, { t: 'formSquad', team: 'player', units: fighters.map(u => u.id), number: 1 });
      }
    }
    if (t === 120) {
      const sq = world.squads[0];
      if (sq) rec.apply(world, { t: 'addChainStep', squad: sq.id, kind: 'move', x: 6, z: -4 });
    }
    if (t === 130) {
      const sq = world.squads[0];
      if (sq) rec.apply(world, { t: 'runChain', squad: sq.id });
    }
    if (t === 200) {
      const fighters = world.units.filter(u => u.team === 'player' && !u.gather);
      if (fighters.length) rec.apply(world, { t: 'move', units: fighters.map(u => u.id), x: -8, z: 5 });
    }
    simStep(world);
  }
  return { world, replay: rec.finish() };
}

describe('recording', () => {
  it('captures the seed, start hour and tick rate', () => {
    const { replay } = playMatch(50);
    expect(replay.seed).toBe(SEED);
    expect(replay.startHour).toBe(HOUR);
    expect(replay.tickRate).toBe(TICK_HZ);
    expect(replay.version).toBe(REPLAY_VERSION);
  });

  it('records commands with the tick they were issued on', () => {
    const { replay } = playMatch(50);
    expect(replay.commands.length).toBeGreaterThan(0);
    expect(replay.commands[0]?.tick).toBe(3);
    expect(replay.commands[0]?.cmd.t).toBe('select');
    // Ticks must be non-decreasing, or playback ordering is meaningless.
    const ticks = replay.commands.map(c => c.tick);
    expect([...ticks].sort((a, b) => a - b)).toEqual(ticks);
  });
});

describe('playback', () => {
  it('reproduces the recorded match exactly', () => {
    const { world, replay } = playMatch();
    const replayed = playback(replay, 300);
    expect(hash(replayed)).toBe(hash(world));
  });

  it('reproduces it at every intermediate tick, not just the end', () => {
    // A replay that only agrees at the final tick could be right by luck.
    const { replay } = playMatch();
    for (const stop of [17, 45, 99, 137, 210, 300]) {
      const live = buildTestMap(createWorld(SEED, HOUR));
      const rec = new Recorder(SEED, HOUR);
      for (let t = 0; t < stop; t++) {
        for (const { tick, cmd } of replay.commands) if (tick === t) rec.apply(live, cmd);
        simStep(live);
      }
      expect(hash(playback(replay, stop))).toBe(hash(live));
    }
  });

  it('survives a serialize / parse round trip', () => {
    const { world, replay } = playMatch();
    const restored = parseReplay(serializeReplay(replay));
    expect(hash(playback(restored, 300))).toBe(hash(world));
  });

  it('restores the correct time of day', () => {
    const { world, replay } = playMatch(120);
    const replayed = playback(replay, 120);
    expect(dayHour(replayed)).toBeCloseTo(dayHour(world), 9);
  });

  it('a replay recorded at a different start hour does not match', () => {
    // Guards the failure mode where startHour is dropped from the format: the
    // sim runs correctly but at the wrong time of day, and nothing complains.
    const { replay } = playMatch(120);
    const wrongHour = playback({ ...replay, startHour: (HOUR + 6) % 24 }, 120);
    expect(hash(wrongHour)).not.toBe(hash(playback(replay, 120)));
  });
});

describe('replay validation', () => {
  it('accepts a replay from this build', () => {
    const { replay } = playMatch(20);
    expect(checkReplay(replay).ok).toBe(true);
  });

  it('rejects a mismatched tick rate rather than playing it wrong', () => {
    const { replay } = playMatch(20);
    const check = checkReplay({ ...replay, tickRate: 20 });
    expect(check.ok).toBe(false);
    expect(check.reason).toContain('20Hz');
    expect(() => playback({ ...replay, tickRate: 20 }, 20)).toThrow();
  });

  it('rejects a replay from a different version', () => {
    const { replay } = playMatch(20);
    expect(checkReplay({ ...replay, version: REPLAY_VERSION + 1 }).ok).toBe(false);
  });
});

describe('commands stay serializable', () => {
  it('every recorded command survives JSON with no loss', () => {
    // The property the whole design depends on. A command carrying a function,
    // a class instance or an entity reference would fail here.
    const { replay } = playMatch();
    expect(JSON.parse(JSON.stringify(replay.commands))).toEqual(replay.commands);
  });
});

describe('live replay integrity', () => {
  it('records AI match setup and verifies an endpoint hash', () => {
    const world = enableAi(buildTestMap(createWorld(SEED, HOUR)));
    const rec = new Recorder(SEED, HOUR, SEED, 'standardAi');
    for (let t = 0; t < 180; t++) {
      if (t === 20) {
        const fighters = world.units.filter(u => u.team === 'player' && !u.gather);
        if (fighters.length) rec.apply(world, { t: 'move', units: fighters.map(u => u.id), x: 9, z: 0 });
      }
      simStep(world);
    }
    const replay = rec.finish(world);
    expect(replay.opponent).toBe('standardAi');
    expect(replay.endTick).toBe(world.tick);
    expect(replay.finalHash).toBe(hash(world));
    expect(verifyReplay(replay)).toEqual({ ok: true });
  });

  it('rejects a tampered endpoint hash', () => {
    const { replay } = playMatch(60);
    const invalid = { ...replay, endTick: 60, finalHash: '00000000' };
    expect(verifyReplay(invalid).ok).toBe(false);
  });

  it('prevents exporting a recording after external state replacement', () => {
    const rec = new Recorder(SEED, HOUR);
    rec.invalidate('save loaded');
    expect(() => rec.finish()).toThrow('save loaded');
  });
});
