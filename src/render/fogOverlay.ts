import * as THREE from 'three';
import { terrainHeightAt } from '../sim/terrain';
import type { FogOfWarField } from '../ui/fogOfWar';
import type { VisibilityController } from '../ui/visibility';

export interface FogOverlay {
  update: () => void;
  dispose: () => void;
}

/**
 * A lightweight battlefield fog layer built with two instanced meshes rather
 * than thousands of individual objects. The coarse grid intentionally matches
 * softer masks without changing the information policy.
 */
export function createFogOverlay(
  scene: THREE.Scene,
  fog: FogOfWarField,
  visibility: VisibilityController,
): FogOverlay {
  const maxInstances = fog.columns * fog.rows;
  const geometry = new THREE.PlaneGeometry(1, 1);
  geometry.rotateX(-Math.PI / 2);

  const unexplored = new THREE.InstancedMesh(
    geometry,
    // Deep violet-blue, not black. The art direction is explicit that shadow
    // shifts hue rather than going to zero (D-005) -- pure black fog reads as a
    // missing texture and turns the board into hard tiles against the painterly
    // terrain. Slightly under full opacity so the terrain's form still whispers
    // through, which is what stops the fog edge looking like a cut.
    new THREE.MeshBasicMaterial({
      color: 0x141a2e,
      transparent: true,
      opacity: 0.93,
      depthWrite: false,
      side: THREE.DoubleSide,
    }),
    maxInstances,
  );
  const explored = new THREE.InstancedMesh(
    geometry,
    // Explored-but-unseen: a cool violet veil over remembered ground, lighter
    // than unexplored so the two states are legible at a glance.
    new THREE.MeshBasicMaterial({
      color: 0x2a2b46,
      transparent: true,
      opacity: 0.46,
      depthWrite: false,
      side: THREE.DoubleSide,
    }),
    maxInstances,
  );
  unexplored.renderOrder = 20;
  explored.renderOrder = 19;
  unexplored.frustumCulled = false;
  explored.frustumCulled = false;
  scene.add(explored, unexplored);

  const matrix = new THREE.Matrix4();
  const position = new THREE.Vector3();
  const scale = new THREE.Vector3();
  const rotation = new THREE.Quaternion();

  function updateMesh(mesh: THREE.InstancedMesh, cells: ReturnType<FogOfWarField['cells']>, state: 0 | 1): void {
    let count = 0;
    for (const cell of cells) {
      if (cell.state !== state) continue;
      position.set(cell.x, terrainHeightAt(cell.x, cell.z) + 0.16, cell.z);
      scale.set(cell.width * 1.04, 1, cell.depth * 1.04);
      matrix.compose(position, rotation, scale);
      mesh.setMatrixAt(count++, matrix);
    }
    mesh.count = count;
    mesh.instanceMatrix.needsUpdate = true;
  }

  function update(): void {
    const active = visibility.mode === 'player';
    unexplored.visible = active;
    explored.visible = active;
    if (!active) return;
    const cells = fog.cells();
    updateMesh(unexplored, cells, 0);
    updateMesh(explored, cells, 1);
  }

  return {
    update,
    dispose() {
      scene.remove(explored, unexplored);
      geometry.dispose();
      (unexplored.material as THREE.Material).dispose();
      (explored.material as THREE.Material).dispose();
    },
  };
}
