import * as THREE from 'three';
import type { Unit, World } from '../core/types';
import { terrainHeightAt } from '../sim/terrain';

function destinationFor(world: World, unit: Unit): { x: number; z: number } | null {
  if (unit.targetId !== null) {
    const entity = world.units.find(candidate => candidate.id === unit.targetId)
      ?? world.buildings.find(candidate => candidate.id === unit.targetId);
    if (entity) return { x: entity.x, z: entity.z };
  }
  if (unit.target) return unit.target;
  if (unit.gather?.nodeId !== null && unit.gather?.nodeId !== undefined) {
    const node = world.nodes.find(candidate => candidate.id === unit.gather?.nodeId);
    if (node) return { x: node.x, z: node.z };
  }
  if (unit.build?.siteId !== null && unit.build?.siteId !== undefined) {
    const site = world.sites.find(candidate => candidate.id === unit.build?.siteId);
    if (site) return { x: site.x, z: site.z };
  }
  return null;
}

/** Dev-only world overlays. They never mutate simulation state. */
export function createDiagnosticVisuals(scene: THREE.Scene) {
  const orderMaterial = new THREE.LineBasicMaterial({
    color: 0x8de8ff, transparent: true, opacity: 0.8, depthTest: false,
  });
  const orderLines = new THREE.LineSegments(new THREE.BufferGeometry(), orderMaterial);
  orderLines.renderOrder = 80;
  orderLines.visible = false;
  scene.add(orderLines);

  const radiusMaterial = new THREE.LineBasicMaterial({
    color: 0xffdc8a, transparent: true, opacity: 0.65, depthTest: false,
  });
  const radiusLines = new THREE.LineSegments(new THREE.BufferGeometry(), radiusMaterial);
  radiusLines.renderOrder = 79;
  radiusLines.visible = false;
  scene.add(radiusLines);

  function sync(world: World, showOrders: boolean, showRadii: boolean): void {
    orderLines.visible = showOrders;
    radiusLines.visible = showRadii;

    if (showOrders) {
      const points: number[] = [];
      for (const unit of world.units) {
        if (!unit.selected) continue;
        const destination = destinationFor(world, unit);
        if (!destination) continue;
        points.push(
          unit.x, terrainHeightAt(unit.x, unit.z) + 0.25, unit.z,
          destination.x, terrainHeightAt(destination.x, destination.z) + 0.2, destination.z,
        );
      }
      orderLines.geometry.dispose();
      orderLines.geometry = new THREE.BufferGeometry();
      orderLines.geometry.setAttribute('position', new THREE.Float32BufferAttribute(points, 3));
    }

    if (showRadii) {
      const points: number[] = [];
      const segments = 20;
      for (const unit of world.units) {
        if (!unit.selected) continue;
        const radius = 0.65;
        for (let i = 0; i < segments; i++) {
          const a = (i / segments) * Math.PI * 2;
          const b = ((i + 1) / segments) * Math.PI * 2;
          points.push(
            unit.x + Math.cos(a) * radius, terrainHeightAt(unit.x, unit.z) + 0.05, unit.z + Math.sin(a) * radius,
            unit.x + Math.cos(b) * radius, terrainHeightAt(unit.x, unit.z) + 0.05, unit.z + Math.sin(b) * radius,
          );
        }
      }
      radiusLines.geometry.dispose();
      radiusLines.geometry = new THREE.BufferGeometry();
      radiusLines.geometry.setAttribute('position', new THREE.Float32BufferAttribute(points, 3));
    }
  }

  return { sync };
}
