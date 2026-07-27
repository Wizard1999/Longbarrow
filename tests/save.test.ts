import { describe, expect, it } from 'vitest';
import { createWorld, simStep } from '../src/sim/world';
import { buildTestMap, MAP_VERSION } from '../src/sim/map';
import { hash } from '../src/sim/snapshot';
import {
  SAVE_VERSION, checkSave, createSave, loadSave, parseSave, serializeSave,
} from '../src/sim/save';

describe('save files', () => {
  it('round-trips the complete simulation state', () => {
    const source = buildTestMap(createWorld(1234));
    for (let i = 0; i < 50; i++) simStep(source);
    const encoded = serializeSave(createSave(source, '2026-07-27T00:00:00.000Z'));
    const parsed = parseSave(encoded);
    const destination = buildTestMap(createWorld(9999));

    loadSave(destination, parsed);

    expect(hash(destination)).toBe(hash(source));
    expect(parsed.createdAt).toBe('2026-07-27T00:00:00.000Z');
    expect(parsed.tick).toBe(source.tick);
  });

  it('rejects incompatible save and map versions', () => {
    const world = buildTestMap(createWorld(7));
    const save = createSave(world, '2026-07-27T00:00:00.000Z');
    expect(checkSave({ ...save, version: SAVE_VERSION + 1 }).ok).toBe(false);
    expect(checkSave({ ...save, mapVersion: MAP_VERSION + 1 }).ok).toBe(false);
  });

  it('rejects tampered world state', () => {
    const world = buildTestMap(createWorld(7));
    const save = createSave(world, '2026-07-27T00:00:00.000Z');
    save.world.resources.player += 1;
    const result = checkSave(save);
    expect(result.ok).toBe(false);
    expect(result.reason).toContain('hash mismatch');
  });

  it('rejects mismatched tick metadata', () => {
    const world = buildTestMap(createWorld(7));
    const save = createSave(world, '2026-07-27T00:00:00.000Z');
    expect(checkSave({ ...save, tick: save.tick + 1 }).ok).toBe(false);
  });
});
