import * as THREE from 'three';
import type { BehaviourKind, BuildingTypeKey, EntityId, World } from '../core/types';
import { terrainHeightAt } from '../sim/terrain';

/** What the player currently has selected. Units carry their own `selected`
 *  flag inside the sim; buildings and sites are presentation-side selections,
 *  since the sim has no concept of a cursor. */
export interface UiState {
  placingType: BuildingTypeKey | null;
  selectedBuildingId: EntityId | null;
  selectedSiteId: EntityId | null;
  /** Which squad the chain editor is showing. */
  selectedSquadId: EntityId | null;
  /** A behaviour picked but not yet placed — the next map click sites it. */
  armedBehaviour: BehaviourKind | null;
}

export function createUiState(): UiState {
  return {
    placingType: null,
    selectedBuildingId: null,
    selectedSiteId: null,
    selectedSquadId: null,
    armedBehaviour: null,
  };
}

export interface ViewMaps {
  units: Map<EntityId, THREE.Group>;
  buildings: Map<EntityId, THREE.Group>;
  sites: Map<EntityId, THREE.Group>;
  nodes: Map<EntityId, THREE.Group>;
}

/** Screen-space picking. Emits nothing on its own — callers turn hits into
 *  commands, keeping the sim's single mutation path intact. */
export function createPicker(
  camera: THREE.PerspectiveCamera, terrainMesh: THREE.Mesh, views: ViewMaps,
) {
  const raycaster = new THREE.Raycaster();
  const ndc = new THREE.Vector2();

  const pickTargets = (map: Map<EntityId, THREE.Group>): THREE.Object3D[] =>
    [...map.values()]
      .map(v => (v.userData as { pickTarget?: THREE.Object3D }).pickTarget)
      .filter((o): o is THREE.Object3D => o !== undefined);

  return {
    setFromEvent(e: MouseEvent): void {
      ndc.x = (e.clientX / window.innerWidth) * 2 - 1;
      ndc.y = -(e.clientY / window.innerHeight) * 2 + 1;
      raycaster.setFromCamera(ndc, camera);
    },
    ground: (): THREE.Intersection | undefined => raycaster.intersectObject(terrainMesh)[0],
    unit: (): THREE.Intersection | undefined => raycaster.intersectObjects(pickTargets(views.units))[0],
    building: (): THREE.Intersection | undefined => raycaster.intersectObjects(pickTargets(views.buildings))[0],
    unitDeep: (): THREE.Intersection | undefined =>
      raycaster.intersectObjects([...views.units.values()], true)[0],
    buildingDeep: (): THREE.Intersection | undefined =>
      raycaster.intersectObjects([...views.buildings.values()], true)[0],
    site: (): THREE.Intersection | undefined => raycaster.intersectObjects(pickTargets(views.sites))[0],
    /** Nodes and sites are picked through the whole group for right-click
     *  orders, so clipping a shard still counts as clicking the node. */
    nodeDeep: (): THREE.Intersection | undefined =>
      raycaster.intersectObjects([...views.nodes.values()], true)[0],
    siteDeep: (): THREE.Intersection | undefined =>
      raycaster.intersectObjects([...views.sites.values()], true)[0],
  };
}

/** Walk up from a picked child mesh to the group carrying the given id key. */
export function ownerIdOf(hit: THREE.Intersection, key: string): EntityId | null {
  let o: THREE.Object3D | null = hit.object;
  while (o && (o.userData as Record<string, unknown>)[key] === undefined) o = o.parent;
  const id = o ? (o.userData as Record<string, EntityId>)[key] : undefined;
  return id ?? null;
}

export function screenPosOf(
  camera: THREE.PerspectiveCamera, x: number, z: number,
): { x: number; y: number; visible: boolean } {
  const v = new THREE.Vector3(x, terrainHeightAt(x, z) + 1.0, z).project(camera);
  return {
    x: (v.x * 0.5 + 0.5) * window.innerWidth,
    y: (-v.y * 0.5 + 0.5) * window.innerHeight,
    visible: v.z >= -1 && v.z <= 1,
  };
}

export const selectedIds = (world: World): EntityId[] =>
  world.units.filter(u => u.selected).map(u => u.id);
