import { describe, expect, it } from 'vitest';
import {
  cameraOffset, clampCameraState, normalizeAngle, panDelta,
} from '../src/render/cameraMath';

describe('war-table camera math', () => {
  it('clamps focus, pitch, and distance to safe limits', () => {
    const state = clampCameraState({ focusX: 100, focusZ: -100, yaw: 20, pitch: -2, distance: 900 });
    expect(state.focusX).toBe(38);
    expect(state.focusZ).toBe(-38);
    expect(state.pitch).toBeGreaterThan(0);
    expect(state.distance).toBe(72);
    expect(state.yaw).toBeGreaterThanOrEqual(-Math.PI);
    expect(state.yaw).toBeLessThan(Math.PI);
  });

  it('keeps camera offset exactly at the requested distance', () => {
    const offset = cameraOffset({ focusX: 0, focusZ: 0, yaw: 0.8, pitch: 0.7, distance: 43 });
    expect(Math.hypot(offset.x, offset.y, offset.z)).toBeCloseTo(43, 10);
  });

  it('rotates pan directions with camera yaw', () => {
    const north = panDelta(0, 0, 1, 34);
    const eastFacing = panDelta(Math.PI / 2, 0, 1, 34);
    expect(north.z).toBeLessThan(0);
    expect(eastFacing.x).toBeLessThan(0);
  });

  it('normalizes angles without changing equivalent orientation', () => {
    expect(normalizeAngle(Math.PI * 3)).toBeCloseTo(-Math.PI);
  });
});
