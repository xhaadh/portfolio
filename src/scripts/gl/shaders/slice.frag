// Slice fragment shader: grey + translucent by default, full colour on hover / when selected,
// duotoned into the page colour for preview-mode neighbours. Outputs premultiplied alpha.
precision highp float;

uniform sampler2D uTex;
uniform vec2 uScale;      // object-fit: cover
uniform vec2 uParallax;   // pan inside the plane (uv units)
uniform float uHover;     // 0..1
uniform float uColor;     // 0..1 forced colour (selected plane)
uniform float uAlpha;
uniform float uTintAmt;
uniform float uGreyAlpha;
uniform vec3 uTint;

varying vec2 vUv;
varying float vDepth;

void main() {
  vec2 uv = (vUv - .5) * uScale + .5 + uParallax;
  vec4 tex = texture2D(uTex, uv);
  float g = (tex.r + tex.g + tex.b) / 3.;

  vec4 c = mix(vec4(vec3(g), uGreyAlpha), vec4(tex.rgb, 1.), clamp(vDepth + uHover + uColor, 0., 1.));

  // Duotone: shadows -> darker page colour, highlights -> lighter page colour.
  vec3 duo = mix(uTint * .58, mix(uTint, vec3(1.), .36), smoothstep(.04, .96, g));
  c = mix(c, vec4(duo, 1.), uTintAmt);

  float a = c.a * uAlpha * tex.a;
  gl_FragColor = vec4(c.rgb * a, a);
}
