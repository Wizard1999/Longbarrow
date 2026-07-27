import * as THREE from 'three';
import { LIGHT } from './palette';
import type { QualitySettings } from './quality';

export interface Renderer {
  scene: THREE.Scene;
  renderer: THREE.WebGLRenderer;
  sun: THREE.DirectionalLight;
}

export function createRenderer(q: QualitySettings): Renderer {
  const scene = new THREE.Scene();
  scene.background = LIGHT.background.clone();
  // Aerial perspective: distance fades toward the sky colour, never toward
  // grey. Cheap, and it is most of what gives a stylised scene depth.
  scene.fog = new THREE.Fog(LIGHT.fog.getHex(), 52, 135);

  const renderer = new THREE.WebGLRenderer({
    antialias: q.antialias,
    powerPreference: 'high-performance',
    stencil: false,
  });
  renderer.setSize(window.innerWidth, window.innerHeight);
  // The single biggest lever on a weak GPU: never render more pixels than the
  // tier allows, whatever the display claims.
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, q.maxPixelRatio));
  renderer.shadowMap.enabled = q.shadows;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  // Neutral keeps stylised palettes intact; ACES desaturates them noticeably.
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.toneMappingExposure = 1.15;
  document.body.appendChild(renderer.domElement);

  // These lights exist for Three's shadow machinery and to keep the standard
  // materials (UI helpers, ghosts) sane. The painterly shader takes its colour
  // from the palette rather than from these.
  scene.add(new THREE.HemisphereLight(LIGHT.sky.getHex(), LIGHT.ground.getHex(), 1.6));

  const sun = new THREE.DirectionalLight(LIGHT.sun.getHex(), 2.0);
  sun.position.copy(LIGHT.sunDir).multiplyScalar(60);
  sun.castShadow = q.shadows;
  sun.shadow.mapSize.set(q.shadowMapSize, q.shadowMapSize);
  sun.shadow.bias = -0.0008;
  sun.shadow.normalBias = 0.02;
  Object.assign(sun.shadow.camera, {
    left: -46, right: 46, top: 46, bottom: -46, near: 1, far: 160,
  });
  sun.shadow.camera.updateProjectionMatrix();
  scene.add(sun);
  scene.add(sun.target);

  return { scene, renderer, sun };
}
