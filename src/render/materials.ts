import * as THREE from 'three';
import { createPainterlyMaterial } from './painterly';
import { PALETTE } from './palette';
import type { HuePath } from './palette';
import type { Team } from '../core/types';

/**
 * Shared painterly materials, cached by role.
 *
 * The cache is the whole point. `createPainterlyMaterial` builds a
 * `ShaderMaterial`, and Three compiles a shader program per distinct material —
 * so creating one per unit would mean 100+ compiles during a battle, stalling
 * the frame exactly when the game is busiest. That would break the 100-unit
 * performance target (D-006) in the most visible way possible.
 *
 * Sharing is safe here because these materials carry no per-instance state:
 * position and orientation live on the mesh, and the only per-object variation
 * we need is team, which is a cache key rather than a uniform.
 *
 * Colour policy (§8.8): Cohort bodies are bone-pale fossil stone, never
 * team-coloured plastic. Team readability comes from the warm internal glow and
 * the existing selection/squad rings, not from painting the whole unit blue.
 * The rival is the same silhouette in a warmer, browner bone — "still clearly
 * the same civilisation, just a different force".
 */

const cache = new Map<string, THREE.ShaderMaterial>();

function shared(key: string, path: HuePath, opts: Parameters<typeof createPainterlyMaterial>[1] = {}): THREE.ShaderMaterial {
  const hit = cache.get(key);
  if (hit) return hit;
  const mat = createPainterlyMaterial(path, opts);
  cache.set(key, mat);
  return mat;
}

const boneFor = (team: Team): HuePath => (team === 'player' ? PALETTE.bone : PALETTE.boneRival);

/** Fossil stone — unit and building bodies. */
export function boneMaterial(team: Team): THREE.ShaderMaterial {
  return shared(`bone:${team}`, boneFor(team), { soft: 0.13, rim: 0.6, jitter: 0.04 });
}

/** Paler trim: heads, staves, shields. Reads as worn-smooth bone. */
export function trimMaterial(team: Team): THREE.ShaderMaterial {
  const base = boneFor(team);
  return shared(`trim:${team}`, { shade: base.mid, mid: base.lit, lit: PALETTE.bone.lit },
    { soft: 0.16, rim: 0.7, jitter: 0.03 });
}

/**
 * The "still faintly alive" glow (§8.8) — warm gold for the player, warmer
 * amber for the rival. Never red, never hard-edged.
 */
export function glowMaterial(team: Team): THREE.ShaderMaterial {
  const path: HuePath = team === 'player'
    ? { shade: new THREE.Color(0xb8791f), mid: new THREE.Color(0xffcc55), lit: new THREE.Color(0xfff3d0) }
    : { shade: new THREE.Color(0xb3502a), mid: new THREE.Color(0xff8a55), lit: new THREE.Color(0xffe0c8) };
  // Ambient lifted so the core reads as emitting rather than merely lit.
  return shared(`glow:${team}`, path, { soft: 0.3, rim: 0.9, jitter: 0, ambient: 2.4 });
}

/** Moss and lichen gathering in the seams — a real material, not a decal. */
export function mossMaterial(): THREE.ShaderMaterial {
  return shared('moss', PALETTE.moss, { soft: 0.2, rim: 0.35, jitter: 0.08 });
}

/** The gatherable resource. Violet, never teal (D-025). */
export function legacyMaterial(): THREE.ShaderMaterial {
  return shared('legacy', PALETTE.legacy, { soft: 0.26, rim: 1.0, jitter: 0.02, ambient: 1.8 });
}

export function rockMaterial(): THREE.ShaderMaterial {
  return shared('rock', PALETTE.rock, { soft: 0.12, rim: 0.4, jitter: 0.06 });
}

export function barkMaterial(): THREE.ShaderMaterial {
  return shared('bark', PALETTE.bark, { soft: 0.15, rim: 0.4, jitter: 0.06 });
}

export function leafMaterial(): THREE.ShaderMaterial {
  return shared('leaf', PALETTE.leaf, { soft: 0.22, rim: 0.5, jitter: 0.07 });
}

/** How many distinct shader programs the painterly set costs. Used by tests to
 *  guard against per-instance material creation creeping back in. */
export function sharedMaterialCount(): number {
  return cache.size;
}
