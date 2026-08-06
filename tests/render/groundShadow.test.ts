import { describe, expect, it } from 'vitest';
import { createGroundShadow, groundShadowMaterial } from '../../src/render/groundShadow';

describe('contact shadows (visual overhaul: grounding)', () => {
  it('shares one material across every caster', () => {
    // A ShaderMaterial per unit means a shader compile per unit, which breaks
    // the 100-unit target on its own — the trap materials.ts exists to avoid.
    const a = createGroundShadow(0.4);
    const b = createGroundShadow(0.4);
    expect(a.material).toBe(b.material);
    expect(a.material).toBe(groundShadowMaterial());
  });

  it('shares one geometry too', () => {
    expect(createGroundShadow(0.4).geometry).toBe(createGroundShadow(1.2).geometry);
  });

  it('scales with the caster and spreads wider than it', () => {
    // Matching the radius exactly reads as a printed disc rather than contact.
    const small = createGroundShadow(0.4);
    const large = createGroundShadow(2.2);
    expect(large.scale.x).toBeGreaterThan(small.scale.x);
    expect(small.scale.x).toBeGreaterThan(0.4);
  });

  it('sits just clear of the ground, never below or floating', () => {
    const s = createGroundShadow(0.4);
    expect(s.position.y).toBeGreaterThan(0);
    expect(s.position.y).toBeLessThan(0.1);
  });

  it('is violet-shifted, never black (D-005)', () => {
    // Shade shifts hue rather than going to zero. A black blob under every unit
    // is the fastest way to make a painterly scene look cheap.
    const c = groundShadowMaterial().uniforms['uColor']!.value as { r: number; g: number; b: number };
    expect(c.r + c.g + c.b).toBeGreaterThan(0);
    expect(c.b).toBeGreaterThan(c.g);
  });

  it('does not write depth, so casters never occlude their own shadow', () => {
    expect(groundShadowMaterial().depthWrite).toBe(false);
    expect(groundShadowMaterial().transparent).toBe(true);
  });
});
