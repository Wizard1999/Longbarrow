import * as THREE from 'three';
import { TERRAIN_SIZE, terrainHeightAt } from '../sim/terrain';

/** Samples sim/terrain.ts rather than duplicating the height formula — the two
 *  drifting apart was a real Phase 0 bug (06 §6). */
export function buildTerrainMesh(scene: THREE.Scene): THREE.Mesh {
  const seg = 56;
  const geo = new THREE.PlaneGeometry(TERRAIN_SIZE, TERRAIN_SIZE, seg, seg);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) pos.setY(i, terrainHeightAt(pos.getX(i), pos.getZ(i)));
  geo.computeVertexNormals();
  const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({
    color: 0x6fae4a, flatShading: true, roughness: 1,
  }));
  mesh.receiveShadow = true;
  scene.add(mesh);
  return mesh;
}
