// Slice vertex shader.
// Camera is placed so that 1 world unit == 1 CSS px on the z = 0 plane (see gl/renderer.ts).
attribute vec3 position;
attribute vec2 uv;

uniform mat4 modelMatrix;
uniform mat4 viewMatrix;
uniform mat4 projectionMatrix;

uniform float uRadius;       // px - radius of the magnification wave around screen centre
uniform float uStrength;     // z push at centre = uRadius * uStrength
uniform float uDepthToColor; // how much the bulge brings back colour
uniform float uMaxColor;
uniform float uSkew;         // velocity shear
uniform float uStretch;      // velocity vertical stretch
uniform float uTurn;         // per-plane rotation around its vertical axis (radians)

varying vec2 vUv;
varying float vDepth;

float io2(float t) { return t < .5 ? 2. * t * t : -1. + (4. - 2. * t) * t; }

void main() {
  vUv = uv;

  vec4 world = modelMatrix * vec4(position, 1.);
  vec3 centre = (modelMatrix * vec4(0., 0., 0., 1.)).xyz;

  // Velocity: shear + slight vertical stretch around the plane centre.
  float dy = world.y - centre.y;
  world.x += dy * uSkew;
  world.y = centre.y + dy * (1. + uStretch);

  // Turn: rotate the card around its own vertical axis (inner edge forward, outer edge back).
  float dx = world.x - centre.x;
  world.x = centre.x + dx * cos(uTurn);
  float turnZ = -dx * sin(uTurn);

  // Bulge: planes near the screen centre are pushed toward the camera.
  float dist = abs(world.x);
  float z = 0.;
  if (dist < uRadius) z = (uRadius - io2(dist / uRadius) * uRadius) * uStrength;
  vDepth = min(z * uDepthToColor, uMaxColor);

  gl_Position = projectionMatrix * viewMatrix * vec4(world.xy, world.z + z + turnZ, 1.);
}
