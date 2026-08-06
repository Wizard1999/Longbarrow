import { describe, expect, it } from 'vitest';
import { createPainterlyMaterial } from '../../src/render/painterly';
import { PALETTE } from '../../src/render/palette';

// The blend is guarded by a define so that units and buildings keep compiling
// the exact shader they always did. These tests pin that guard.
describe('painterly terrain blend (D-035 ground legibility)', () => {
  it('a plain material compiles without the terrain define or uniforms', () => {
    const mat = createPainterlyMaterial(PALETTE.grass);
    expect(mat.defines).not.toHaveProperty('TERRAIN_BLEND');
    expect(mat.uniforms).not.toHaveProperty('uShadeHigh');
  });

  it('a terrain material declares the define and all blend uniforms', () => {
    const mat = createPainterlyMaterial(PALETTE.grass, {
      terrain: {
        high: PALETTE.grassHigh, steep: PALETTE.rock,
        heightLo: 0.25, heightHi: 1.45, slopeGain: 22,
      },
    });
    expect(mat.defines).toHaveProperty('TERRAIN_BLEND');
    for (const u of ['uShadeHigh', 'uMidHigh', 'uLitHigh', 'uShadeSteep', 'uMidSteep', 'uLitSteep', 'uBlendParams']) {
      expect(mat.uniforms).toHaveProperty(u);
    }
    const params = mat.uniforms['uBlendParams']!.value as { x: number; y: number; z: number };
    expect(params.x).toBeLessThan(params.y);
  });

  it('the high path is a distinct hue family from the valley grass', () => {
    // If someone later points both at the same path, the blend silently does
    // nothing and elevation legibility is lost while every test still passes —
    // except this one.
    expect(PALETTE.grassHigh.mid.getHex()).not.toBe(PALETTE.grass.mid.getHex());
  });
});
