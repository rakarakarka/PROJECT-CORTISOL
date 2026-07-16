import {
  ARTWORK_ASSET,
  AXIS_TOLERANCE,
  type EngineConstants,
  type ProjectCortisolState,
  type StateProfile,
} from "./model";

export const STATE_PROFILES: StateProfile[] = [
  {
    id: "triumph",
    quadrant: "I",
    eyebrow: "Quadrant I / +X +Y",
    label: "Euphoric Ecstasy",
    shortLabel: "Triumph",
    indexCode: "CRTSL-Q1-EX",
    telemetry: "EXPANSION_EVENT // RADIANT_VELOCITY",
    description: "Fulfillment ruptures into expression. Radiant trajectories accelerate beyond containment.",
    systemMetrics: "BUOYANCY -4.50 / ENTROPY .90 / DILATION 1.00",
    cursor: "default_crosshair",
    physics: { velocityMax: 8.8, viscosity: 0.08, gravityField: -4.5, dampingCoefficient: 0.02, noiseFrequency: 0.72, entropyFactor: 0.9 },
    colorA: [0.9, 0.98, 1],
    colorB: [0.45, 0.58, 1],
  },
  {
    id: "boiling-tar",
    quadrant: "II",
    eyebrow: "Quadrant II / -X +Y",
    label: "Boiling Tar",
    shortLabel: "Resentment",
    indexCode: "CRTSL-Q2-BT",
    telemetry: "PRESSURE_EVENT // VISCOSITY_LOCK",
    description: "Volatile expression is trapped in maximum resistance; sharp peaks fracture, choke, and implode.",
    systemMetrics: "GRAVITY 4.50 / VISCOSITY .95 / ENTROPY .75",
    cursor: "default_crosshair",
    physics: { velocityMax: 4.2, viscosity: 0.95, gravityField: 4.5, dampingCoefficient: 0.1, noiseFrequency: 0.72, entropyFactor: 0.75 },
    colorA: [1, 0.25, 0.09],
    colorB: [0.68, 0.02, 0.23],
  },
  {
    id: "somber-grace",
    quadrant: "III",
    eyebrow: "Quadrant III / -X -Y",
    label: "Somber Grace",
    shortLabel: "Melancholy",
    indexCode: "CRTSL-Q3-SG",
    telemetry: "DESCENT_EVENT // LUMINOUS_SETTLING",
    description: "Disappointment becomes serene. Heavy, near-silent filaments settle into a luminous lower boundary.",
    systemMetrics: "GRAVITY 9.80 / DAMPING .15 / ENTROPY .03",
    cursor: "default_crosshair",
    physics: { velocityMax: 1.05, viscosity: 0.82, gravityField: 9.8, dampingCoefficient: 0.15, noiseFrequency: 0.08, entropyFactor: 0.03 },
    colorA: [0.61, 0.78, 1],
    colorB: [0.18, 0.34, 0.62],
  },
  {
    id: "nirvana",
    quadrant: "IV",
    eyebrow: "Quadrant IV / +X -Y",
    label: "Pristine Nirvana",
    shortLabel: "Stillness",
    indexCode: "CRTSL-Q4-PN",
    telemetry: "EQUILIBRIUM_EVENT // ORBITAL_BREATH",
    description: "Fulfillment resolves into quiet equilibrium: weightless concentric structures breathe without urgency.",
    systemMetrics: "GRAVITY .00 / ENTROPY .02 / RESONANCE .96",
    cursor: "default_crosshair",
    physics: { velocityMax: 0.82, viscosity: 0.12, gravityField: 0, dampingCoefficient: 0.09, noiseFrequency: 0.06, entropyFactor: 0.02 },
    colorA: [0.9, 1, 0.98],
    colorB: [0.29, 0.95, 0.72],
  },
  {
    id: "fuse",
    quadrant: "TOP_AXIS",
    eyebrow: "Axis / X 0.00 Y +1.00",
    label: "The Fuse",
    shortLabel: "Vertical Volatility",
    indexCode: "CRTSL-AX-VF",
    telemetry: "AXIS_TRACK // VERTICAL_VOLATILITY",
    description: "A centered pillar of compressed voltage twitches upward with no lateral release.",
    systemMetrics: "X-LOCK TRUE / FREQUENCY .94 / VOLTAGE MAX",
    cursor: "fuse_needle",
    physics: { velocityMax: 7.6, viscosity: 0.03, gravityField: -1.4, dampingCoefficient: 0.02, noiseFrequency: 0.94, entropyFactor: 0.88 },
    colorA: [1, 1, 1],
    colorB: [0.64, 0.78, 1],
  },
  {
    id: "limbo",
    quadrant: "LEFT_AXIS",
    eyebrow: "Axis / X -1.00 Y 0.00",
    label: "The Limbo",
    shortLabel: "Cognitive Inertia",
    indexCode: "CRTSL-AX-LM",
    telemetry: "SYSTEM_ALERT // COGNITIVE_INERTIA_DETECTED",
    description: "Signal collapses toward a dim horizontal baseline; movement survives only as residual drift.",
    systemMetrics: "Y-LOCK TRUE / VISCOSITY .90 / SIGNAL .06",
    cursor: "limbo_bar",
    physics: { velocityMax: 0.42, viscosity: 0.9, gravityField: 6.4, dampingCoefficient: 0.14, noiseFrequency: 0.04, entropyFactor: 0.04 },
    colorA: [0.5, 0.57, 0.68],
    colorB: [0.12, 0.18, 0.28],
  },
  {
    id: "stasis",
    quadrant: "BOTTOM_AXIS",
    eyebrow: "Axis / X 0.00 Y -1.00",
    label: "The Stasis",
    shortLabel: "Harmonic Containment",
    indexCode: "CRTSL-AX-ST",
    telemetry: "STATIC_MATRIX // RESONANCE_CONTAINED",
    description: "Nested geometric wave tunnels pulse in deep emerald and sea-blue containment.",
    systemMetrics: "X-LOCK TRUE / ENTROPY .00 / HARMONIC .98",
    cursor: "stasis_brackets",
    physics: { velocityMax: 0.7, viscosity: 0.22, gravityField: 0, dampingCoefficient: 0.11, noiseFrequency: 0.03, entropyFactor: 0 },
    colorA: [0.46, 1, 0.82],
    colorB: [0.02, 0.42, 0.51],
  },
  {
    id: "horizon",
    quadrant: "RIGHT_AXIS",
    eyebrow: "Axis / X +1.00 Y 0.00",
    label: "The Horizon",
    shortLabel: "Decompression",
    indexCode: "CRTSL-AX-HR",
    telemetry: "SAFE_HORIZON // DECOMPRESSION_ACTIVE",
    description: "The center releases into an atmospheric horizontal aurora climbing toward the upper margin.",
    systemMetrics: "Y-LOCK TRUE / BUOYANCY -2.20 / LUMINANCE .92",
    cursor: "horizon_frame",
    physics: { velocityMax: 2.4, viscosity: 0.08, gravityField: -2.2, dampingCoefficient: 0.05, noiseFrequency: 0.18, entropyFactor: 0.15 },
    colorA: [0.92, 1, 1],
    colorB: [0.39, 0.72, 1],
  },
];

export const ORIGIN_PROFILE: StateProfile = {
  id: "origin",
  quadrant: "ORIGIN",
  eyebrow: "Origin / X 0.00 Y 0.00",
  label: "Biological Idle",
  shortLabel: "Neural Murmur",
  indexCode: "CRTSL-00-HRV",
  telemetry: "HOMEOSTASIS // HRV_SIGNAL_STABLE",
  description: "Respiratory and vascular frequencies interfere gently through a self-twining toroidal organism.",
  systemMetrics: "HRV 4.50S / VASCULAR 1.20S / AMPLITUDE .035",
  cursor: "default_crosshair",
  physics: { velocityMax: 0.72, viscosity: 0.18, gravityField: 0, dampingCoefficient: 0.08, noiseFrequency: 0.06, entropyFactor: 0.025 },
  colorA: [0.96, 0.99, 1],
  colorB: [0.34, 0.53, 1],
};

const profileByQuadrant = new Map(STATE_PROFILES.map((profile) => [profile.quadrant, profile]));

export function clampCoordinate(value: number) {
  return Math.min(1, Math.max(-1, value));
}

export function resolveProfile(x: number, y: number): StateProfile {
  const nearX = Math.abs(x) <= AXIS_TOLERANCE;
  const nearY = Math.abs(y) <= AXIS_TOLERANCE;
  if (nearX && nearY) return ORIGIN_PROFILE;
  if (nearX) return profileByQuadrant.get(y > 0 ? "TOP_AXIS" : "BOTTOM_AXIS")!;
  if (nearY) return profileByQuadrant.get(x > 0 ? "RIGHT_AXIS" : "LEFT_AXIS")!;
  if (x > 0 && y > 0) return profileByQuadrant.get("I")!;
  if (x < 0 && y > 0) return profileByQuadrant.get("II")!;
  if (x < 0 && y < 0) return profileByQuadrant.get("III")!;
  return profileByQuadrant.get("IV")!;
}

function bilinear(key: keyof EngineConstants, x: number, y: number) {
  const nx = (clampCoordinate(x) + 1) * 0.5;
  const ny = (clampCoordinate(y) + 1) * 0.5;
  const q1 = profileByQuadrant.get("I")!.physics[key];
  const q2 = profileByQuadrant.get("II")!.physics[key];
  const q3 = profileByQuadrant.get("III")!.physics[key];
  const q4 = profileByQuadrant.get("IV")!.physics[key];
  const top = q2 * (1 - nx) + q1 * nx;
  const bottom = q3 * (1 - nx) + q4 * nx;
  return bottom * (1 - ny) + top * ny;
}

export function samplePhysics(x: number, y: number): EngineConstants {
  const profile = resolveProfile(x, y);
  const axisWeight = profile.quadrant.includes("AXIS")
    ? 1 - Math.min(1, Math.min(Math.abs(x), Math.abs(y)) / AXIS_TOLERANCE)
    : 0;
  const keys: Array<keyof EngineConstants> = [
    "velocityMax", "viscosity", "gravityField", "dampingCoefficient", "noiseFrequency", "entropyFactor",
  ];
  return Object.fromEntries(keys.map((key) => {
    const fieldValue = bilinear(key, x, y);
    return [key, fieldValue * (1 - axisWeight) + profile.physics[key] * axisWeight];
  })) as unknown as EngineConstants;
}

export function createState(x = 0, y = 0): ProjectCortisolState {
  const profile = resolveProfile(x, y);
  return {
    coordinates: { x, y },
    engineConstants: samplePhysics(x, y),
    cursorProperties: {
      visualStyle: profile.cursor,
      xLocked: Math.abs(x) <= AXIS_TOLERANCE && Math.abs(y) > AXIS_TOLERANCE,
      yLocked: Math.abs(y) <= AXIS_TOLERANCE && Math.abs(x) > AXIS_TOLERANCE,
      elasticStretch: Math.max(Math.abs(x), Math.abs(y)),
    },
    artworkRegistry: STATE_PROFILES.map((item) => ({
      stateId: item.id,
      assetUrl: ARTWORK_ASSET,
      blendQuadrant: item.quadrant,
      currentDisplacementWeight: item.id === profile.id ? 1 : 0,
      opacityAlpha: item.id === profile.id ? 1 : 0.24,
    })),
    telemetryMetadata: {
      stateLabel: profile.label,
      cortisolIndexCode: profile.indexCode,
      somaticDescriptionText: profile.description,
      physiologicalSystemMetrics: profile.systemMetrics,
    },
  };
}
