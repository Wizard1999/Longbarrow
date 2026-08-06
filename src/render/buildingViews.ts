import * as THREE from 'three';
import type { Building, EntityId, World } from '../core/types';
import { BUILDING_TYPES } from '../data/buildings';
import { terrainHeightAt } from '../sim/terrain';
import type { QualityTier } from './quality';
import { lodDistance3D, lodForDistance, strategicMarkerScale } from './lod';
import type { VisibilityController } from '../ui/visibility';
import { boneMaterial, glowMaterial, mossMaterial } from './materials';
import { createGroundShadow } from './groundShadow';
import { QUALITY } from './quality';

interface BuildingViewData {
  core: THREE.Mesh;
  sel: THREE.Mesh;
  buildingId: EntityId;
  pickTarget: THREE.Mesh;
  detailPickTarget: THREE.Mesh;
  detailRoot: THREE.Group;
  strategicMarker: THREE.Mesh;
  territoryRing: THREE.Mesh;
}

/**
 * The fossil-and-glow direction from §8.8: bone-pale stone, no visible
 * mechanism, warm internal light at the vital point, moss collecting in the
 * seams. Rival version tinted, same silhouette — still clearly the same
 * civilisation, just a different force.
 */
function makeBuildingView(scene: THREE.Scene, b: Building, tier: QualityTier): THREE.Group {
  const t = BUILDING_TYPES[b.type];
  const isPlayer = b.team === 'player';
  const s = t.radius;                              // world units per silhouette unit
  const sil = t.silhouette;
  // Radial detail from the quality tier, which promises segments for "unit and
  // building bodies" and was previously spent on neither — every drum and rib
  // was a hardcoded hexagon even on High.
  const seg = QUALITY[tier].bodySegments;
  const ribSeg = Math.max(4, Math.round(seg * 0.7));
  const stoneMat = boneMaterial(b.team);
  const glowMat = glowMaterial(b.team);
  const mossMat = mossMaterial();

  const g = new THREE.Group();
  const detailRoot = new THREE.Group();
  g.add(detailRoot);

  const drum = new THREE.Mesh(
    new THREE.CylinderGeometry(sil.drumTop * s, sil.drumBottom * s, sil.drumHeight * s, seg),
    stoneMat);
  drum.position.y = sil.drumHeight * s * 0.5;
  drum.castShadow = true;
  drum.receiveShadow = true;
  detailRoot.add(drum);

  // Ribs — fossil, not machinery: no joints, no gears, just weathered bone.
  const ribCount = sil.ribCount;
  for (let i = 0; i < ribCount; i++) {
    const a = (i / ribCount) * Math.PI * 2;
    const rib = new THREE.Mesh(
      new THREE.CylinderGeometry(0.073 * s, 0.1 * s, sil.ribHeight * s, ribSeg), stoneMat);
    rib.position.set(Math.cos(a) * 0.84 * s, sil.ribHeight * s * 0.5, Math.sin(a) * 0.84 * s);
    rib.rotation.z = Math.cos(a) * 0.16;
    rib.rotation.x = -Math.sin(a) * 0.16;
    rib.castShadow = true;
    detailRoot.add(rib);
    if (i % 2 === 0) {   // moss gathers in the seams
      const moss = new THREE.Mesh(new THREE.IcosahedronGeometry(0.136 * s, 0), mossMat);
      moss.position.set(Math.cos(a) * 0.84 * s, (0.16 + (i % 3) * 0.09) * s, Math.sin(a) * 0.84 * s);
      moss.scale.set(1, 0.55, 1);
      detailRoot.add(moss);
    }
  }

  // The "still faintly alive" tell.
  const core = new THREE.Mesh(
    new THREE.IcosahedronGeometry(sil.coreScale * s, seg >= 16 ? 1 : 0), glowMat);
  core.position.y = sil.coreHeight * s;
  detailRoot.add(core);
  const light = new THREE.PointLight(isPlayer ? 0xffcc66 : 0xff8866, 6, 5 * s);
  light.position.y = sil.coreHeight * s;
  detailRoot.add(light);

  const sel = new THREE.Mesh(
    new THREE.RingGeometry(t.radius + 0.15, t.radius + 0.38, 28),
    new THREE.MeshBasicMaterial({ color: 0xffe66d, side: THREE.DoubleSide, transparent: true, opacity: 0.9 }),
  );
  sel.rotation.x = -Math.PI / 2;
  sel.position.y = 0.06;
  sel.visible = false;
  g.add(sel);


  const strategicMarker = new THREE.Mesh(
    new THREE.CircleGeometry(Math.max(0.9, t.radius * 0.42), 14),
    new THREE.MeshBasicMaterial({
      color: isPlayer ? 0x6ea8ff : 0xff7a6e,
      side: THREE.DoubleSide, transparent: true, opacity: 0.9, depthWrite: false,
    }),
  );
  strategicMarker.rotation.x = -Math.PI / 2;
  strategicMarker.position.y = 0.12;
  strategicMarker.visible = false;
  g.add(strategicMarker);

  // Buildings are the heaviest things on the board, so they need the strongest
  // grounding; a wider spread reads as the mass sitting into the ground.
  g.add(createGroundShadow(t.radius, 2.1));

  g.position.set(b.x, terrainHeightAt(b.x, b.z), b.z);
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
  g.userData = {
    core, sel, buildingId: b.id, pickTarget: drum, detailPickTarget: drum,
    detailRoot, strategicMarker, territoryRing: ring,
  } satisfies BuildingViewData;

  return g;
}

export function syncBuildingViews(
  scene: THREE.Scene, world: World, views: Map<EntityId, THREE.Group>,
  selectedBuildingId: EntityId | null, camera: THREE.Camera, qualityTier: QualityTier,
  visibility: VisibilityController,
): void {
  for (const b of world.buildings) {
    if (!views.has(b.id)) views.set(b.id, makeBuildingView(scene, b, qualityTier));
  }
  // slow pulse on the cores — "still faintly alive", not machinery
  const pulse = 1 + Math.sin(world.tick * 0.045) * 0.09;
  for (const [id, v] of views) {
    const d = v.userData as BuildingViewData;
    const building = world.buildings.find(candidate => candidate.id === id);
    if (!building) { scene.remove(v); views.delete(id); continue; }
    const informationVisible = visibility.entityVisible(building.team, building.x, building.z);
    v.visible = informationVisible;
    d.territoryRing.visible = informationVisible;
    if (!informationVisible) continue;
    d.core.scale.setScalar(pulse);
    const distance = lodDistance3D(
      camera.position.x, camera.position.y, camera.position.z,
      v.position.x, v.position.y, v.position.z,
    );
    const lod = lodForDistance(distance, qualityTier);
    d.detailRoot.visible = lod === 'close' || lod === 'tactical';
    d.strategicMarker.visible = lod === 'strategic' || lod === 'world';
    d.strategicMarker.scale.setScalar(strategicMarkerScale(distance, lod));
    d.pickTarget = d.detailRoot.visible ? d.detailPickTarget : d.strategicMarker;
    v.userData.pickTarget = d.pickTarget;
    d.sel.visible = d.buildingId === selectedBuildingId;
  }
  for (const [id, v] of views) {
    if (world.buildings.some(building => building.id === id)) continue;
    const d = v.userData as BuildingViewData;
    scene.remove(d.territoryRing, v);
    views.delete(id);
  }
}
