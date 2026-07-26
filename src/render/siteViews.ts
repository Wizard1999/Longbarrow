import * as THREE from 'three';
import type { EntityId, Site, World } from '../core/types';
import { BUILDING_TYPES } from '../data/buildings';
import { terrainHeightAt } from '../sim/terrain';
import { builderIsWorking, buildersOn } from '../sim/construction';

const SITE_SINK = 4.2;

interface SiteViewData {
  siteId: EntityId;
  mat: THREE.MeshStandardMaterial;
  ring: THREE.Mesh<THREE.BufferGeometry, THREE.MeshBasicMaterial>;
  pickTarget: THREE.Mesh;
}

/** A site is the real silhouette, sunk into the earth and rising as it
 *  completes — fitting for a civilisation that reads as geology. */
function makeSiteView(scene: THREE.Scene, site: Site): THREE.Group {
  const t = BUILDING_TYPES[site.type];
  const sc = t.radius / 2.2;
  const mat = new THREE.MeshStandardMaterial({
    color: site.team === 'player' ? 0xe8e2d0 : 0xd8c4b8,
    flatShading: true, roughness: 0.95, transparent: true, opacity: 0.9,
  });
  const g = new THREE.Group();
  const drum = new THREE.Mesh(new THREE.CylinderGeometry(2.0 * sc, 2.4 * sc, 1.5 * sc, 6), mat);
  drum.position.y = 0.75 * sc;
  g.add(drum);
  const ribCount = site.type === 'outpost' ? 4 : 6;
  for (let i = 0; i < ribCount; i++) {
    const a = (i / ribCount) * Math.PI * 2;
    const rib = new THREE.Mesh(new THREE.CylinderGeometry(0.16 * sc, 0.22 * sc, 2.6 * sc, 5), mat);
    rib.position.set(Math.cos(a) * 1.85 * sc, 1.5 * sc, Math.sin(a) * 1.85 * sc);
    rib.rotation.z = Math.cos(a) * 0.16;
    rib.rotation.x = -Math.sin(a) * 0.16;
    g.add(rib);
  }
  // footprint marker, so a paused site is still legible from a distance
  const ringGeo = new THREE.RingGeometry(t.radius + 0.1, t.radius + 0.3, 32);
  ringGeo.rotateX(-Math.PI / 2);
  const ring = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({
    color: 0xffe66d, transparent: true, opacity: 0.7, side: THREE.DoubleSide,
  }));
  ring.position.y = 0.07;
  g.add(ring);

  g.userData = { siteId: site.id, mat, ring, pickTarget: drum } satisfies SiteViewData;
  scene.add(g);
  return g;
}

export function syncSiteViews(
  scene: THREE.Scene, world: World, views: Map<EntityId, THREE.Group>,
): void {
  for (const site of world.sites) {
    let v = views.get(site.id);
    if (!v) { v = makeSiteView(scene, site); views.set(site.id, v); }
    const d = v.userData as SiteViewData;
    const frac = site.progress / site.required;
    v.position.set(site.x, terrainHeightAt(site.x, site.z) - (1 - frac) * SITE_SINK, site.z);
    const working = buildersOn(world, site.id).some(u => builderIsWorking(world, u));
    d.mat.opacity = working ? 0.95 : 0.62;
    // paused sites glow amber instead of yellow, and stop being subtle
    d.ring.material.color.setHex(working ? 0xffe66d : 0xff9c3f);
    d.ring.material.opacity = working ? 0.7 : 0.95;
  }
  // clear views for sites that completed or were cancelled
  for (const [id, v] of views) {
    if (!world.sites.some(s => s.id === id)) { scene.remove(v); views.delete(id); }
  }
}
