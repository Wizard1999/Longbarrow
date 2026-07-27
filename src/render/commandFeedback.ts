import * as THREE from 'three';

export type CommandFeedbackKind = 'move' | 'gather' | 'rally' | 'attack' | 'invalid';

interface Marker {
  group: THREE.Group;
  age: number;
  lifetime: number;
}

const COLORS: Record<CommandFeedbackKind, number> = {
  move: 0x7ce7ff,
  gather: 0xf1d27a,
  rally: 0xb6f59a,
  attack: 0xffb05e,
  invalid: 0xff7d86,
};

/** Short-lived world-space confirmation for issued commands. Presentation only. */
export function createCommandFeedback(scene: THREE.Scene) {
  const markers: Marker[] = [];

  function show(x: number, y: number, z: number, kind: CommandFeedbackKind): void {
    const material = new THREE.MeshBasicMaterial({
      color: COLORS[kind], transparent: true, opacity: 0.9, depthWrite: false,
    });
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.42, 0.58, 24), material);
    ring.rotation.x = -Math.PI / 2;
    ring.renderOrder = 30;

    const crossMaterial = material.clone();
    const barA = new THREE.Mesh(new THREE.PlaneGeometry(0.72, 0.08), crossMaterial);
    const barB = new THREE.Mesh(new THREE.PlaneGeometry(0.72, 0.08), crossMaterial.clone());
    barA.rotation.x = -Math.PI / 2;
    barB.rotation.x = -Math.PI / 2;
    barB.rotation.z = Math.PI / 2;
    barA.position.y = 0.006;
    barB.position.y = 0.006;

    const group = new THREE.Group();
    group.position.set(x, y + 0.06, z);
    group.add(ring, barA, barB);
    scene.add(group);
    markers.push({ group, age: 0, lifetime: 0.8 });
  }

  function update(realDt: number): void {
    for (let i = markers.length - 1; i >= 0; i -= 1) {
      const marker = markers[i];
      if (!marker) continue;
      marker.age += realDt;
      const t = Math.min(1, marker.age / marker.lifetime);
      marker.group.scale.setScalar(0.75 + t * 0.75);
      for (const child of marker.group.children) {
        const mesh = child as THREE.Mesh;
        const material = mesh.material as THREE.MeshBasicMaterial;
        material.opacity = (1 - t) * 0.9;
      }
      if (t >= 1) {
        scene.remove(marker.group);
        marker.group.traverse(object => {
          const mesh = object as THREE.Mesh;
          mesh.geometry?.dispose();
          const material = mesh.material as THREE.Material | THREE.Material[] | undefined;
          if (Array.isArray(material)) material.forEach(m => m.dispose());
          else material?.dispose();
        });
        markers.splice(i, 1);
      }
    }
  }

  return { show, update };
}
