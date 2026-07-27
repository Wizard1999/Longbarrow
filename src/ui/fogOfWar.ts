import type { Building, Unit, World } from '../core/types';
import { pointInMapBoundary, type MapBoundary } from '../sim/mapBoundary';

export type FogState = 0 | 1 | 2; // unexplored, explored, visible

export interface VisionSource {
  x: number;
  z: number;
  radius: number;
}

export interface FogCell {
  x: number;
  z: number;
  width: number;
  depth: number;
  state: FogState;
}

const UNIT_VISION: Record<Unit['type'], number> = {
  worker: 9,
  legionnaire: 11,
  marksman: 14,
};

const BUILDING_VISION: Record<Building['type'], number> = {
  standard: 17,
  outpost: 13,
};

export function playerVisionSources(world: World): VisionSource[] {
  const sources: VisionSource[] = [];
  for (const unit of world.units) {
    if (unit.team === 'player') sources.push({ x: unit.x, z: unit.z, radius: UNIT_VISION[unit.type] });
  }
  for (const building of world.buildings) {
    if (building.team === 'player') {
      sources.push({ x: building.x, z: building.z, radius: BUILDING_VISION[building.type] });
    }
  }
  for (const site of world.sites) {
    if (site.team === 'player') sources.push({ x: site.x, z: site.z, radius: 7 });
  }
  return sources;
}

/**
 * Presentation-side explored/visible field. It never enters deterministic sim
 * state: it is derived from player-owned observers and can be rebuilt while a
 * replay is viewed. The canonical polygon still defines every valid cell.
 */
export class FogOfWarField {
  readonly columns: number;
  readonly rows: number;
  private readonly explored: Uint8Array;
  private readonly visible: Uint8Array;

  constructor(readonly boundary: MapBoundary, columns = 48, rows = 48) {
    this.columns = Math.max(8, Math.floor(columns));
    this.rows = Math.max(8, Math.floor(rows));
    this.explored = new Uint8Array(this.columns * this.rows);
    this.visible = new Uint8Array(this.columns * this.rows);
  }

  update(sources: readonly VisionSource[]): void {
    this.visible.fill(0);
    for (let row = 0; row < this.rows; row++) {
      for (let col = 0; col < this.columns; col++) {
        const p = this.cellCenter(col, row);
        if (!pointInMapBoundary(this.boundary, p.x, p.z)) continue;
        const index = row * this.columns + col;
        for (const source of sources) {
          const dx = p.x - source.x;
          const dz = p.z - source.z;
          if (dx * dx + dz * dz <= source.radius * source.radius) {
            this.visible[index] = 1;
            this.explored[index] = 1;
            break;
          }
        }
      }
    }
  }

  stateAt(x: number, z: number): FogState {
    if (!pointInMapBoundary(this.boundary, x, z)) return 0;
    const col = Math.max(0, Math.min(this.columns - 1,
      Math.floor(((x - this.boundary.bounds.minX) / this.boundary.bounds.width) * this.columns)));
    const row = Math.max(0, Math.min(this.rows - 1,
      Math.floor(((z - this.boundary.bounds.minZ) / this.boundary.bounds.depth) * this.rows)));
    const index = row * this.columns + col;
    return this.visible[index] ? 2 : this.explored[index] ? 1 : 0;
  }

  /**
   * Write the field into a byte per cell, for upload as a texture.
   *
   * `0` fogged, `128` explored-but-unseen, `255` clear. Ground outside the map
   * polygon is written as clear rather than unexplored: there is no terrain out
   * there to conceal, and letting the sampler blend from "clear" to "unexplored"
   * across the rim is what gives the fog a soft edge at the table's edge instead
   * of a cut line.
   *
   * A texture rather than one quad per cell because the tiling in B-004 was
   * structural — more, smaller squares is still squares. Interpolation between
   * cells is what actually removes it, and it costs one upload of a few kilobytes
   * per frame instead of thousands of instanced draws.
   */
  coverage(out: Uint8Array): void {
    for (let row = 0; row < this.rows; row++) {
      for (let col = 0; col < this.columns; col++) {
        const index = row * this.columns + col;
        const p = this.cellCenter(col, row);
        if (!pointInMapBoundary(this.boundary, p.x, p.z)) { out[index] = 255; continue; }
        out[index] = this.visible[index] ? 255 : this.explored[index] ? 128 : 0;
      }
    }
  }

  get coverageLength(): number { return this.columns * this.rows; }

  cells(): FogCell[] {
    const width = this.boundary.bounds.width / this.columns;
    const depth = this.boundary.bounds.depth / this.rows;
    const result: FogCell[] = [];
    for (let row = 0; row < this.rows; row++) {
      for (let col = 0; col < this.columns; col++) {
        const center = this.cellCenter(col, row);
        if (!pointInMapBoundary(this.boundary, center.x, center.z)) continue;
        const index = row * this.columns + col;
        result.push({
          x: center.x,
          z: center.z,
          width,
          depth,
          state: this.visible[index] ? 2 : this.explored[index] ? 1 : 0,
        });
      }
    }
    return result;
  }

  private cellCenter(col: number, row: number): { x: number; z: number } {
    return {
      x: this.boundary.bounds.minX + ((col + 0.5) / this.columns) * this.boundary.bounds.width,
      z: this.boundary.bounds.minZ + ((row + 0.5) / this.rows) * this.boundary.bounds.depth,
    };
  }
}
