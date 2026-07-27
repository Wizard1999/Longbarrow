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
  // Deliberately wider than the authored terrain: the battlefield is a physical
  // table floating in a void, so the viewer may move beyond its edge and inspect
  // it from miniature level through an almost map-like overhead view.
  minX: -180,
  maxX: 180,
  minZ: -180,
  maxZ: 180,
  minPitch: Math.PI * 0.025,
  maxPitch: Math.PI * 0.495,
  minDistance: 2.5,
  maxDistance: 520,
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

/**
 * Returns a conservative perspective-camera distance that frames a rectangular
 * board with breathing room. The calculation uses the tighter vertical or
 * horizontal field of view, so ultrawide and portrait windows both receive a
 * complete-board overview.
 */
export function distanceToFrameBoard(
  width: number,
  depth: number,
  verticalFovRadians: number,
  aspect: number,
  padding = 1.18,
): number {
  const safeAspect = Math.max(0.1, aspect);
  const verticalHalfFov = Math.max(0.01, verticalFovRadians / 2);
  const horizontalHalfFov = Math.atan(Math.tan(verticalHalfFov) * safeAspect);
  const halfWidth = Math.max(0, width) * 0.5 * padding;
  const halfDepth = Math.max(0, depth) * 0.5 * padding;
  const forWidth = halfWidth / Math.tan(horizontalHalfFov);
  const forDepth = halfDepth / Math.tan(verticalHalfFov);
  return Math.hypot(Math.max(forWidth, forDepth), Math.max(halfWidth, halfDepth));
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
