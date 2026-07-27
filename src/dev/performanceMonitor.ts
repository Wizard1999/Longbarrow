import type * as THREE from 'three';
import type { World } from '../core/types';
import type { QualitySettings } from '../render/quality';

export interface FrameSummary {
  sampleCount: number;
  elapsedSeconds: number;
  averageFps: number;
  averageFrameMs: number;
  p50FrameMs: number;
  p95FrameMs: number;
  worstFrameMs: number;
}

export interface PerformanceReport {
  schemaVersion: 1;
  capturedAt: string;
  userAgent: string;
  viewport: { width: number; height: number; devicePixelRatio: number };
  quality: QualitySettings;
  frame: FrameSummary;
  render: { calls: number; triangles: number; points: number; lines: number };
  world: {
    tick: number;
    units: number;
    buildings: number;
    sites: number;
    nodes: number;
  };
}

/** Linear interpolation percentile over a sorted copy. Exported for tests. */
export function percentile(values: readonly number[], fraction: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const clamped = Math.max(0, Math.min(1, fraction));
  const index = (sorted.length - 1) * clamped;
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  const a = sorted[lower] ?? 0;
  const b = sorted[upper] ?? a;
  return a + (b - a) * (index - lower);
}

export class PerformanceMonitor {
  private readonly frameTimesMs: number[] = [];
  private elapsedMs = 0;
  private lastNow: number | null = null;

  constructor(private readonly maxSamples = 3600) {}

  sample(now: number): void {
    if (this.lastNow !== null) {
      const frameMs = now - this.lastNow;
      // Ignore tab-suspension gaps; they do not describe renderer performance.
      if (frameMs > 0 && frameMs < 250) {
        this.frameTimesMs.push(frameMs);
        this.elapsedMs += frameMs;
        if (this.frameTimesMs.length > this.maxSamples) {
          const removed = this.frameTimesMs.shift();
          if (removed !== undefined) this.elapsedMs -= removed;
        }
      }
    }
    this.lastNow = now;
  }

  reset(): void {
    this.frameTimesMs.length = 0;
    this.elapsedMs = 0;
    this.lastNow = null;
  }

  summary(): FrameSummary {
    const sampleCount = this.frameTimesMs.length;
    const averageFrameMs = sampleCount === 0 ? 0 : this.elapsedMs / sampleCount;
    return {
      sampleCount,
      elapsedSeconds: this.elapsedMs / 1000,
      averageFps: averageFrameMs === 0 ? 0 : 1000 / averageFrameMs,
      averageFrameMs,
      p50FrameMs: percentile(this.frameTimesMs, 0.5),
      p95FrameMs: percentile(this.frameTimesMs, 0.95),
      worstFrameMs: sampleCount === 0 ? 0 : Math.max(...this.frameTimesMs),
    };
  }

  report(
    renderer: THREE.WebGLRenderer,
    world: World,
    quality: QualitySettings,
  ): PerformanceReport {
    const info = renderer.info.render;
    return {
      schemaVersion: 1,
      capturedAt: new Date().toISOString(),
      userAgent: navigator.userAgent,
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight,
        devicePixelRatio: window.devicePixelRatio,
      },
      quality: { ...quality },
      frame: this.summary(),
      render: {
        calls: info.calls,
        triangles: info.triangles,
        points: info.points,
        lines: info.lines,
      },
      world: {
        tick: world.tick,
        units: world.units.length,
        buildings: world.buildings.length,
        sites: world.sites.length,
        nodes: world.nodes.length,
      },
    };
  }
}

export function downloadPerformanceReport(report: PerformanceReport): void {
  const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const stamp = report.capturedAt.replace(/[:.]/g, '-');
  link.href = url;
  link.download = `longbarrow-performance-${report.quality.tier}-${stamp}.json`;
  link.click();
  URL.revokeObjectURL(url);
}
