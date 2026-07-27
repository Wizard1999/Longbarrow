import { describe, expect, it } from 'vitest';
import { createWorld, simStep } from '../src/sim/world';
import { MAP_VERSION, buildTestMap } from '../src/sim/map';
import { hash } from '../src/sim/snapshot';
import { REPLAY_VERSION, Recorder, checkReplay, playback } from '../src/sim/replay';
import type { World } from '../src/core/types';

/**
 * Map seeds are separate from match seeds so that a map can be reproduced,
 * shared and browsed independently of any match played on it.
 * See docs/DECISIONS.md D-017.
 */

const mapOf = (w: World) =>
  JSON.stringify({
    scenery: w.scenery,
    nodes: w.nodes.map(n => [n.x, n.z, n.maxAmount]),
    buildings: w.buildings.map(b => [b.type, b.team, b.x, b.z]),
  });

const build = (matchSeed: number, mapSeed: number) =>
  buildTestMap(createWorld(matchSeed, 8, mapSeed));

describe('map seeds are reproducible', () => {
  it('the same map seed always produces the same map', () => {
    expect(mapOf(build(1, 555))).toBe(mapOf(build(1, 555)));
  });

  it('different map seeds produce different maps', () => {
    expect(mapOf(build(1, 555))).not.toBe(mapOf(build(1, 999)));
  });

  it('the map does not depend on the match seed', () => {
    // The property the map browser needs: pick a map, play any match on it.
    expect(mapOf(build(1, 555))).toBe(mapOf(build(2, 555)));
    expect(mapOf(build(123456, 555))).toBe(mapOf(build(7, 555)));
  });

  it('map seed defaults to the match seed when unspecified', () => {
    expect(mapOf(buildTestMap(createWorld(42)))).toBe(mapOf(build(42, 42)));
  });
});

describe('generating a map does not disturb the match generator', () => {
  it('match RNG position is identical regardless of map seed', () => {
    // If map generation drew from the match generator, two matches on
    // different maps would diverge for reasons unrelated to play — and
    // previewing a map would corrupt the match played afterwards.
    expect(build(1, 555).rngState).toBe(build(1, 999).rngState);
  });

  it('the match generator is untouched by map generation at all', () => {
    const bare = createWorld(1);
    const built = buildTestMap(createWorld(1, 8, 4242));
    expect(built.rngState).toBe(bare.rngState);
  });

  it('two matches on different maps stay independently deterministic', () => {
    const a1 = build(77, 100); const a2 = build(77, 100);
    for (let i = 0; i < 150; i++) { simStep(a1); simStep(a2); }
    expect(hash(a1)).toBe(hash(a2));
  });
});

describe('map identity is recorded and enforced', () => {
  it('the world carries its map seed and generator version', () => {
    const w = build(1, 555);
    expect(w.mapSeed).toBe(555);
    expect(w.mapVersion).toBe(MAP_VERSION);
  });

  it('map seed is part of the hash', () => {
    // Otherwise a replay could restore onto the wrong terrain and still agree.
    expect(hash(build(1, 555))).not.toBe(hash(build(1, 999)));
  });

  it('replays record the map they were played on', () => {
    const rec = new Recorder(1, 8, 555);
    const r = rec.finish();
    expect(r.mapSeed).toBe(555);
    expect(r.mapVersion).toBe(MAP_VERSION);
    expect(r.version).toBe(REPLAY_VERSION);
  });

  it('replays reproduce the map, not just the match', () => {
    const world = build(1, 4242);
    const rec = new Recorder(1, 8, 4242);
    for (let t = 0; t < 60; t++) {
      if (t === 5) {
        rec.apply(world, { t: 'select', units: world.units.map(u => u.id) });
      }
      simStep(world);
    }
    const replayed = playback(rec.finish(), 60);
    expect(mapOf(replayed)).toBe(mapOf(world));
    expect(hash(replayed)).toBe(hash(world));
  });

  it('rejects a replay built by a different map generator', () => {
    // Changing map generation must not silently replay old matches on new
    // terrain. Explicit rejection beats a plausible wrong answer.
    const r = new Recorder(1, 8, 555).finish();
    const stale = { ...r, mapVersion: MAP_VERSION + 1 };
    expect(checkReplay(stale).ok).toBe(false);
    expect(checkReplay(stale).reason).toContain('map generator');
    expect(() => playback(stale, 10)).toThrow();
  });
});
