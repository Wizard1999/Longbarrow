import * as THREE from 'three';
import { PALETTE } from './palette';

/**
 * Contact shadows: a soft ellipse laid on the ground under every unit and
 * building.
 *
 * Not a substitute for the shadow map — a companion to it, and the only
 * grounding that exists at all on the low tier, where `QUALITY.low.shadows` is
 * false. Without this, units on a weak machine visibly float: nothing sits *in*
 * the world, everything sits *on* it, and the eye reads the whole board as
 * decals on a plane.
 *
 * It earns its place on medium and high too. A 1024–2048 shadow map spread
 * across a whole war table cannot resolve the tight darkening right beneath a
 * 0.4-radius unit; that contact point is exactly where the eye looks to decide
 * whether something is touching the ground.
 *
 * **Cost:** one shared geometry, one shared material, no texture, no second
 * render pass. The falloff is four instructions of fragment maths, so this is
 * affordable in every tier including the one that has shadows switched off
 * (D-006).
 */

const VERT = /* glsl */`
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const FRAG = /* glsl */`
uniform vec3 uColor;
uniform float uStrength;
varying vec2 vUv;

void main() {
  // Radial falloff from the centre of the quad. Squared so the core stays
  // dense and the edge dies away quickly — a linear ramp reads as a grey disc
  // rather than as contact.
  float d = length(vUv - 0.5) * 2.0;
  float a = 1.0 - smoothstep(0.0, 1.0, d);
  a *= a;
  if (a < 0.004) discard;
  gl_FragColor = vec4(uColor, a * uStrength);
}
`;

/**
 * One material for every contact shadow in the scene.
 *
 * Shared deliberately: a `ShaderMaterial` per unit would mean a shader compile
 * per unit and would break the 100-unit target on its own — the same trap
 * `materials.ts` exists to avoid.
 */
let shared: THREE.ShaderMaterial | null = null;
let sharedGeo: THREE.PlaneGeometry | null = null;

export function groundShadowMaterial(): THREE.ShaderMaterial {
  if (shared) return shared;
  shared = new THREE.ShaderMaterial({
    vertexShader: VERT,
    fragmentShader: FRAG,
    transparent: true,
    depthWrite: false,
    uniforms: {
      // Deep violet, never black. D-005 is explicit that shade shifts hue
      // rather than going to zero, and a black blob under every unit is the
      // single fastest way to make a painterly scene look cheap.
      uColor: { value: new THREE.Color(PALETTE.grass.shade).lerp(new THREE.Color(0x2a2340), 0.75) },
      uStrength: { value: 0.5 },
    },
  });
  return shared;
}

function shadowGeometry(): THREE.PlaneGeometry {
  if (!sharedGeo) {
    sharedGeo = new THREE.PlaneGeometry(1, 1);
    // Authored lying flat, so callers never have to remember to rotate it.
    sharedGeo.rotateX(-Math.PI / 2);
  }
  return sharedGeo;
}

/**
 * A contact shadow sized for something of `radius`, ready to add to a view
 * group that already sits at terrain height.
 *
 * Slightly wider than the caster: real contact shadows spread, and matching the
 * radius exactly reads as a printed disc.
 */
export function createGroundShadow(radius: number, spread = 2.6): THREE.Mesh {
  const mesh = new THREE.Mesh(shadowGeometry(), groundShadowMaterial());
  mesh.scale.setScalar(radius * spread);
  // Just clear of the ground. Large enough to beat z-fighting on a sloped
  // triangle, small enough that it never reads as hovering.
  mesh.position.y = 0.035;
  mesh.renderOrder = 1;
  // The board is a flat table seen from above; a shadow quad is never the thing
  // that makes or breaks a frustum test, and culling it separately from its
  // caster causes visible pops at the screen edge.
  mesh.frustumCulled = false;
  return mesh;
}
