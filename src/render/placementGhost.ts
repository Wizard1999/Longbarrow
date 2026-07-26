import * as THREE from 'three';
import type { BuildingTypeKey, World } from '../core/types';
import { terrainHeightAt } from '../sim/terrain';
import { canPlaceBuilding } from '../sim/construction';

export interface PlacementGhost {
  update: (world: World, type: BuildingTypeKey | null, hit: THREE.Intersection | undefined) => void;
  hide: () => void;
}

export function createPlacementGhost(scene: THREE.Scene): PlacementGhost {
  const mat = new THREE.MeshStandardMaterial({
    color: 0x8effa0, transparent: true, opacity: 0.55, flatShading: true,
  });
  const group = new THREE.Group();
  const body = new THREE.Mesh(new THREE.CylinderGeometry(1.3, 1.6, 1.0, 6), mat);
  body.position.y = 0.5;
  group.add(body);
  const ringGeo = new THREE.RingGeometry(1.35, 1.55, 32);
  ringGeo.rotateX(-Math.PI / 2);
  const ring = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({
    color: 0x8effa0, transparent: true, opacity: 0.8, side: THREE.DoubleSide,
  }));
  ring.position.y = 0.08;
  group.add(ring);
  group.visible = false;
  scene.add(group);

  return {
    update(world, type, hit) {
      if (!type || !hit) { group.visible = false; return; }
      const { x, z } = hit.point;
      const ok = canPlaceBuilding(world, 'player', type, x, z).ok;
      group.position.set(x, terrainHeightAt(x, z), z);
      group.visible = true;
      mat.color.setHex(ok ? 0x8effa0 : 0xff6b6b);
      ring.material.color.setHex(ok ? 0x8effa0 : 0xff6b6b);
    },
    hide() { group.visible = false; },
  };
}
