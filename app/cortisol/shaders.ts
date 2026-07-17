export const POSITION_SHADER = /* glsl */ `
  uniform float uDelta;

  void main() {
    vec2 uv = gl_FragCoord.xy / resolution.xy;
    vec4 position = texture2D(texturePosition, uv);
    vec3 velocity = texture2D(textureVelocity, uv).xyz;
    position.xyz += velocity * uDelta;
    gl_FragColor = position;
  }
`;

export const VELOCITY_SHADER = /* glsl */ `
  uniform sampler2D uOriginTexture;
  uniform float uTime;
  uniform float uDelta;
  uniform vec2 uCoordinates;
  uniform float uVelocityMax;
  uniform float uViscosity;
  uniform float uGravity;
  uniform float uDamping;
  uniform float uNoiseFrequency;
  uniform float uEntropy;
  uniform float uScrollProgress;
  uniform float uScrollVelocity;

  vec3 curlField(vec3 p, float t, float f) {
    float scale = 1.2 + f * 4.5;
    // Vcurl = nabla x Psi, with each component driven by an orthogonal axis.
    return -scale * vec3(
      cos(p.z * scale + t * 0.9),
      cos(p.x * scale - t),
      cos(p.y * scale + t)
    );
  }

  void main() {
    vec2 uv = gl_FragCoord.xy / resolution.xy;
    vec3 position = texture2D(texturePosition, uv).xyz;
    vec3 velocity = texture2D(textureVelocity, uv).xyz;
    vec3 origin = texture2D(uOriginTexture, uv).xyz;

    float respiratory = sin(6.28318530718 * uTime / 4.5);
    float vascular = cos(6.28318530718 * uTime / 1.2);
    float biologicalScale = 1.0 + 0.035 * respiratory * vascular;
    vec3 target = origin * biologicalScale;

    float fulfillment = max(uCoordinates.x, 0.0);
    float disappointment = max(-uCoordinates.x, 0.0);
    float anger = max(uCoordinates.y, 0.0);
    float serenity = max(-uCoordinates.y, 0.0);
    float distanceToTarget = length(position - target);

    vec3 force = (target - position) * (0.16 + serenity * 0.25 - disappointment * 0.08);
    vec3 radial = normalize(position + vec3(0.0001));
    force += radial * fulfillment * (1.2 + anger * 3.8);
    force.y += fulfillment * (0.55 + fulfillment) - uGravity * 0.085;

    vec3 generativeFlow = curlField(position, uTime, uNoiseFrequency);
    generativeFlow += curlField(position * 1.73 + vec3(2.4, -1.7, 0.8), -uTime * 0.63, uNoiseFrequency * 0.62) * 0.48;
    generativeFlow += curlField(position * 0.47 - vec3(1.2, 0.5, 2.1), uTime * 0.31, uNoiseFrequency * 1.4) * 0.24;
    force += generativeFlow * (0.07 + uEntropy * 1.25 + anger * 0.42);
    force += vec3(
      sin(uTime * 0.37 + position.y * 0.22),
      cos(uTime * 0.29 + position.z * 0.18),
      sin(uTime * 0.23 - position.x * 0.2)
    ) * (0.05 + serenity * 0.05);
    force.y -= clamp(uScrollVelocity * 0.018, -0.42, 0.42);

    float trapped = anger * disappointment;
    float pressure = smoothstep(0.78, 1.0, sin(uTime * 3.2 + uv.x * 67.0 + uv.y * 41.0));
    force += radial * trapped * pressure * 5.5;
    force.y -= trapped * pressure * 3.2;

    force.y -= disappointment * (0.4 + distanceToTarget * 0.14);
    force.y -= smoothstep(0.2, 0.8, uScrollProgress) * 0.75;

    velocity += force * min(uDelta, 0.034);
    float resistance = exp(-(uViscosity * 3.2 + uDamping * 3.5) * uDelta);
    velocity *= resistance;

    float speed = length(velocity);
    float limit = max(0.28, uVelocityMax);
    if (speed > limit) velocity *= limit / speed;
    gl_FragColor = vec4(velocity, 1.0);
  }
`;

export const PARTICLE_VERTEX_SHADER = /* glsl */ `
  uniform sampler2D uPositionTexture;
  uniform sampler2D uVelocityTexture;
  uniform float uTime;
  uniform float uLoadPhase;
  uniform float uScrollProgress;
  uniform float uPointScale;
  uniform vec2 uCoordinates;
  uniform float uActiveParticleCount;
  attribute float particleIndex;
  varying float vEnergy;
  varying float vDepth;
  varying vec2 vMotion;
  varying float vMotionAmount;

  vec3 loadingSpiral() {
    float index = particleIndex / 30000.0;
    float deceleration = exp(-0.05 * max(0.0, (uLoadPhase - 0.8) * 260.0));
    float angle = index * 104.0 + uTime * 6.8 * deceleration;
    float radius = 0.2 + pow(index, 0.56) * 5.2;
    return vec3(cos(angle) * radius, sin(angle) * radius, 0.0);
  }

  void main() {
    if (particleIndex >= uActiveParticleCount) {
      gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
      gl_PointSize = 0.0;
      return;
    }
    vec3 simulated = texture2D(uPositionTexture, uv).xyz;
    vec3 velocity = texture2D(uVelocityTexture, uv).xyz;
    vec3 spiral = loadingSpiral();
    float reveal = smoothstep(0.82, 1.0, uLoadPhase);
    float inversion = smoothstep(0.985, 1.0, uLoadPhase) * (1.0 - smoothstep(1.0, 1.08, uLoadPhase));
    vec3 position = mix(spiral, simulated, reveal);
    position += normalize(simulated + vec3(0.001)) * inversion * 1.4;

    float topAxis = smoothstep(0.72, 1.0, uCoordinates.y) * (1.0 - smoothstep(0.04, 0.2, abs(uCoordinates.x)));
    position.xz *= 1.0 - topAxis * 0.92;

    float leftAxis = smoothstep(0.72, 1.0, -uCoordinates.x) * (1.0 - smoothstep(0.04, 0.2, abs(uCoordinates.y)));
    position.y = mix(position.y, -2.25 + sin(particleIndex * 0.21 + uTime) * 0.018, leftAxis);
    position.z *= 1.0 - leftAxis * 0.9;

    float bottomAxis = smoothstep(0.72, 1.0, -uCoordinates.y) * (1.0 - smoothstep(0.04, 0.2, abs(uCoordinates.x)));
    float cylinderRadius = max(0.18, floor(length(position.xz) * 4.0) / 4.0);
    position.xz = mix(position.xz, normalize(position.xz + vec2(0.001)) * cylinderRadius, bottomAxis * 0.82);

    float rightAxis = smoothstep(0.72, 1.0, uCoordinates.x) * (1.0 - smoothstep(0.04, 0.2, abs(uCoordinates.y)));
    position.x *= 1.0 + rightAxis * 1.8;
    position.y = mix(position.y, abs(position.y) * 0.3 + 0.65, rightAxis);
    position.y -= smoothstep(0.18, 0.38, uScrollProgress) * 1.2;
    position.z -= smoothstep(0.2, 0.5, uScrollProgress) * 2.5;

    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    vec2 screenVelocity = (modelViewMatrix * vec4(velocity, 0.0)).xy;
    float velocityMagnitude = length(velocity);
    vMotion = normalize(screenVelocity + vec2(0.0001));
    vMotionAmount = smoothstep(0.18, 4.0, velocityMagnitude);
    gl_Position = projectionMatrix * mvPosition;
    float expression = max(uCoordinates.y, 0.0);
    float basePointSize = uPointScale * (1.65 + expression * 1.6) / -mvPosition.z;
    float shutterLength = min(20.0, 2.0 + velocityMagnitude * 3.1);
    gl_PointSize = clamp(max(basePointSize, shutterLength * vMotionAmount), 0.65, 20.0);
    vEnergy = expression;
    vDepth = clamp((-mvPosition.z - 2.0) / 10.0, 0.0, 1.0);
  }
`;

export const PARTICLE_FRAGMENT_SHADER = /* glsl */ `
  uniform vec3 uColorA;
  uniform vec3 uColorB;
  uniform float uOpacity;
  varying float vEnergy;
  varying float vDepth;
  varying vec2 vMotion;
  varying float vMotionAmount;

  void main() {
    vec2 p = gl_PointCoord - 0.5;
    float halfTrail = 0.48 * vMotionAmount;
    float alongTrail = clamp(dot(p, vMotion), -halfTrail, halfTrail);
    vec2 centeredShutterTrail = p - vMotion * alongTrail;
    float radius = length(centeredShutterTrail);
    float edge = mix(0.48, 0.11, vMotionAmount);
    float alpha = smoothstep(edge, 0.018, radius);
    float core = smoothstep(edge * 0.42, 0.0, radius);
    vec3 color = mix(uColorB, uColorA, core + (1.0 - vDepth) * 0.38);
    color += vec3(core * (0.35 + vEnergy * 0.65));
    gl_FragColor = vec4(color, alpha * uOpacity);
  }
`;

export const ARTWORK_VERTEX_SHADER = /* glsl */ `
  uniform float uTime;
  uniform float uScrollVelocity;
  varying vec2 vUv;

  void main() {
    vUv = uv;
    vec3 p = position;
    p.z += sin(uv.x * 8.0 + uTime) * abs(uScrollVelocity) * 0.018;
    p.y += sin(uv.x * 3.14159) * abs(uScrollVelocity) * 0.008;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
  }
`;

export const ARTWORK_FRAGMENT_SHADER = /* glsl */ `
  uniform sampler2D uArtworkTexture;
  uniform float uScrollVelocity;
  uniform float uTime;
  uniform float uOpacity;
  uniform float uIndex;
  varying vec2 vUv;

  float random(vec2 p) {
    return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
  }

  void main() {
    vec2 distortedCoordinates = vUv;
    distortedCoordinates.x += sin(vUv.y * 12.0 + uTime + uIndex) * uScrollVelocity * 0.06;
    distortedCoordinates.y += sin(vUv.x * (7.0 + uIndex) - uTime * 0.35) * abs(uScrollVelocity) * 0.018;
    vec4 processedColor = texture2D(uArtworkTexture, distortedCoordinates);
    processedColor.r = texture2D(uArtworkTexture, distortedCoordinates + vec2(uScrollVelocity * 0.025, 0.0)).r;
    processedColor.b = texture2D(uArtworkTexture, distortedCoordinates - vec2(uScrollVelocity * 0.025, 0.0)).b;
    float noise = random(vUv + uTime * 0.0003) * 0.07;
    float grayscale = dot(processedColor.rgb, vec3(0.299, 0.587, 0.114));
    vec3 spectral = mix(vec3(grayscale), processedColor.rgb, 0.42 + mod(uIndex, 3.0) * 0.17);
    gl_FragColor = vec4(spectral + noise, processedColor.a * uOpacity);
  }
`;
