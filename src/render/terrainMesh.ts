import * as THREE from 'three';
import { terrainHeightAt } from '../sim/terrain';
import { mapBoundaryForSeed, pointInMapBoundary, type MapBoundary } from '../sim/mapBoundary';
import { createPainterlyMaterial } from './painterly';
import { PALETTE } from './palette';
import type { QualitySettings } from './quality';
import { shouldShowWorldSupport } from './lod';

export interface TerrainPresentation {
  mesh: THREE.Mesh;
  boundary: MapBoundary;
  update(camera: THREE.Camera): void;
}

function buildPolygonTerrain(boundary: MapBoundary, segments: number): THREE.BufferGeometry {
  const { minX, minZ, width, depth } = boundary.bounds;
  const segX = Math.max(8, segments);
  const segZ = Math.max(8, Math.round(segments * depth / Math.max(width, 0.001)));
  const vertices: number[] = [];
  const normals: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  const vertexByGrid = new Map<string, number>();

  const addVertex = (gx: number, gz: number): number => {
    const key = `${gx}:${gz}`;
    const existing = vertexByGrid.get(key);
    if (existing !== undefined) return existing;
    const x = minX + (gx / segX) * width;
    const z = minZ + (gz / segZ) * depth;
    const index = vertices.length / 3;
    vertices.push(x, terrainHeightAt(x, z), z);
    normals.push(0, 1, 0);
    uvs.push(gx / segX, gz / segZ);
    vertexByGrid.set(key, index);
    return index;
  };

  for (let gz = 0; gz < segZ; gz++) {
    for (let gx = 0; gx < segX; gx++) {
      const cx = minX + ((gx + 0.5) / segX) * width;
      const cz = minZ + ((gz + 0.5) / segZ) * depth;
      if (!pointInMapBoundary(boundary, cx, cz)) continue;
      const a = addVertex(gx, gz);
      const b = addVertex(gx + 1, gz);
      const c = addVertex(gx + 1, gz + 1);
      const d = addVertex(gx, gz + 1);
      indices.push(a, d, b, b, d, c);
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
  return geometry;
}

function buildBoundarySkirt(boundary: MapBoundary, depth: number): THREE.BufferGeometry {
  const vertices: number[] = [];
  const indices: number[] = [];
  const n = boundary.vertices.length;
  for (let i = 0; i < n; i++) {
    const v = boundary.vertices[i]!;
    const top = terrainHeightAt(v.x, v.z) - 0.06;
    vertices.push(v.x, top, v.z, v.x, -depth, v.z);
  }
  for (let i = 0; i < n; i++) {
    const next = (i + 1) % n;
    const topA = i * 2;
    const bottomA = topA + 1;
    const topB = next * 2;
    const bottomB = topB + 1;
    indices.push(topA, bottomA, topB, topB, bottomA, bottomB);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

export function buildTerrainMesh(scene: THREE.Scene, q: QualitySettings, mapSeed = 1337): TerrainPresentation {
  const boundary = mapBoundaryForSeed(mapSeed);
  const geo = buildPolygonTerrain(boundary, q.terrainSegments);
  const mesh = new THREE.Mesh(geo, createPainterlyMaterial(PALETTE.grass, {
    soft: 0.2,
    rim: 0.15,
    jitter: 0.07,
    // Ground variation (D-035): drying starts below HIGH_GROUND_THRESHOLD so a
    // contested rise is already changing colour as you climb it, and is fully
    // dry well before the peaks. Slope gain is tuned to this map's gentle
    // normals — see the option's doc comment.
    terrain: {
      high: PALETTE.grassHigh,
      steep: PALETTE.rock,
      heightLo: 0.25,
      heightHi: 1.45,
      slopeGain: 22,
    },
  }));
  mesh.receiveShadow = true;
  mesh.name = 'polygon-battlefield';
  scene.add(mesh);

  const bodyDepth = 12;
  const skirt = new THREE.Mesh(
    buildBoundarySkirt(boundary, bodyDepth),
    new THREE.MeshStandardMaterial({ color: 0x11130f, roughness: 0.96, metalness: 0 }),
  );
  skirt.receiveShadow = true;
  skirt.castShadow = true;
  skirt.name = 'battlefield-skirt';
  scene.add(skirt);

  const worldSupport = new THREE.Group();
  worldSupport.name = 'world-turtle-support';
  const span = Math.max(boundary.bounds.width, boundary.bounds.depth);
  const shellMat = new THREE.MeshStandardMaterial({ color: 0x182019, roughness: 1, flatShading: true });
  const fleshMat = new THREE.MeshStandardMaterial({ color: 0x111712, roughness: 1, flatShading: true });
  const shell = new THREE.Mesh(new THREE.SphereGeometry(span * 0.43, 18, 10), shellMat);
  shell.scale.set(boundary.bounds.width / span * 1.18, 0.34, boundary.bounds.depth / span * 1.06);
  shell.position.y = -8.8;
  worldSupport.add(shell);
  const head = new THREE.Mesh(new THREE.SphereGeometry(span * 0.105, 10, 7), fleshMat);
  head.scale.set(1.3, 0.75, 0.8);
  head.position.set(0, -9.8, -boundary.bounds.depth * 0.63);
  worldSupport.add(head);
  const limbGeo = new THREE.SphereGeometry(span * 0.09, 9, 6);
  for (const [x, z, rz] of [
    [-0.38, -0.33, -0.35], [0.38, -0.33, 0.35],
    [-0.38, 0.34, 0.35], [0.38, 0.34, -0.35],
  ] as const) {
    const limb = new THREE.Mesh(limbGeo, fleshMat);
    limb.scale.set(1.45, 0.52, 0.75);
    limb.position.set(boundary.bounds.width * x, -10.2, boundary.bounds.depth * z);
    limb.rotation.y = rz;
    worldSupport.add(limb);
  }
  const tail = new THREE.Mesh(new THREE.ConeGeometry(span * 0.055, span * 0.24, 8), fleshMat);
  tail.rotation.x = Math.PI / 2;
  tail.position.set(0, -9.6, boundary.bounds.depth * 0.65);
  worldSupport.add(tail);
  worldSupport.visible = false;
  scene.add(worldSupport);

  return {
    mesh,
    boundary,
    update(camera) {
      const reveal = shouldShowWorldSupport(camera.position.length());
      worldSupport.visible = reveal;
      skirt.visible = !reveal;
    },
  };
}
