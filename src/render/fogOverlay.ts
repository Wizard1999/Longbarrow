import * as THREE from 'three';
import { terrainHeightAt } from '../sim/terrain';
import type { FogOfWarField } from '../ui/fogOfWar';
import type { VisibilityController } from '../ui/visibility';

export interface FogOverlay {
  update: () => void;
  dispose: () => void;
}

/**
 * Battlefield fog as one terrain-following sheet sampling a fog texture.
 *
 * This replaces a grid of instanced quads (B-004). That approach put a visible
 * checkerboard over painterly terrain, and the fix is not a finer grid — more,
 * smaller squares are still squares. The concealment field is genuinely coarse;
 * what has to change is that it is *sampled* rather than *drawn*, so linear
 * filtering plus a smoothstep turns cell boundaries into gradients.
 *
 * It is also cheaper: one draw call and a few-kilobyte texture upload per frame,
 * against up to a couple of thousand instanced quads before.
 *
 * The mesh follows terrain height because a flat sheet would sink into hills and
 * float over valleys. Vertices are displaced once at construction — fog moves,
 * terrain does not.
 */

/** Fogged, explored and clear as sampled coverage values (see `FogOfWarField.coverage`). */
const FOG_SHADER = {
  vertex: /* glsl */`
    varying vec2 vFogUv;
    void main() {
      vFogUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragment: /* glsl */`
    uniform sampler2D uCoverage;
    uniform vec3 uUnexplored;
    uniform vec3 uExplored;
    uniform float uUnexploredOpacity;
    uniform float uExploredOpacity;
    varying vec2 vFogUv;

    void main() {
      float c = texture2D(uCoverage, vFogUv).r;

      // Two bands, both smoothed: 0 -> 0.5 fades unexplored into the explored
      // veil, 0.5 -> 1 fades that veil out entirely. Deliberately smoothstep
      // rather than linear so the midpoint of a cell reads as flat cover and
      // only the boundaries between cells carry the gradient.
      float toExplored = smoothstep(0.0, 0.5, c);
      float toClear = smoothstep(0.5, 1.0, c);

      vec3 tint = mix(uUnexplored, uExplored, toExplored);
      float alpha = mix(uUnexploredOpacity, uExploredOpacity, toExplored) * (1.0 - toClear);
      if (alpha < 0.004) discard;
      gl_FragColor = vec4(tint, alpha);
    }
  `,
};

export function createFogOverlay(
  scene: THREE.Scene,
  fog: FogOfWarField,
  visibility: VisibilityController,
): FogOverlay {
  const { bounds } = fog.boundary;

  // One byte per cell, uploaded each frame. R8 keeps the upload to ~2 KB.
  const buffer = new Uint8Array(fog.coverageLength);
  const coverage = new THREE.DataTexture(buffer, fog.columns, fog.rows, THREE.RedFormat);
  // Linear filtering is the entire fix: it is what interpolates between cells.
  coverage.minFilter = THREE.LinearFilter;
  coverage.magFilter = THREE.LinearFilter;
  // Clamp, so sampling at the sheet's rim does not wrap fog from the far side.
  coverage.wrapS = THREE.ClampToEdgeWrapping;
  coverage.wrapT = THREE.ClampToEdgeWrapping;
  coverage.needsUpdate = true;

  // Built by hand rather than with PlaneGeometry so the UV/world mapping is
  // explicit — a rotated plane's v axis runs against +Z, which is a silent way
  // to get fog mirrored against the field it is meant to represent.
  const segments = Math.max(fog.columns, fog.rows);
  const positions = new Float32Array((segments + 1) * (segments + 1) * 3);
  const uvs = new Float32Array((segments + 1) * (segments + 1) * 2);
  const indices: number[] = [];

  for (let row = 0; row <= segments; row++) {
    for (let col = 0; col <= segments; col++) {
      const u = col / segments;
      const v = row / segments;
      const x = bounds.minX + u * bounds.width;
      const z = bounds.minZ + v * bounds.depth;
      const i = row * (segments + 1) + col;
      positions[i * 3] = x;
      // Lifted clear of the ground so it never z-fights the terrain mesh.
      positions[i * 3 + 1] = terrainHeightAt(x, z) + 0.16;
      positions[i * 3 + 2] = z;
      uvs[i * 2] = u;
      uvs[i * 2 + 1] = v;
    }
  }
  for (let row = 0; row < segments; row++) {
    for (let col = 0; col < segments; col++) {
      const a = row * (segments + 1) + col;
      const b = a + 1;
      const c = a + segments + 1;
      const d = c + 1;
      indices.push(a, c, b, b, c, d);
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  geometry.setIndex(indices);

  const material = new THREE.ShaderMaterial({
    uniforms: {
      uCoverage: { value: coverage },
      // Deep violet-blue, never black: D-005 is explicit that shadow shifts hue
      // rather than going to zero, and black fog reads as a missing texture.
      uUnexplored: { value: new THREE.Color(0x141a2e) },
      // Explored-but-unseen: a cooler, lighter veil over remembered ground, so
      // the two states stay legible at a glance.
      uExplored: { value: new THREE.Color(0x2a2b46) },
      uUnexploredOpacity: { value: 0.93 },
      uExploredOpacity: { value: 0.46 },
    },
    vertexShader: FOG_SHADER.vertex,
    fragmentShader: FOG_SHADER.fragment,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
  });

  const sheet = new THREE.Mesh(geometry, material);
  sheet.renderOrder = 20;
  // The sheet spans the whole board; culling it by its own bounds is pointless
  // and goes wrong at extreme camera angles.
  sheet.frustumCulled = false;
  scene.add(sheet);

  function update(): void {
    const active = visibility.mode === 'player';
    sheet.visible = active;
    if (!active) return;
    fog.coverage(buffer);
    coverage.needsUpdate = true;
  }

  return {
    update,
    dispose() {
      scene.remove(sheet);
      geometry.dispose();
      material.dispose();
      coverage.dispose();
    },
  };
}
