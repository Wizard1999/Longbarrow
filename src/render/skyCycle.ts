import * as THREE from 'three';
import type { World } from '../core/types';
import { dayPhase, daylight } from '../sim/daynight';

/**
 * Presentation of the day/night cycle.
 *
 * Reads the sim clock and derives sun direction, light colour, sky and fog.
 * Strictly one-directional: this module never writes to the world. The time of
 * day is simulation state (`sim/daynight.ts`); this only draws it.
 *
 * The colours are hue paths in time rather than a single colour dimmed — the
 * same principle the surface shading uses. Dawn and dusk push warm and
 * desaturate the sky; night shifts blue and lifts ambient well above physical
 * darkness, because a strategy game that is genuinely hard to read at night is
 * a strategy game people will refuse to play at night.
 */

const NIGHT_SUN = new THREE.Color(0x5b6ea8);
const DAWN_SUN = new THREE.Color(0xff9a5c);
const NOON_SUN = new THREE.Color(0xffd9a0);

const NIGHT_SKY = new THREE.Color(0x1b2440);
const DAWN_SKY = new THREE.Color(0x86709c);
const NOON_SKY = new THREE.Color(0xbcd9f2);

const NIGHT_BG = new THREE.Color(0x151d33);
const DAWN_BG = new THREE.Color(0xd88f79);
const NOON_BG = new THREE.Color(0xa8d3e8);

const NIGHT_GROUND = new THREE.Color(0x232a3a);
const NOON_GROUND = new THREE.Color(0x7a6a44);

export interface SkyState {
  sunDir: THREE.Vector3;
  sunColor: THREE.Color;
  skyColor: THREE.Color;
  groundColor: THREE.Color;
  background: THREE.Color;
  fog: THREE.Color;
  /** 0 at deep night, 1 at noon — drives shadow strength and exposure. */
  light: number;
}

const state: SkyState = {
  sunDir: new THREE.Vector3(),
  sunColor: new THREE.Color(),
  skyColor: new THREE.Color(),
  groundColor: new THREE.Color(),
  background: new THREE.Color(),
  fog: new THREE.Color(),
  light: 1,
};

/** Blend a → b → c across t in [0,1], with b at the midpoint. */
function ramp(out: THREE.Color, a: THREE.Color, b: THREE.Color, c: THREE.Color, t: number): void {
  if (t < 0.5) out.copy(a).lerp(b, t * 2);
  else out.copy(b).lerp(c, (t - 0.5) * 2);
}

export function sampleSky(world: World): SkyState {
  const phase = dayPhase(world);
  const light = daylight(world);

  // Sun tracks a real arc: rises in the east, sets in the west, and dips below
  // the horizon at night so the moon-ish key comes from the opposite side.
  const angle = (phase - 0.25) * Math.PI * 2;
  const elevation = Math.sin(angle);
  state.sunDir.set(Math.cos(angle), Math.abs(elevation) * 0.85 + 0.18, 0.28).normalize();

  ramp(state.sunColor, NIGHT_SUN, DAWN_SUN, NOON_SUN, light);
  ramp(state.skyColor, NIGHT_SKY, DAWN_SKY, NOON_SKY, light);
  ramp(state.background, NIGHT_BG, DAWN_BG, NOON_BG, light);
  state.groundColor.copy(NIGHT_GROUND).lerp(NOON_GROUND, light);
  state.fog.copy(state.background).lerp(state.skyColor, 0.35);
  state.light = light;
  return state;
}
