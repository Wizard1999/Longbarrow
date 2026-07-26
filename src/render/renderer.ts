import * as THREE from 'three';

export interface Renderer {
  scene: THREE.Scene;
  renderer: THREE.WebGLRenderer;
}

export function createRenderer(): Renderer {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x9fd6e8);
  scene.fog = new THREE.Fog(0x9fd6e8, 46, 120);

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  document.body.appendChild(renderer.domElement);

  // Warm, soft, painterly — the Ghibli pillar from §1 / §10.1. Directional and
  // hemisphere intensities carry over unchanged from the r128 single-file
  // build; only the point lights in buildingViews needed rescaling for the
  // physically-correct lighting Three has used since r155.
  scene.add(new THREE.HemisphereLight(0xdfefff, 0x4d6b3a, 0.9));
  const sun = new THREE.DirectionalLight(0xfff2d6, 1.1);
  sun.position.set(20, 35, 15);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -46, right: 46, top: 46, bottom: -46, near: 1, far: 110 });
  sun.shadow.camera.updateProjectionMatrix();
  scene.add(sun);

  return { scene, renderer };
}
