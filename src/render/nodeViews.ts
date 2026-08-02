import * as THREE from 'three';
import type { EntityId, World } from '../core/types';
import { GOLDEN_ANGLE } from '../core/loop';
import { terrainHeightAt } from '../sim/terrain';
import type { VisibilityController } from '../ui/visibility';
import { legacyMaterial, resourceMaterial } from './materials';

/** Also used for the shard a worker carries on the return trip, so the thing
 *  being hauled is visibly the thing that came out of the node. */
export const legacyMat = legacyMaterial();

/** Resource nodes: crystalline shards coloured by which resource they yield, so
 *  a scarce node is identifiable across the board without a UI overlay. They
 *  visibly shrink as they deplete, for the same reason. */
export function buildNodeViews(scene: THREE.Scene, world: World): Map<EntityId, THREE.Group> {
  const nodeViews = new Map<EntityId, THREE.Group>();
  for (const n of world.nodes) {
    const g = new THREE.Group();
    for (let i = 0; i < 5; i++) {
      const a = i * GOLDEN_ANGLE;
      const h = 0.9 + (i % 3) * 0.45;
      const shard = new THREE.Mesh(new THREE.ConeGeometry(0.34, h, 5), resourceMaterial(n.resource));
      shard.position.set(Math.cos(a) * 0.62, h / 2, Math.sin(a) * 0.62);
      shard.rotation.set(Math.cos(a) * 0.22, a, Math.sin(a) * 0.22);
      shard.castShadow = true;
      g.add(shard);
    }
    g.position.set(n.x, terrainHeightAt(n.x, n.z), n.z);
    g.userData = { nodeId: n.id };
    scene.add(g);
    nodeViews.set(n.id, g);
  }
  return nodeViews;
}

export function syncNodeViews(
  world: World, nodeViews: Map<EntityId, THREE.Group>, visibility: VisibilityController,
): void {
  for (const n of world.nodes) {
    const v = nodeViews.get(n.id);
    if (!v) continue;
    const frac = n.maxAmount > 0 ? n.amount / n.maxAmount : 0;
    const s = 0.28 + 0.72 * frac;
    v.scale.set(s, s, s);
    v.visible = n.amount > 0 && visibility.resourceVisible(n.x, n.z);
  }
}
