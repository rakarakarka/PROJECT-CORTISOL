import {
  AXIS_TOLERANCE,
  GLOBAL_PARTICLE_CAP,
  THEME_CONFIG,
  type MoodPhysicsConfig,
  type MoodProfile,
  type MoodQuadrant,
  type MoodVisualConfig,
  type ProjectCortisolGlobalState,
} from "./model";

export const STATE_PROFILES: MoodProfile[] = [
  {
    id: "01_EUPHORIC_ECSTASY",
    quadrant: "I",
    title: "EUPHORIC ECSTASY",
    subtitle: "High Energy + High Fulfillment",
    visceralDescription: "A sudden, overwhelming rush of validation. Your chest opens, your pulse accelerates, and every nerve feels charged with clean, unstoppable forward momentum. It is the absolute absence of doubt - pure, uncontained victory.",
    biometricHUD: "BIOMETRIC MAP // OPEN CHEST // FAST PULSE // FULL KINETIC RELEASE",
    imageAssetPath: "/assets/images/image_01_triumph.jpg",
    physicsConfig: { maxParticles: GLOBAL_PARTICLE_CAP, velocityMax: 12, viscosity: 0.04, gravity: -4.5, damping: 0.02, curlNoiseFrequency: 0.72 },
  },
  {
    id: "02_BOILING_TAR",
    quadrant: "II",
    title: "BOILING TAR",
    subtitle: "High Energy + High Disappointment",
    visceralDescription: "You want to scream, but there is nowhere for the sound to go. This is the suffocating weight of intense anger trapped inside the cold realization that your expectations were shattered. Your jaw clenches, your shoulders lock, and your energy churns endlessly in place, burning you out from the inside.",
    biometricHUD: "BIOMETRIC MAP // HIGH SYMPATHETIC TENSION // SHALLOW RESPIRATION // RESTRICTED KINETIC RELEASE",
    imageAssetPath: "/assets/images/image_02_resentment.jpg",
    physicsConfig: { maxParticles: GLOBAL_PARTICLE_CAP, velocityMax: 12, viscosity: 0.78, gravity: 3.2, damping: 0.06, curlNoiseFrequency: 0.75 },
  },
  {
    id: "03_SOMBER_GRACE",
    quadrant: "III",
    title: "SOMBER GRACE",
    subtitle: "Low Energy + High Disappointment",
    visceralDescription: "The fight is over. You have stopped pushing against what went wrong and simply let the exhaustion wash over you. It is a quiet, heavy sadness - the slow, peaceful surrender of letting go of what you hoped would happen. Everything feels slow, muted, and still.",
    biometricHUD: "BIOMETRIC MAP // HEAVY LIMBS // SLOW BREATH // QUIET RELEASE",
    imageAssetPath: "/assets/images/image_03_melancholy.jpg",
    physicsConfig: { maxParticles: GLOBAL_PARTICLE_CAP, velocityMax: 1.35, viscosity: 0.68, gravity: 7.4, damping: 0.11, curlNoiseFrequency: 0.08 },
  },
  {
    id: "04_PRISTINE_NIRVANA",
    quadrant: "IV",
    title: "PRISTINE NIRVANA",
    subtitle: "Low Energy + High Fulfillment",
    visceralDescription: "Total, absolute equilibrium. Your breathing is slow and deep, your muscles are completely relaxed, and your mind is perfectly quiet. You need nothing to change, nothing to happen, and nothing to prove. You are entirely safe, resting in the warmth of the present moment.",
    biometricHUD: "BIOMETRIC MAP // DEEP BREATH // SOFT MUSCLES // COMPLETE EASE",
    imageAssetPath: "/assets/images/image_04_stillness.jpg",
    physicsConfig: { maxParticles: GLOBAL_PARTICLE_CAP, velocityMax: 1.1, viscosity: 0.08, gravity: 0, damping: 0.06, curlNoiseFrequency: 0.04 },
  },
  {
    id: "05_THE_FUSE",
    quadrant: "AXIS_TOP",
    title: "THE FUSE",
    subtitle: "Pure High Energy / Zero Expectation Bias",
    visceralDescription: "Your entire body is on high alert, vibrating with raw energy, but you don't know yet whether to fight or celebrate. It is the razor-thin microsecond of suspense right before news drops - a tight, electric buzzing in your chest where anything could happen next.",
    biometricHUD: "BIOMETRIC MAP // BUZZING CHEST // HELD BREATH // VOLATILE RELEASE",
    imageAssetPath: "/assets/images/image_05_volatility.jpg",
    physicsConfig: { maxParticles: GLOBAL_PARTICLE_CAP, velocityMax: 12, viscosity: 0.03, gravity: -1.4, damping: 0.02, curlNoiseFrequency: 0.94 },
  },
  {
    id: "06_THE_LIMBO",
    quadrant: "AXIS_LEFT",
    title: "THE LIMBO",
    subtitle: "Pure Disappointment / Zero Energy Expression",
    visceralDescription: "Complete cognitive shutdown. The bad news has landed, but your mind hasn't decided how to react yet. You feel nothing at all - a cold, hollow numbness where time seems to slow down and everything around you feels detached, distant, and unreal.",
    biometricHUD: "BIOMETRIC MAP // COLD NUMBNESS // DISTANT FOCUS // MINIMAL RESPONSE",
    imageAssetPath: "/assets/images/image_06_numbness.jpg",
    physicsConfig: { maxParticles: GLOBAL_PARTICLE_CAP, velocityMax: 0.62, viscosity: 0.78, gravity: 5.2, damping: 0.1, curlNoiseFrequency: 0.04 },
  },
  {
    id: "07_THE_STASIS",
    quadrant: "AXIS_BOTTOM",
    title: "THE STASIS",
    subtitle: "Pure Serenity / Zero Expectation Bias",
    visceralDescription: "You have deliberately unplugged from the noise of the world. By expecting nothing and reacting to nothing, you create a fortress of absolute silence inside your mind. It is deep, restorative isolation - heavy, quiet, and completely untouched by external stress.",
    biometricHUD: "BIOMETRIC MAP // DEEP REST // QUIET SENSES // SEALED CALM",
    imageAssetPath: "/assets/images/image_07_stasis.jpg",
    physicsConfig: { maxParticles: GLOBAL_PARTICLE_CAP, velocityMax: 0.92, viscosity: 0.16, gravity: 0, damping: 0.08, curlNoiseFrequency: 0.03 },
  },
  {
    id: "08_THE_HORIZON",
    quadrant: "AXIS_RIGHT",
    title: "THE HORIZON",
    subtitle: "Pure Fulfillment / Zero Energy Expression",
    visceralDescription: "A long, deep exhale. The threat is gone, the work is done, and a profound wave of relief washes through your body. You feel warm, unburdened, and deeply content just sitting back and letting the world exist around you without needing to control it.",
    biometricHUD: "BIOMETRIC MAP // LONG EXHALE // WARM CHEST // FULL RELEASE",
    imageAssetPath: "/assets/images/image_08_relief.jpg",
    physicsConfig: { maxParticles: GLOBAL_PARTICLE_CAP, velocityMax: 3.1, viscosity: 0.05, gravity: -2.2, damping: 0.035, curlNoiseFrequency: 0.18 },
  },
];

export const ORIGIN_PROFILE = {
  id: "00_BIOLOGICAL_IDLE",
  quadrant: "ORIGIN" as const,
  title: "BIOLOGICAL IDLE",
  subtitle: "Expectation and expression at rest",
  visceralDescription: "Your breath and pulse move at their own gentle pace. Nothing is pulling you forward or holding you back. You are simply here, alive and settling.",
  biometricHUD: "BODY MAP // EVEN BREATH // STEADY PULSE // NEUTRAL WEIGHT",
  physicsConfig: { maxParticles: GLOBAL_PARTICLE_CAP, velocityMax: 0.96, viscosity: 0.12, gravity: 0, damping: 0.055, curlNoiseFrequency: 0.06 },
};

export const MOOD_VISUALS: Record<string, MoodVisualConfig> = {
  "00_BIOLOGICAL_IDLE": { cursorStyle: "default_crosshair", colorA: [0.96, 0.99, 1], colorB: [0.34, 0.53, 1] },
  "01_EUPHORIC_ECSTASY": { cursorStyle: "default_crosshair", colorA: [1, 0.99, 0.92], colorB: [1, 0.66, 0.18] },
  "02_BOILING_TAR": { cursorStyle: "default_crosshair", colorA: [1, 0.25, 0.09], colorB: [0.68, 0.02, 0.23] },
  "03_SOMBER_GRACE": { cursorStyle: "default_crosshair", colorA: [0.61, 0.78, 1], colorB: [0.18, 0.34, 0.62] },
  "04_PRISTINE_NIRVANA": { cursorStyle: "default_crosshair", colorA: [1, 0.98, 0.9], colorB: [0.72, 0.86, 0.9] },
  "05_THE_FUSE": { cursorStyle: "fuse_needle", colorA: [1, 1, 1], colorB: [0.64, 0.78, 1] },
  "06_THE_LIMBO": { cursorStyle: "limbo_bar", colorA: [0.5, 0.57, 0.68], colorB: [0.12, 0.18, 0.28] },
  "07_THE_STASIS": { cursorStyle: "stasis_brackets", colorA: [0.46, 1, 0.82], colorB: [0.02, 0.42, 0.51] },
  "08_THE_HORIZON": { cursorStyle: "horizon_frame", colorA: [1, 0.82, 0.5], colorB: [0.64, 0.46, 0.88] },
};

const profileByQuadrant = new Map<MoodQuadrant, MoodProfile>(STATE_PROFILES.map((profile) => [profile.quadrant, profile]));

export function clampCoordinate(value: number) {
  const clamped = Math.min(1, Math.max(-1, value));
  return Math.abs(clamped) <= AXIS_TOLERANCE ? 0 : clamped;
}

export function resolveProfile(x: number, y: number): MoodProfile | typeof ORIGIN_PROFILE {
  const nearX = Math.abs(x) <= AXIS_TOLERANCE;
  const nearY = Math.abs(y) <= AXIS_TOLERANCE;
  if (nearX && nearY) return ORIGIN_PROFILE;
  if (nearX) return profileByQuadrant.get(y > 0 ? "AXIS_TOP" : "AXIS_BOTTOM")!;
  if (nearY) return profileByQuadrant.get(x > 0 ? "AXIS_RIGHT" : "AXIS_LEFT")!;
  if (x > 0 && y > 0) return profileByQuadrant.get("I")!;
  if (x < 0 && y > 0) return profileByQuadrant.get("II")!;
  if (x < 0 && y < 0) return profileByQuadrant.get("III")!;
  return profileByQuadrant.get("IV")!;
}

const interpolatedKeys: Array<Exclude<keyof MoodPhysicsConfig, "maxParticles">> = [
  "velocityMax", "viscosity", "gravity", "damping", "curlNoiseFrequency",
];

function bilinear(key: (typeof interpolatedKeys)[number], x: number, y: number) {
  const nx = (Math.min(1, Math.max(-1, x)) + 1) * 0.5;
  const ny = (Math.min(1, Math.max(-1, y)) + 1) * 0.5;
  const q1 = profileByQuadrant.get("I")!.physicsConfig[key];
  const q2 = profileByQuadrant.get("II")!.physicsConfig[key];
  const q3 = profileByQuadrant.get("III")!.physicsConfig[key];
  const q4 = profileByQuadrant.get("IV")!.physicsConfig[key];
  return (q3 * (1 - nx) + q4 * nx) * (1 - ny) + (q2 * (1 - nx) + q1 * nx) * ny;
}

export function samplePhysics(x: number, y: number): MoodPhysicsConfig {
  const profile = resolveProfile(x, y);
  const isAxis = profile.quadrant.startsWith("AXIS");
  const axisWeight = isAxis ? 1 - Math.min(1, Math.min(Math.abs(x), Math.abs(y)) / AXIS_TOLERANCE) : 0;
  const result = Object.fromEntries(interpolatedKeys.map((key) => {
    const fieldValue = bilinear(key, x, y);
    return [key, fieldValue * (1 - axisWeight) + profile.physicsConfig[key] * axisWeight];
  })) as Pick<MoodPhysicsConfig, (typeof interpolatedKeys)[number]>;
  return {
    ...result,
    maxParticles: GLOBAL_PARTICLE_CAP,
  };
}

export function createState(x = 0, y = 0): ProjectCortisolGlobalState {
  return {
    inputCoordinates: { x: clampCoordinate(x), y: clampCoordinate(y) },
    scrollState: { currentStage: "SANDBOX", progress: 0, activeFocusMoodId: null },
    themeConfig: THEME_CONFIG,
  };
}

export function getMoodIndex(id: string) {
  return Math.max(0, STATE_PROFILES.findIndex((profile) => profile.id === id));
}
