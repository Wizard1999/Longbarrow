import * as THREE from 'three';
import type { EntityId, Team, Unit, World } from '../core/types';
import { UNIT_TYPES } from '../data/units';
import { terrainHeightAt } from '../sim/terrain';
import { essenceMat } from './nodeViews';

export const TEAM_COLORS: Record<Team, number> = { player: 0x3b5bdb, rival: 0xb02e2e };

interface UnitViewData {
  unitId: EntityId;
  ring: THREE.Mesh;
  squadRing: THREE.Mesh;
  carry: THREE.Mesh | null;
  pickTarget: THREE.Mesh;
}

function makeUnitView(scene: THREE.Scene, unit: Unit): THREE.Group {
  const g = new THREE.Group();
  const isWorker = UNIT_TYPES[unit.type].isWorker;
  const bodyMat = new THREE.MeshStandardMaterial({ color: TEAM_COLORS[unit.team], flatShading: true });
  const trimMat = new THREE.MeshStandardMaterial({ color: 0xf2e9d8, flatShading: true });

  const bodyH = isWorker ? 0.8 : 1.0;
  const body = new THREE.Mesh(
    new THREE.CylinderGeometry(isWorker ? 0.26 : 0.32, isWorker ? 0.34 : 0.4, bodyH, 6), bodyMat);
  body.position.y = bodyH * 0.7;
  const head = new THREE.Mesh(new THREE.IcosahedronGeometry(isWorker ? 0.23 : 0.28, 0), trimMat);
  head.position.y = bodyH + 0.35;
  body.castShadow = true;
  head.castShadow = true;
  g.add(body, head);

  // carried essence — only workers, only visible while hauling
  let carry: THREE.Mesh | null = null;
  if (isWorker) {
    carry = new THREE.Mesh(new THREE.OctahedronGeometry(0.24, 0), essenceMat);
    carry.position.y = bodyH + 0.85;
    carry.visible = false;
    g.add(carry);
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

  g.userData = { unitId: unit.id, ring, squadRing, carry, pickTarget: body } satisfies UnitViewData;
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
  alpha: number, squadMemberIds: Set<EntityId>,
): void {
  for (const u of world.units) {
    let v = views.get(u.id);
    if (!v) { v = makeUnitView(scene, u); views.set(u.id, v); }
    const d = v.userData as UnitViewData;
    const x = u.prevX + (u.x - u.prevX) * alpha;
    const z = u.prevZ + (u.z - u.prevZ) * alpha;
    v.position.set(x, terrainHeightAt(x, z), z);
    v.rotation.y = lerpAngle(u.prevFacing, u.facing, alpha);
    d.ring.visible = u.selected;
    d.squadRing.visible = squadMemberIds.has(u.id);
    if (d.carry) d.carry.visible = (u.gather?.carrying ?? 0) > 0;
  }
  // drop views for units that no longer exist
  for (const [id, v] of views) {
    if (!world.units.some(u => u.id === id)) { scene.remove(v); views.delete(id); }
  }
}
