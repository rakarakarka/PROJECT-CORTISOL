export const POSITION_SHADER = /* glsl */ `
  uniform sampler2D uOriginTexture;
  uniform float uTime;
  uniform float uDelta;
  uniform vec2 uCoordinates;
  uniform float uBoundaryRadius;

  float regenerationCurve(float progress) {
    return progress * progress * (3.0 - 2.0 * progress);
  }

  float soundWaveBoundary(vec3 point) {
    vec3 direction = normalize(point + vec3(0.0001));
    float longitude = atan(direction.z, direction.x);
    float latitude = asin(clamp(direction.y, -1.0, 1.0));
    float moodEnergy = max(abs(uCoordinates.x), abs(uCoordinates.y));
    float carrier = sin(longitude * 6.0 + uTime * (0.9 + moodEnergy * 0.34));
    float echo = sin(latitude * 10.0 - uTime * 1.24 + longitude * 2.0) * 0.38;
    float lowPulse = sin(uTime * 0.62 + longitude * 2.5 - latitude * 3.0) * 0.22;
    return uBoundaryRadius * (1.0 + (carrier + echo + lowPulse) * (0.025 + moodEnergy * 0.025));
  }

  void main() {
    vec2 uv = gl_FragCoord.xy / resolution.xy;
    vec4 position = texture2D(texturePosition, uv);
    vec3 velocity = texture2D(textureVelocity, uv).xyz;
    vec3 origin = texture2D(uOriginTexture, uv).xyz;
    float regenerationProgress = position.w;

    if (regenerationProgress > 0.0) {
      regenerationProgress = min(1.0, regenerationProgress + uDelta * 1.85);
      float travel = regenerationCurve(regenerationProgress);
      vec3 targetDirection = normalize(origin + vec3(0.0001));
      vec3 tangent = normalize(cross(targetDirection, vec3(0.0, 1.0, 0.0001)) + vec3(0.0001));
      float threadArc = sin(travel * 3.14159265) * 0.11;
      position.xyz = mix(targetDirection * 0.055, origin, travel) + tangent * threadArc;

      if (regenerationProgress >= 1.0) {
        position.xyz = origin;
        regenerationProgress = 0.0;
      }
    } else {
      position.xyz += velocity * uDelta;
      if (length(position.xyz) > soundWaveBoundary(position.xyz)) {
        position.xyz = normalize(origin + vec3(0.0001)) * 0.055;
        regenerationProgress = 0.01;
      }
    }

    position.w = regenerationProgress;
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
  uniform float uBoundaryRadius;
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

  float soundWaveBoundary(vec3 point) {
    vec3 direction = normalize(point + vec3(0.0001));
    float longitude = atan(direction.z, direction.x);
    float latitude = asin(clamp(direction.y, -1.0, 1.0));
    float moodEnergy = max(abs(uCoordinates.x), abs(uCoordinates.y));
    float carrier = sin(longitude * 6.0 + uTime * (0.9 + moodEnergy * 0.34));
    float echo = sin(latitude * 10.0 - uTime * 1.24 + longitude * 2.0) * 0.38;
    float lowPulse = sin(uTime * 0.62 + longitude * 2.5 - latitude * 3.0) * 0.22;
    return uBoundaryRadius * (1.0 + (carrier + echo + lowPulse) * (0.025 + moodEnergy * 0.025));
  }

  void main() {
    vec2 uv = gl_FragCoord.xy / resolution.xy;
    vec4 positionData = texture2D(texturePosition, uv);
    vec3 position = positionData.xyz;
    vec3 velocity = texture2D(textureVelocity, uv).xyz;
    vec3 origin = texture2D(uOriginTexture, uv).xyz;
    float regenerationProgress = positionData.w;

    float respiratory = sin(6.28318530718 * uTime / 4.5);
    float vascular = cos(6.28318530718 * uTime / 1.2);
    float biologicalScale = 1.0 + 0.035 * respiratory * vascular;
    vec3 target = origin * biologicalScale;
    float orbitAngle = uTime * (0.045 + abs(uCoordinates.y) * 0.035);
    mat2 orbitRotation = mat2(cos(orbitAngle), -sin(orbitAngle), sin(orbitAngle), cos(orbitAngle));
    target.xz = orbitRotation * target.xz;
    float membraneWave = sin(origin.x * 2.8 + uTime * 0.62)
      * cos(origin.y * 3.1 - uTime * 0.48)
      * sin(origin.z * 2.4 + uTime * 0.37);
    target += normalize(origin + vec3(0.0001)) * membraneWave * (0.035 + abs(uCoordinates.y) * 0.045);

    float fulfillment = max(uCoordinates.x, 0.0);
    float disappointment = max(-uCoordinates.x, 0.0);
    float anger = max(uCoordinates.y, 0.0);
    float serenity = max(-uCoordinates.y, 0.0);
    float distanceToTarget = length(position - target);
    float distanceFromCenter = length(position);

    vec3 force = (target - position) * (0.16 + serenity * 0.25 - disappointment * 0.08);
    vec3 radial = normalize(position + vec3(0.0001));
    force += radial * fulfillment * (1.2 + anger * 3.8);
    force.y += fulfillment * (0.12 + fulfillment * 0.18) - uGravity * 0.028;

    vec3 generativeFlow = curlField(position, uTime, uNoiseFrequency);
    generativeFlow += curlField(position * 1.73 + vec3(2.4, -1.7, 0.8), -uTime * 0.63, uNoiseFrequency * 0.62) * 0.48;
    generativeFlow += curlField(position * 0.47 - vec3(1.2, 0.5, 2.1), uTime * 0.31, uNoiseFrequency * 1.4) * 0.24;
    force += generativeFlow * (0.06 + uEntropy * 0.92 + anger * 0.18);
    force += vec3(
      sin(uTime * 0.37 + position.y * 0.22),
      cos(uTime * 0.29 + position.z * 0.18),
      sin(uTime * 0.23 - position.x * 0.2)
    ) * (0.05 + serenity * 0.05);
    force.y -= clamp(uScrollVelocity * 0.018, -0.42, 0.42);

    float trapped = anger * disappointment;
    float pressure = smoothstep(0.78, 1.0, sin(uTime * 1.7 + uv.x * 43.0 + uv.y * 29.0));
    force += radial * trapped * pressure * 2.1;
    force.y -= trapped * pressure * 0.5;

    force.y -= disappointment * (0.12 + distanceToTarget * 0.05);
    force.y -= position.y * max(max(fulfillment, disappointment), anger) * 0.045;
    force.y -= smoothstep(0.2, 0.8, uScrollProgress) * 0.75;

    float reactiveBoundaryRadius = soundWaveBoundary(position);
    float boundaryInfluence = smoothstep(reactiveBoundaryRadius * 0.68, reactiveBoundaryRadius * 0.96, distanceFromCenter);
    float outwardSpeed = max(dot(velocity, radial), 0.0);
    float boundaryEcho = cos(uTime * (0.9 + max(abs(uCoordinates.x), abs(uCoordinates.y)) * 0.34)
      + atan(radial.z, radial.x) * 6.0);
    force -= radial * boundaryInfluence * (4.4 + outwardSpeed * 2.0);
    force += radial * boundaryInfluence * boundaryEcho * (0.18 + uEntropy * 0.32);
    velocity -= radial * outwardSpeed * boundaryInfluence * 0.72;

    if (regenerationProgress > 0.0) {
      vec3 threadDirection = normalize(origin - position + vec3(0.0001));
      velocity = threadDirection * (2.2 + sin(regenerationProgress * 3.14159265) * 2.8);
      gl_FragColor = vec4(velocity, 1.0);
      return;
    }

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
  varying float vRegeneration;
  varying float vRegenerationProgress;

  float randomSeed(float seed) {
    return fract(sin(seed * 12.9898) * 43758.5453);
  }

  vec3 loadingVortex() {
    float radialSeed = randomSeed(particleIndex + 3.7);
    float angularSeed = randomSeed(particleIndex * 1.371 + 11.2);
    float depthSeed = randomSeed(particleIndex * 0.713 + 27.4);
    float armSeed = floor(randomSeed(particleIndex * 2.193 + 5.8) * 4.0);
    float radius = 0.12 + pow(radialSeed, 0.68) * 5.35;
    float deceleration = exp(-0.055 * max(0.0, (uLoadPhase - 0.78) * 250.0));
    float inwardVelocity = (0.52 + 1.15 / (0.6 + radius)) * deceleration;
    float turbulentOffset = sin(radius * 3.7 + angularSeed * 9.0 - uTime * 0.55) * 0.15
      + cos(radius * 6.2 - depthSeed * 7.0 + uTime * 0.31) * 0.08;
    float angle = armSeed * 1.570796327 + radius * 1.42 + angularSeed * 0.2 + turbulentOffset + uTime * inwardVelocity;
    float funnel = smoothstep(0.0, 4.8, radius);
    float depth = (depthSeed - 0.5) * (0.12 + radius * 0.24) - (1.0 - funnel) * 0.82;
    vec3 vortex = vec3(cos(angle) * radius, sin(angle) * radius * 0.68, depth);
    vortex.x += sin(vortex.y * 1.7 + uTime * 0.34) * 0.18 * funnel;
    vortex.y += cos(vortex.x * 1.35 - uTime * 0.27) * 0.12 * funnel;
    return vortex;
  }

  void main() {
    if (particleIndex >= uActiveParticleCount) {
      gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
      gl_PointSize = 0.0;
      return;
    }
    vec4 simulatedData = texture2D(uPositionTexture, uv);
    vec3 simulated = simulatedData.xyz;
    vec3 velocity = texture2D(uVelocityTexture, uv).xyz;
    vec3 vortex = loadingVortex();
    float reveal = smoothstep(0.79, 1.02, uLoadPhase);
    float inversion = smoothstep(0.985, 1.0, uLoadPhase) * (1.0 - smoothstep(1.0, 1.08, uLoadPhase));
    vec3 position = mix(vortex, simulated, reveal);
    position += normalize(simulated + vec3(0.001)) * inversion * 0.58;

    float emotionalAmplitude = max(abs(uCoordinates.x), abs(uCoordinates.y));
    float membrane = sin(particleIndex * 0.017 + uTime * (0.42 + emotionalAmplitude * 0.26)) * 0.045 * emotionalAmplitude;
    position += normalize(position + vec3(0.001)) * membrane;
    position.y -= smoothstep(0.18, 0.38, uScrollProgress) * 1.2;
    position.z -= smoothstep(0.2, 0.5, uScrollProgress) * 2.5;

    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    vec2 screenVelocity = (modelViewMatrix * vec4(velocity, 0.0)).xy;
    float velocityMagnitude = length(velocity);
    vMotion = normalize(screenVelocity + vec2(0.0001));
    vMotionAmount = smoothstep(0.18, 4.0, velocityMagnitude);
    vRegenerationProgress = simulatedData.w;
    vRegeneration = smoothstep(0.01, 0.12, simulatedData.w)
      * (1.0 - smoothstep(0.86, 1.0, simulatedData.w));
    gl_Position = projectionMatrix * mvPosition;
    float expression = max(uCoordinates.y, 0.0);
    float vortexCore = (1.0 - reveal) * (1.0 - smoothstep(0.0, 1.45, length(vortex.xy)));
    float basePointSize = uPointScale * (1.65 + expression * 1.6) / -mvPosition.z;
    float shutterLength = min(20.0, 2.0 + velocityMagnitude * 3.1);
    float regenerationThreadLength = mix(basePointSize, 20.0, vRegeneration);
    gl_PointSize = clamp(max(max(basePointSize, shutterLength * vMotionAmount), regenerationThreadLength), 0.65, 20.0);
    vEnergy = max(expression, vortexCore);
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
  varying float vRegeneration;
  varying float vRegenerationProgress;

  void main() {
    vec2 p = gl_PointCoord - 0.5;
    float halfTrail = mix(0.48 * vMotionAmount, 0.49, vRegeneration);
    float alongTrail = clamp(dot(p, vMotion), -halfTrail, halfTrail);
    vec2 centeredShutterTrail = p - vMotion * alongTrail;
    float radius = length(centeredShutterTrail);
    float edge = mix(mix(0.48, 0.11, vMotionAmount), 0.034, vRegeneration);
    float alpha = smoothstep(edge, 0.018, radius);
    float core = smoothstep(edge * 0.42, 0.0, radius);
    vec3 color = mix(uColorB, uColorA, core + (1.0 - vDepth) * 0.38);
    float birthSpark = smoothstep(0.76, 0.98, vRegenerationProgress);
    color += vec3(core * (0.35 + vEnergy * 0.65) + vRegeneration * 0.34 + birthSpark * 0.28);
    float threadEnvelope = mix(1.0, sin(vRegenerationProgress * 3.14159265), vRegeneration);
    gl_FragColor = vec4(color, alpha * threadEnvelope * uOpacity);
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
