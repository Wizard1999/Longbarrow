import type { World } from '../core/types';
import { clampPointToMapBoundary, type MapBoundary } from '../sim/mapBoundary';
import { FogOfWarField } from './fogOfWar';
import type { VisibilityController } from './visibility';

export interface MinimapCamera {
  readonly state: { focusX: number; focusZ: number; yaw: number; distance: number };
  focusAt: (x: number, z: number) => void;
}

export interface MinimapTransform {
  scale: number;
  offsetX: number;
  offsetY: number;
}

export function minimapTransform(boundary: MapBoundary, width: number, height: number, padding = 12): MinimapTransform {
  const usableW = Math.max(1, width - padding * 2);
  const usableH = Math.max(1, height - padding * 2);
  const scale = Math.min(usableW / boundary.bounds.width, usableH / boundary.bounds.depth);
  return {
    scale,
    offsetX: width * 0.5 - boundary.center.x * scale,
    offsetY: height * 0.5 + boundary.center.z * scale,
  };
}

export function minimapWorldToCanvas(t: MinimapTransform, x: number, z: number): { x: number; y: number } {
  return { x: t.offsetX + x * t.scale, y: t.offsetY - z * t.scale };
}

export function minimapCanvasToWorld(t: MinimapTransform, x: number, y: number): { x: number; z: number } {
  return { x: (x - t.offsetX) / t.scale, z: -(y - t.offsetY) / t.scale };
}

export interface Minimap {
  update: () => void;
}

/**
 * Tactical map derived from the same canonical polygon as terrain and gameplay.
 * It deliberately does not invent a square mask, so unusual map silhouettes
 * remain readable and future fog-of-war can clip against this exact path.
 */
export function createMinimap(
  world: World,
  boundary: MapBoundary,
  camera: MinimapCamera,
  fog: FogOfWarField,
  visibility: VisibilityController,
): Minimap {
  const canvas = document.getElementById('minimap') as HTMLCanvasElement | null;
  if (!canvas) throw new Error('missing #minimap canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('2D canvas unavailable for minimap');
  const minimapCanvas = canvas;
  const context = ctx;

  let cssWidth = 0;
  let cssHeight = 0;
  let transform = minimapTransform(boundary, 1, 1);

  function resize(): void {
    const rect = minimapCanvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    cssWidth = Math.max(1, Math.round(rect.width));
    cssHeight = Math.max(1, Math.round(rect.height));
    const pxW = Math.max(1, Math.round(cssWidth * dpr));
    const pxH = Math.max(1, Math.round(cssHeight * dpr));
    if (minimapCanvas.width !== pxW || minimapCanvas.height !== pxH) {
      minimapCanvas.width = pxW;
      minimapCanvas.height = pxH;
    }
    context.setTransform(dpr, 0, 0, dpr, 0, 0);
    transform = minimapTransform(boundary, cssWidth, cssHeight);
  }

  function traceBoundary(): void {
    context.beginPath();
    boundary.vertices.forEach((v, i) => {
      const p = minimapWorldToCanvas(transform, v.x, v.z);
      if (i === 0) context.moveTo(p.x, p.y);
      else context.lineTo(p.x, p.y);
    });
    context.closePath();
  }

  function dot(x: number, z: number, radius: number, fill: string): void {
    const p = minimapWorldToCanvas(transform, x, z);
    context.beginPath();
    context.arc(p.x, p.y, radius, 0, Math.PI * 2);
    context.fillStyle = fill;
    context.fill();
  }

  function update(): void {
    resize();
    context.clearRect(0, 0, cssWidth, cssHeight);

    traceBoundary();
    context.fillStyle = 'rgba(26, 34, 27, .92)';
    context.fill();
    context.strokeStyle = 'rgba(227, 216, 178, .7)';
    context.lineWidth = 1.25;
    context.stroke();

    context.save();
    traceBoundary();
    context.clip();


    for (const node of world.nodes) {
      if (visibility.resourceVisible(node.x, node.z)) dot(node.x, node.z, 2.2, 'rgba(91, 222, 210, .9)');
    }
    for (const site of world.sites) {
      if (visibility.entityVisible(site.team, site.x, site.z)) {
        dot(site.x, site.z, 3.2, site.team === 'player' ? '#f2d17a' : '#d27ac7');
      }
    }
    for (const building of world.buildings) {
      if (visibility.entityVisible(building.team, building.x, building.z)) {
        dot(building.x, building.z, building.type === 'standard' ? 4.8 : 3.5,
          building.team === 'player' ? '#ffe7a1' : '#ec8ee0');
      }
    }
    for (const unit of world.units) {
      if (visibility.entityVisible(unit.team, unit.x, unit.z)) {
        dot(unit.x, unit.z, unit.selected ? 2.2 : 1.35,
          unit.team === 'player' ? (unit.selected ? '#ffffff' : '#e8c66a') : '#ce6cc2');
      }
    }

    // Draw fog last, but only over the terrain layer. Player markers remain
    // readable while unseen enemy information is filtered above.
    for (const cell of fog.cells()) {
      if (visibility.mode === 'omniscient' || cell.state === 2) continue;
      const a = minimapWorldToCanvas(transform, cell.x - cell.width * 0.5, cell.z + cell.depth * 0.5);
      const b = minimapWorldToCanvas(transform, cell.x + cell.width * 0.5, cell.z - cell.depth * 0.5);
      context.fillStyle = cell.state === 0 ? 'rgba(0,0,0,.93)' : 'rgba(0,0,0,.48)';
      context.fillRect(a.x, a.y, Math.max(1, b.x - a.x + 0.5), Math.max(1, b.y - a.y + 0.5));
    }

    const focus = minimapWorldToCanvas(transform, camera.state.focusX, camera.state.focusZ);
    const heading = camera.state.yaw;
    const marker = Math.max(5, Math.min(12, camera.state.distance * 0.025));
    context.save();
    context.translate(focus.x, focus.y);
    context.rotate(-heading);
    context.strokeStyle = 'rgba(255,255,255,.92)';
    context.lineWidth = 1.2;
    context.beginPath();
    context.moveTo(0, -marker);
    context.lineTo(marker * .65, marker * .65);
    context.lineTo(-marker * .65, marker * .65);
    context.closePath();
    context.stroke();
    context.restore();

    context.restore();
  }

  function focusFromPointer(event: PointerEvent): void {
    const rect = minimapCanvas.getBoundingClientRect();
    const p = minimapCanvasToWorld(transform, event.clientX - rect.left, event.clientY - rect.top);
    const safe = clampPointToMapBoundary(boundary, p.x, p.z);
    camera.focusAt(safe.x, safe.z);
  }

  minimapCanvas.addEventListener('pointerdown', event => {
    event.preventDefault();
    minimapCanvas.setPointerCapture(event.pointerId);
    focusFromPointer(event);
  });
  minimapCanvas.addEventListener('pointermove', event => {
    if (minimapCanvas.hasPointerCapture(event.pointerId)) focusFromPointer(event);
  });
  minimapCanvas.addEventListener('pointerup', event => minimapCanvas.releasePointerCapture(event.pointerId));
  window.addEventListener('resize', resize);
  resize();

  return { update };
}
