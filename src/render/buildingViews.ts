import * as THREE from 'three';
import type { Building, EntityId, World } from '../core/types';
import { BUILDING_TYPES } from '../data/buildings';
import { terrainHeightAt } from '../sim/terrain';

interface BuildingViewData {
  core: THREE.Mesh;
  sel: THREE.Mesh;
  buildingId: EntityId;
  pickTarget: THREE.Mesh;
}

/**
 * The fossil-and-glow direction from §8.8: bone-pale stone, no visible
 * mechanism, warm internal light at the vital point, moss collecting in the
 * seams. Rival version tinted, same silhouette — still clearly the same
 * civilisation, just a different force.
 */
function makeBuildingView(scene: THREE.Scene, b: Building): THREE.Group {
  const t = BUILDING_TYPES[b.type];
  const isPlayer = b.team === 'player';
  const s = t.radius / 2.2;                        // scale off the Standard
  const stoneMat = new THREE.MeshStandardMaterial({
    color: isPlayer ? 0xe8e2d0 : 0xd8c4b8, flatShading: true, roughness: 0.95,
  });
  const glowMat = new THREE.MeshStandardMaterial({
    color: 0xffe9a8, emissive: isPlayer ? 0xffcc55 : 0xff7755,
    emissiveIntensity: 1.4, flatShading: true,
  });
  const mossMat = new THREE.MeshStandardMaterial({ color: 0x5f8a45, flatShading: true, roughness: 1 });

  const g = new THREE.Group();

  const drum = new THREE.Mesh(new THREE.CylinderGeometry(2.0 * s, 2.4 * s, 1.5 * s, 6), stoneMat);
  drum.position.y = 0.75 * s;
  drum.castShadow = true;
  drum.receiveShadow = true;
  g.add(drum);

  // Ribs — fossil, not machinery: no joints, no gears, just weathered bone.
  const ribCount = b.type === 'outpost' ? 4 : 6;
  for (let i = 0; i < ribCount; i++) {
    const a = (i / ribCount) * Math.PI * 2;
    const rib = new THREE.Mesh(new THREE.CylinderGeometry(0.16 * s, 0.22 * s, 2.6 * s, 5), stoneMat);
    rib.position.set(Math.cos(a) * 1.85 * s, 1.5 * s, Math.sin(a) * 1.85 * s);
    rib.rotation.z = Math.cos(a) * 0.16;
    rib.rotation.x = -Math.sin(a) * 0.16;
    rib.castShadow = true;
    g.add(rib);
    if (i % 2 === 0) {   // moss gathers in the seams
      const moss = new THREE.Mesh(new THREE.IcosahedronGeometry(0.3 * s, 0), mossMat);
      moss.position.set(Math.cos(a) * 1.85 * s, (0.35 + (i % 3) * 0.2) * s, Math.sin(a) * 1.85 * s);
      moss.scale.set(1, 0.55, 1);
      g.add(moss);
    }
  }

  // The "still faintly alive" tell.
  const core = new THREE.Mesh(new THREE.IcosahedronGeometry(0.72 * s, 0), glowMat);
  core.position.y = 2.5 * s;
  g.add(core);
  const light = new THREE.PointLight(isPlayer ? 0xffcc66 : 0xff8866, 6, 11 * s);
  light.position.y = 2.5 * s;
  g.add(light);

  const sel = new THREE.Mesh(
    new THREE.RingGeometry(t.radius + 0.15, t.radius + 0.38, 28),
    new THREE.MeshBasicMaterial({ color: 0xffe66d, side: THREE.DoubleSide, transparent: true, opacity: 0.9 }),
  );
  sel.rotation.x = -Math.PI / 2;
  sel.position.y = 0.06;
  sel.visible = false;
  g.add(sel);

  g.position.set(b.x, terrainHeightAt(b.x, b.z), b.z);
  g.userData = { core, sel, buildingId: b.id, pickTarget: drum } satisfies BuildingViewData;
  scene.add(g);

  // Control range — territory held, drawn flat on the ground. Follows the
  // terrain so it reads as land rather than a floating UI circle.
  const ringGeo = new THREE.RingGeometry(t.controlRadius - 0.22, t.controlRadius, 96);
  ringGeo.rotateX(-Math.PI / 2);
  const rp = ringGeo.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < rp.count; i++) {
    rp.setY(i, terrainHeightAt(b.x + rp.getX(i), b.z + rp.getZ(i)) + 0.09);
  }
  const ring = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({
    color: isPlayer ? 0x6ea8ff : 0xff7a6e, transparent: true, opacity: 0.4, side: THREE.DoubleSide,
  }));
  ring.position.set(b.x, 0, b.z);
  scene.add(ring);

  return g;
}

export function syncBuildingViews(
  scene: THREE.Scene, world: World, views: Map<EntityId, THREE.Group>,
  selectedBuildingId: EntityId | null,
): void {
  for (const b of world.buildings) {
    if (!views.has(b.id)) views.set(b.id, makeBuildingView(scene, b));
  }
  // slow pulse on the cores — "still faintly alive", not machinery
  const pulse = 1 + Math.sin(world.tick * 0.045) * 0.09;
  for (const v of views.values()) {
    const d = v.userData as BuildingViewData;
    d.core.scale.setScalar(pulse);
    d.sel.visible = d.buildingId === selectedBuildingId;
  }
}
