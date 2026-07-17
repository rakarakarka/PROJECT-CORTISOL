export type MoodQuadrant =
  | "I"
  | "II"
  | "III"
  | "IV"
  | "AXIS_TOP"
  | "AXIS_LEFT"
  | "AXIS_BOTTOM"
  | "AXIS_RIGHT";

export interface MoodPhysicsConfig {
  maxParticles: number;
  velocityMax: number;
  viscosity: number;
  gravity: number;
  damping: number;
  curlNoiseFrequency: number;
}

export interface MoodProfile {
  id: string;
  quadrant: MoodQuadrant;
  title: string;
  subtitle: string;
  visceralDescription: string;
  biometricHUD: string;
  imageAssetPath: string;
  physicsConfig: MoodPhysicsConfig;
}

export interface ProjectCortisolGlobalState {
  inputCoordinates: {
    x: number;
    y: number;
  };
  scrollState: {
    currentStage: "SANDBOX" | "CLUSTER_ASSEMBLY" | "SINGLE_FOCUS";
    progress: number;
    activeFocusMoodId: string | null;
  };
  themeConfig: {
    baseBg: "#000000";
    gridLineColor: "rgba(255, 255, 255, 0.08)";
    primaryText: "#FFFFFF";
    secondaryText: "rgba(255, 255, 255, 0.6)";
  };
}

export interface MoodVisualConfig {
  cursorStyle: "default_crosshair" | "fuse_needle" | "limbo_bar" | "stasis_brackets" | "horizon_frame";
  colorA: [number, number, number];
  colorB: [number, number, number];
}

export const AXIS_TOLERANCE = 0.05;
export const GLOBAL_PARTICLE_CAP = 18_000;
export const PRELOADER_PARTICLE_COUNT = 30_000;

export const THEME_CONFIG: ProjectCortisolGlobalState["themeConfig"] = {
  baseBg: "#000000",
  gridLineColor: "rgba(255, 255, 255, 0.08)",
  primaryText: "#FFFFFF",
  secondaryText: "rgba(255, 255, 255, 0.6)",
};

export const PRODUCTION_SCROLL_CONFIGURATION = {
  lerp: 0.075,
  smoothWheel: true,
  normalizeWheel: true,
  wheelMultiplier: 0.8,
} as const;
