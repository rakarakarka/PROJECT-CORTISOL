export type CursorStyle =
  | "default_crosshair"
  | "fuse_needle"
  | "limbo_bar"
  | "stasis_brackets"
  | "horizon_frame";

export type BlendQuadrant =
  | "I"
  | "II"
  | "III"
  | "IV"
  | "TOP_AXIS"
  | "LEFT_AXIS"
  | "BOTTOM_AXIS"
  | "RIGHT_AXIS"
  | "ORIGIN";

export interface EngineConstants {
  velocityMax: number;
  viscosity: number;
  gravityField: number;
  dampingCoefficient: number;
  noiseFrequency: number;
  entropyFactor: number;
}

export interface ProjectCortisolState {
  coordinates: {
    x: number;
    y: number;
  };
  engineConstants: EngineConstants;
  cursorProperties: {
    visualStyle: CursorStyle;
    xLocked: boolean;
    yLocked: boolean;
    elasticStretch: number;
  };
  artworkRegistry: Array<{
    stateId: string;
    assetUrl: string;
    blendQuadrant: BlendQuadrant;
    currentDisplacementWeight: number;
    opacityAlpha: number;
  }>;
  telemetryMetadata: {
    stateLabel: string;
    cortisolIndexCode: string;
    somaticDescriptionText: string;
    physiologicalSystemMetrics: string;
  };
}

export interface StateProfile {
  id: string;
  quadrant: BlendQuadrant;
  eyebrow: string;
  label: string;
  shortLabel: string;
  indexCode: string;
  telemetry: string;
  description: string;
  systemMetrics: string;
  cursor: CursorStyle;
  physics: EngineConstants;
  colorA: [number, number, number];
  colorB: [number, number, number];
}

export const AXIS_TOLERANCE = 0.05;

export const ARTWORK_ASSET = "/og.png";

export const PRODUCTION_SCROLL_CONFIGURATION = {
  lerp: 0.075,
  smoothWheel: true,
  normalizeWheel: true,
  wheelMultiplier: 0.8,
} as const;
