import * as THREE from 'three';
import { TERRAIN_SIZE, terrainHeightAt } from '../sim/terrain';
import { createPainterlyMaterial } from './painterly';
import { PALETTE } from './palette';
import type { QualitySettings } from './quality';

/** Samples sim/terrain.ts rather than duplicating the height formula — the two
 *  drifting apart was a real Phase 0 bug (06 §6). */
export function buildTerrainMesh(scene: THREE.Scene, q: QualitySettings): THREE.Mesh {
  const seg = q.terrainSegments;
  const geo = new THREE.PlaneGeometry(TERRAIN_SIZE, TERRAIN_SIZE, seg, seg);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) pos.setY(i, terrainHeightAt(pos.getX(i), pos.getZ(i)));
  geo.computeVertexNormals();

  // Smooth-shaded, not faceted: faceting reads as noise once the terrain is
  // this subdivided, and the painterly band jitter already supplies the
  // hand-made edge that flat shading was there to fake.
  const mesh = new THREE.Mesh(geo, createPainterlyMaterial(PALETTE.grass, {
    soft: 0.2,   // ground wants the softest bands — it is the biggest surface
    rim: 0.15,   // almost no rim: ground has no silhouette to catch light
    jitter: 0.07,
  }));
  mesh.receiveShadow = true;
  scene.add(mesh);
  return mesh;
}
