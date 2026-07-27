export interface CameraState {
  focusX: number;
  focusZ: number;
  yaw: number;
  pitch: number;
  distance: number;
}

export interface CameraLimits {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  minPitch: number;
  maxPitch: number;
  minDistance: number;
  maxDistance: number;
}

export interface CameraOffset {
  x: number;
  y: number;
  z: number;
}

export const DEFAULT_CAMERA_LIMITS: CameraLimits = {
  minX: -38,
  maxX: 38,
  minZ: -38,
  maxZ: 38,
  minPitch: Math.PI * 0.20,
  maxPitch: Math.PI * 0.43,
  minDistance: 14,
  maxDistance: 72,
};

export function clampCameraState(state: CameraState, limits = DEFAULT_CAMERA_LIMITS): CameraState {
  return {
    focusX: Math.min(limits.maxX, Math.max(limits.minX, state.focusX)),
    focusZ: Math.min(limits.maxZ, Math.max(limits.minZ, state.focusZ)),
    yaw: normalizeAngle(state.yaw),
    pitch: Math.min(limits.maxPitch, Math.max(limits.minPitch, state.pitch)),
    distance: Math.min(limits.maxDistance, Math.max(limits.minDistance, state.distance)),
  };
}

export function normalizeAngle(angle: number): number {
  const tau = Math.PI * 2;
  return ((angle + Math.PI) % tau + tau) % tau - Math.PI;
}

export function cameraOffset(state: CameraState): CameraOffset {
  const horizontal = state.distance * Math.cos(state.pitch);
  return {
    x: Math.sin(state.yaw) * horizontal,
    y: Math.sin(state.pitch) * state.distance,
    z: Math.cos(state.yaw) * horizontal,
  };
}

/** Converts screen/keyboard pan intent to world-space movement relative to yaw. */
export function panDelta(yaw: number, right: number, forward: number, distance: number): { x: number; z: number } {
  const length = Math.hypot(right, forward);
  if (length === 0) return { x: 0, z: 0 };
  const r = right / length;
  const f = forward / length;
  const scale = 0.65 + distance / 34;
  return {
    x: (Math.cos(yaw) * r - Math.sin(yaw) * f) * scale,
    z: (-Math.sin(yaw) * r - Math.cos(yaw) * f) * scale,
  };
}
