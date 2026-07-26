import * as THREE from 'three';

export interface RtsCamera {
  camera: THREE.PerspectiveCamera;
  target: THREE.Vector3;
  pan: (realDt: number, keys: Record<string, boolean>, mouseX: number, mouseY: number) => void;
  zoom: (deltaY: number) => void;
  update: () => void;
  onResize: () => void;
}

export function createCamera(): RtsCamera {
  const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 500);
  const target = new THREE.Vector3(-12, 0, 7);
  const angle = THREE.MathUtils.degToRad(52);
  let distance = 40;

  function update(): void {
    camera.position.set(
      target.x,
      distance * Math.sin(angle),
      target.z + distance * Math.cos(angle),
    );
    camera.lookAt(target);
  }

  function pan(realDt: number, keys: Record<string, boolean>, mouseX: number, mouseY: number): void {
    const panSpeed = 16 * realDt * (distance / 30);
    let dx = 0;
    let dz = 0;
    if (keys['w']) dz -= 1;
    if (keys['s']) dz += 1;
    if (keys['a']) dx -= 1;
    if (keys['d']) dx += 1;
    const edge = 18;
    if (mouseX < edge) dx -= 1;
    if (mouseX > window.innerWidth - edge) dx += 1;
    if (mouseY < edge) dz -= 1;
    if (mouseY > window.innerHeight - edge) dz += 1;
    if (dx || dz) {
      const len = Math.hypot(dx, dz);
      target.x = THREE.MathUtils.clamp(target.x + (dx / len) * panSpeed, -38, 38);
      target.z = THREE.MathUtils.clamp(target.z + (dz / len) * panSpeed, -38, 38);
    }
  }

  return {
    camera,
    target,
    pan,
    zoom: (deltaY: number) => { distance = THREE.MathUtils.clamp(distance + deltaY * 0.03, 14, 64); },
    update,
    onResize: () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
    },
  };
}
