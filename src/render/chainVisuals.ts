import * as THREE from 'three';
import type { BehaviourKind, Squad } from '../core/types';
import { terrainHeightAt } from '../sim/terrain';

const BEHAVIOUR_COLOR: Record<BehaviourKind, number> = {
  move: 0x6ea8ff,
  attackmove: 0xff7a6e,
  gather: 0x7fe3e6,
  patrol: 0xffc95c,
};

/**
 * Draws the selected squad's chain on the ground as waypoint posts joined by a
 * line. Without this the chain only exists in a side panel, which is exactly
 * the "feels like scripting" failure the blueprint warns about — the plan has
 * to be legible on the battlefield, not just in a list.
 */
export function createChainVisuals(scene: THREE.Scene) {
  const group = new THREE.Group();
  scene.add(group);

  const lineMat = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.5 });
  const line = new THREE.Line(new THREE.BufferGeometry(), lineMat);
  group.add(line);

  const markers: THREE.Mesh[] = [];

  return {
    sync(squad: Squad | null): void {
      const steps = squad?.chain ?? [];
      group.visible = steps.length > 0;

      while (markers.length < steps.length) {
        const m = new THREE.Mesh(
          new THREE.ConeGeometry(0.5, 1.3, 6),
          new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.85 }),
        );
        markers.push(m);
        group.add(m);
      }

      const pts: THREE.Vector3[] = [];
      markers.forEach((m, i) => {
        const step = steps[i];
        if (!step) { m.visible = false; return; }
        const y = terrainHeightAt(step.x, step.z);
        m.visible = true;
        m.position.set(step.x, y + 0.9, step.z);
        (m.material as THREE.MeshBasicMaterial).color.setHex(BEHAVIOUR_COLOR[step.kind]);
        // the step being executed right now stands taller and opaque
        const active = squad?.running && squad.index === i;
        m.scale.setScalar(active ? 1.35 : 0.85);
        (m.material as THREE.MeshBasicMaterial).opacity = active ? 1 : 0.6;
        pts.push(new THREE.Vector3(step.x, y + 0.25, step.z));
      });

      // close the loop visually when the chain loops, so "this repeats" reads
      // off the map rather than out of a checkbox
      if (squad?.loop && pts.length > 2) {
        const first = pts[0];
        if (first) pts.push(first.clone());
      }
      line.geometry.dispose();
      line.geometry = new THREE.BufferGeometry().setFromPoints(pts);
      line.visible = pts.length > 1;
    },
  };
}
