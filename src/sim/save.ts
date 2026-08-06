import type { World } from '../core/types';
import { MAP_VERSION } from './map';
import { hash, restore, snapshot } from './snapshot';

/** Bump when the serialized save envelope or required world semantics change. */
// 2: resources became a bag keyed by resource id rather than one number per
// team (D-031). A v1 save would restore a number where the sim expects a bag.
export const SAVE_VERSION = 2;

export interface SaveFile {
  /**
   * On-disk format identifier. Deliberately still `longbarrow-save` after the
   * project was renamed to Greenmantle: this is a file-format magic string,
   * not a display name, and changing it would make every save written before
   * the rename fail to load for no benefit. Format identifiers follow the
   * format's history, not the project's branding.
   */
  kind: 'longbarrow-save';
  version: number;
  createdAt: string;
  mapVersion: number;
  tick: number;
  stateHash: string;
  world: World;
}

export interface SaveCheck {
  ok: boolean;
  reason?: string;
}

/**
 * `createdAt` is supplied by the caller rather than read here.
 *
 * It is pure envelope metadata — written to the file, never read back into the
 * simulation — so determinism is not actually at risk either way. But the
 * "no wall-clock in sim/" rule earns its keep by being absolute: one justified
 * exception is what makes the second, unjustified one look reasonable. The
 * clock lives one layer out, where clocks belong.
 */
export function createSave(world: World, createdAt: string): SaveFile {
  const worldCopy = snapshot(world);
  return {
    kind: 'longbarrow-save',
    version: SAVE_VERSION,
    createdAt,
    mapVersion: world.mapVersion,
    tick: world.tick,
    stateHash: hash(worldCopy),
    world: worldCopy,
  };
}

export function checkSave(save: SaveFile): SaveCheck {
  if (save.kind !== 'longbarrow-save') return { ok: false, reason: 'not a Greenmantle save file' };
  if (save.version !== SAVE_VERSION) {
    return { ok: false, reason: `save version ${save.version}, expected ${SAVE_VERSION}` };
  }
  if (save.mapVersion !== MAP_VERSION || save.world.mapVersion !== MAP_VERSION) {
    return {
      ok: false,
      reason: `save uses map generator v${save.mapVersion}, this build uses v${MAP_VERSION}`,
    };
  }
  if (save.tick !== save.world.tick) return { ok: false, reason: 'save tick metadata does not match world state' };
  const actualHash = hash(save.world);
  if (actualHash !== save.stateHash) {
    return { ok: false, reason: `save state hash mismatch (${actualHash}, expected ${save.stateHash})` };
  }
  return { ok: true };
}

export function serializeSave(save: SaveFile): string {
  return JSON.stringify(save);
}

export function parseSave(text: string): SaveFile {
  const value: unknown = JSON.parse(text);
  if (typeof value !== 'object' || value === null) throw new Error('save file is not an object');
  return value as SaveFile;
}

export function loadSave(world: World, save: SaveFile): void {
  const check = checkSave(save);
  if (!check.ok) throw new Error(`cannot load save: ${check.reason}`);
  restore(world, save.world);
}
