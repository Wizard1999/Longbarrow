import * as THREE from 'three';

/**
 * The painterly palette (design doc §1, §8.8, §10.1 — "Ghibli-influenced,
 * warm painterly lighting").
 *
 * The load-bearing idea, taken from the designer's reference scene: a surface
 * is not one colour lit and darkened. It is a **hue path** — three distinct
 * colours for shade, midtone and light — that the shading model walks along.
 * Shadows shift hue instead of going black, which is the single biggest
 * difference between "stylised" and "3D render with the lights turned down".
 */
export interface HuePath {
  shade: THREE.Color;
  mid: THREE.Color;
  lit: THREE.Color;
}

const c = (hex: number) => new THREE.Color(hex);

/** Cool violet-green shade -> saturated mid -> warm sunlit tip. */
export const PALETTE = {
  grass: { shade: c(0x3f5d4a), mid: c(0x5f9147), lit: c(0xa8c85c) },
  rock: { shade: c(0x4d4f52), mid: c(0x83837c), lit: c(0xc3bda9) },
  bark: { shade: c(0x3d2e24), mid: c(0x6b4a2f), lit: c(0x9c7746) },
  leaf: { shade: c(0x2f5535), mid: c(0x4f8f3d), lit: c(0x9ccc5a) },

  // Cohort: bone-pale fossil stone, never grey machinery (§8.8).
  bone: { shade: c(0x6d6a5f), mid: c(0xbdb7a2), lit: c(0xf3ecd8) },
  boneRival: { shade: c(0x6b5148), mid: c(0xb69184), lit: c(0xe8cfc0) },
  moss: { shade: c(0x33502f), mid: c(0x5f8a45), lit: c(0x9ec464) },

  /**
   * The gatherable resource — "Legacy" in the vocabulary of D-021: understanding
   * inherited from a dead civilization, not a mineral.
   *
   * Violet, deliberately, and specifically NOT teal. Teal failed twice over: it
   * reads as StarCraft minerals, which §8.8 spends its length ruling out, and it
   * is Conclave's colour — Water — so the universal resource was quietly wearing
   * one race's identity. Violet is claimed by none of the four elements (bone/
   * gold, green, blue, stone), sits opposite the warm sun so it reads clearly
   * against sunlit grass, and says "precious and old" rather than "ore".
   */
  legacy: { shade: c(0x3b2a55), mid: c(0xb98ad9), lit: c(0xf0dcff) },

  teamPlayer: { shade: c(0x1e2f6b), mid: c(0x3b5bdb), lit: c(0x8fb2ff) },
  teamRival: { shade: c(0x5c1a1a), mid: c(0xb02e2e), lit: c(0xff8a7a) },
} as const satisfies Record<string, HuePath>;

/** Sun, sky and bounce. Warm key against a cool sky fill is what makes the
 *  midday read as golden rather than clinical. */
export const LIGHT = {
  sun: c(0xffd9a0),
  sky: c(0xbcd9f2),
  ground: c(0x7a6a44),
  /** Direction *to* the sun. Low enough to throw long shapes. */
  sunDir: new THREE.Vector3(0.42, 0.68, 0.3).normalize(),
  fog: c(0xcfe4f0),
  background: c(0xa8d3e8),
};
