import * as THREE from 'three';
import type { EntityId, Team, Unit, World } from '../core/types';
import { UNIT_TYPES } from '../data/units';
import { terrainHeightAt } from '../sim/terrain';
import { shieldWallStacks } from '../sim/combat';
import { COMBAT } from '../data/tuning';
import { essenceMat } from './nodeViews';
import type { QualityTier } from './quality';
import { lodDistance3D, lodForDistance, strategicMarkerScale } from './lod';
import type { VisibilityController } from '../ui/visibility';
import { boneMaterial, trimMaterial } from './materials';

export const TEAM_COLORS: Record<Team, number> = { player: 0x3b5bdb, rival: 0xb02e2e };

interface UnitViewData {
  unitId: EntityId;
  ring: THREE.Mesh;
  squadRing: THREE.Mesh;
  carry: THREE.Mesh | null;
  /** Legionnaires only — brightens with the shield-wall bonus so the mechanic
   *  is readable on the battlefield rather than hidden in a stat (§8.6). */
  wall: THREE.Mesh | null;
  pickTarget: THREE.Mesh;
  detailPickTarget: THREE.Mesh;
  detailRoot: THREE.Group;
  strategicMarker: THREE.Mesh;
}

function makeUnitView(scene: THREE.Scene, unit: Unit): THREE.Group {
  const g = new THREE.Group();
  const detailRoot = new THREE.Group();
  g.add(detailRoot);
  const isWorker = UNIT_TYPES[unit.type].isWorker;
  const isMarksman = unit.type === 'marksman';
  // Shared, not per-unit: a ShaderMaterial per unit means a shader compile per
  // unit, which stalls exactly when a battle is busiest (see render/materials.ts).
  const bodyMat = boneMaterial(unit.team);
  const trimMat = trimMaterial(unit.team);

  // Silhouette carries the role, since the design brief wants the battlefield
  // readable at a glance: the Legionnaire is broad and low, the Marksman is
  // narrow and tall with a visible long weapon, the worker is smallest.
  const bodyH = isWorker ? 0.8 : isMarksman ? 1.1 : 1.0;
  const rTop = isWorker ? 0.26 : isMarksman ? 0.22 : 0.32;
  const rBot = isWorker ? 0.34 : isMarksman ? 0.28 : 0.4;
  const body = new THREE.Mesh(new THREE.CylinderGeometry(rTop, rBot, bodyH, 6), bodyMat);
  body.position.y = bodyH * 0.7;
  const head = new THREE.Mesh(
    new THREE.IcosahedronGeometry(isWorker ? 0.23 : isMarksman ? 0.21 : 0.28, 0), trimMat);
  head.position.y = bodyH + 0.35;
  body.castShadow = true;
  head.castShadow = true;
  detailRoot.add(body, head);

  if (isMarksman) {
    // Long bone stave, angled back over the shoulder — reads as "ranged"
    // without adding a second material or a projectile.
    const stave = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.055, 1.6, 5), trimMat);
    stave.position.set(0.26, bodyH + 0.1, -0.05);
    stave.rotation.z = -0.32;
    stave.castShadow = true;
    detailRoot.add(stave);
  }

  if (unit.type === 'legionnaire') {
    // Shield, and the thing the wall bonus is drawn on.
    const shield = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.62, 0.5), trimMat);
    shield.position.set(-0.36, bodyH * 0.72, 0.06);
    shield.castShadow = true;
    detailRoot.add(shield);
  }

  // carried essence — only workers, only visible while hauling
  let carry: THREE.Mesh | null = null;
  if (isWorker) {
    carry = new THREE.Mesh(new THREE.OctahedronGeometry(0.24, 0), essenceMat);
    carry.position.y = bodyH + 0.85;
    carry.visible = false;
    detailRoot.add(carry);
  }

  const ring = new THREE.Mesh(
    new THREE.RingGeometry(isWorker ? 0.46 : 0.55, isWorker ? 0.58 : 0.68, 20),
    new THREE.MeshBasicMaterial({ color: 0xffe66d, side: THREE.DoubleSide, transparent: true, opacity: 0.9 }),
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.03;
  ring.visible = false;
  g.add(ring);

  // Squad membership ring, just outside the selection ring. Squads persist
  // (Q1), so it has to show on the unit whether or not that squad is currently
  // selected — otherwise you cannot tell at a glance what is already committed.
  const squadRing = new THREE.Mesh(
    new THREE.RingGeometry(isWorker ? 0.62 : 0.72, isWorker ? 0.72 : 0.82, 20),
    new THREE.MeshBasicMaterial({ color: 0x8ad6ff, side: THREE.DoubleSide, transparent: true, opacity: 0.75 }),
  );
  squadRing.rotation.x = -Math.PI / 2;
  squadRing.position.y = 0.02;
  squadRing.visible = false;
  g.add(squadRing);

  // Shield-wall indicator: a flat arc under the unit that gains opacity with
  // each adjacent Legionnaire, so a formed line visibly glows and a scattered
  // one doesn't.
  let wall: THREE.Mesh | null = null;
  if (unit.type === 'legionnaire') {
    wall = new THREE.Mesh(
      new THREE.RingGeometry(0.3, 0.46, 18),
      new THREE.MeshBasicMaterial({
        color: 0xbfe0ff, side: THREE.DoubleSide, transparent: true, opacity: 0,
      }),
    );
    wall.rotation.x = -Math.PI / 2;
    wall.position.y = 0.015;
    g.add(wall);
  }


  const strategicMarker = new THREE.Mesh(
    new THREE.CircleGeometry(isWorker ? 0.42 : 0.52, 10),
    new THREE.MeshBasicMaterial({
      color: TEAM_COLORS[unit.team], side: THREE.DoubleSide,
      transparent: true, opacity: 0.92, depthWrite: false,
    }),
  );
  strategicMarker.rotation.x = -Math.PI / 2;
  strategicMarker.position.y = 0.08;
  strategicMarker.visible = false;
  g.add(strategicMarker);

  g.userData = { unitId: unit.id, ring, squadRing, carry, wall, pickTarget: body, detailPickTarget: body, detailRoot, strategicMarker } satisfies UnitViewData;
  scene.add(g);
  return g;
}

function lerpAngle(a: number, b: number, t: number): number {
  const TAU = Math.PI * 2;
  const d = (((b - a + Math.PI) % TAU) + TAU) % TAU - Math.PI;
  return a + d * t;
}

/**
 * Interpolates between the previous and current tick so a 20Hz simulation
 * still looks smooth at display refresh rate. Nothing here advances game state.
 * Units in `squadMemberIds` get the squad ring.
 */
export function syncUnitViews(
  scene: THREE.Scene, world: World, views: Map<EntityId, THREE.Group>,
  alpha: number, squadMemberIds: Set<EntityId>, camera: THREE.Camera, qualityTier: QualityTier,
  visibility: VisibilityController,
): void {
  for (const u of world.units) {
    let v = views.get(u.id);
    if (!v) { v = makeUnitView(scene, u); views.set(u.id, v); }
    const d = v.userData as UnitViewData;
    const informationVisible = visibility.entityVisible(u.team, u.x, u.z);
    v.visible = informationVisible;
    if (!informationVisible) continue;
    const x = u.prevX + (u.x - u.prevX) * alpha;
    const z = u.prevZ + (u.z - u.prevZ) * alpha;
    const y = terrainHeightAt(x, z);
    v.position.set(x, y, z);
    v.rotation.y = lerpAngle(u.prevFacing, u.facing, alpha);
    const distance = lodDistance3D(camera.position.x, camera.position.y, camera.position.z, x, y, z);
    const lod = lodForDistance(distance, qualityTier);
    d.detailRoot.visible = lod === 'close' || lod === 'tactical';
    d.strategicMarker.visible = lod === 'strategic' || lod === 'world';
    d.strategicMarker.scale.setScalar(strategicMarkerScale(distance, lod));
    d.pickTarget = d.detailRoot.visible ? d.detailPickTarget : d.strategicMarker;
    v.userData.pickTarget = d.pickTarget;
    d.ring.visible = u.selected;
    d.squadRing.visible = squadMemberIds.has(u.id) && lod !== 'world';
    if (d.carry) d.carry.visible = (u.gather?.carrying ?? 0) > 0;
    if (d.wall) {
      const frac = shieldWallStacks(world, u) / COMBAT.shieldWallMaxNeighbours;
      (d.wall.material as THREE.MeshBasicMaterial).opacity = frac * 0.85;
    }
  }
  // drop views for units that no longer exist
  for (const [id, v] of views) {
    if (!world.units.some(u => u.id === id)) { scene.remove(v); views.delete(id); }
  }
}
