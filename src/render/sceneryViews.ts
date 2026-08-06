import * as THREE from 'three';
import type { World } from '../core/types';
import { terrainHeightAt } from '../sim/terrain';
import { QUALITY } from './quality';
import type { QualityTier } from './quality';
import { lodForDistance } from './lod';
import { barkMaterial, leafMaterial, rockMaterial } from './materials';

export interface SceneryViews {
  root: THREE.Group;
  sync(camera: THREE.Camera, qualityTier: QualityTier): void;
}

export function buildSceneryViews(
  scene: THREE.Scene, world: World, tier: QualityTier,
): SceneryViews {
  const root = new THREE.Group();
  root.name = 'scenery-root';
  scene.add(root);

  // QUALITY.sceneryDetail was declared in the tier table and consumed nowhere,
  // so rocks and trees were identical at every quality. Same bug bodySegments
  // had; spent here.
  const detail = QUALITY[tier].sceneryDetail;
  const coneSeg = 6 + detail * 3;

  const rockMat = rockMaterial();
  const trunkMat = barkMaterial();
  const leafMat = leafMaterial();

  for (const s of world.scenery) {
    const y = terrainHeightAt(s.x, s.z);
    if (s.kind === 'rock') {
      const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(s.scale, detail), rockMat);
      rock.position.set(s.x, y + s.scale * 0.6, s.z);
      rock.rotation.set(s.spin, s.spin * 1.7, s.spin * 0.4);
      rock.castShadow = true;
      root.add(rock);
    } else {
      const tree = new THREE.Group();
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.22, 1.4, coneSeg), trunkMat);
      trunk.position.y = 0.7;
      const leaves = new THREE.Mesh(new THREE.ConeGeometry(1.1, 2.0, coneSeg + 1), leafMat);
      leaves.position.y = 2.1;
      trunk.castShadow = true;
      leaves.castShadow = true;
      tree.add(trunk, leaves);
      tree.position.set(s.x, y, s.z);
      tree.rotation.y = s.spin;
      root.add(tree);
    }
  }

  return {
    root,
    sync(camera, qualityTier) {
      const lod = lodForDistance(camera.position.length(), qualityTier);
      root.visible = lod === 'close' || lod === 'tactical';
    },
  };
}
