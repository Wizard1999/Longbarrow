import { describe, expect, it } from 'vitest';
import { PerformanceMonitor, percentile } from '../../src/dev/performanceMonitor';

describe('percentile', () => {
  it('handles empty input and clamps the requested fraction', () => {
    expect(percentile([], 0.5)).toBe(0);
    expect(percentile([10, 20, 30], -1)).toBe(10);
    expect(percentile([10, 20, 30], 2)).toBe(30);
  });

  it('interpolates between adjacent samples', () => {
    expect(percentile([30, 10, 20], 0.5)).toBe(20);
    expect(percentile([10, 20, 30, 40], 0.25)).toBe(17.5);
  });
});

describe('PerformanceMonitor', () => {
  it('summarizes accepted frame intervals and ignores suspension gaps', () => {
    const monitor = new PerformanceMonitor();
    monitor.sample(1000);
    monitor.sample(1010);
    monitor.sample(1030);
    monitor.sample(2000); // ignored (> 250 ms)

    const summary = monitor.summary();
    expect(summary.sampleCount).toBe(2);
    expect(summary.averageFrameMs).toBe(15);
    expect(summary.averageFps).toBeCloseTo(66.666, 2);
    expect(summary.worstFrameMs).toBe(20);
  });
});
