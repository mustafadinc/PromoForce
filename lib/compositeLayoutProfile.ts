export type CompositeFormat = "app_store" | "square" | "portrait_social" | "landscape";

export type CompositeLayoutProfile = {
  format: CompositeFormat;
  refWidth: number;
  refHeight: number;
  maxTextBlockHeightRatio: number;
  phoneWidthRatio: number;
  minPhoneWidthRatio: number;
  verbSizeMax: number;
  verbSizeMin: number;
  verbSizeMaxCta: number;
  verbSizeMinCta: number;
  descriptorSize: number;
  subSizeMin: number;
  subSizeMax: number;
  fadeHeightRatio: number;
  fadeHeightRatioCta: number;
  showFeaturePills: boolean;
  textAlign: "center" | "left";
  textSafeWidthRatio: number;
  phoneAnchor: "center" | "right";
};

const APP_STORE_PROFILE: CompositeLayoutProfile = {
  format: "app_store",
  refWidth: 1280,
  refHeight: 2784,
  maxTextBlockHeightRatio: 0.32,
  phoneWidthRatio: 1020 / 1290,
  minPhoneWidthRatio: 0.58,
  verbSizeMax: 260,
  verbSizeMin: 72,
  verbSizeMaxCta: 200,
  verbSizeMinCta: 64,
  descriptorSize: 104,
  subSizeMin: 52,
  subSizeMax: 68,
  fadeHeightRatio: 0.28,
  fadeHeightRatioCta: 0.46,
  showFeaturePills: true,
  textAlign: "center",
  textSafeWidthRatio: 0.88,
  phoneAnchor: "center",
};

const SQUARE_PROFILE: CompositeLayoutProfile = {
  format: "square",
  refWidth: 1024,
  refHeight: 1024,
  maxTextBlockHeightRatio: 0.34,
  phoneWidthRatio: 0.5,
  minPhoneWidthRatio: 0.36,
  verbSizeMax: 76,
  verbSizeMin: 48,
  verbSizeMaxCta: 68,
  verbSizeMinCta: 44,
  descriptorSize: 44,
  subSizeMin: 26,
  subSizeMax: 34,
  fadeHeightRatio: 0.36,
  fadeHeightRatioCta: 0.42,
  showFeaturePills: false,
  textAlign: "center",
  textSafeWidthRatio: 0.86,
  phoneAnchor: "center",
};

const PORTRAIT_SOCIAL_PROFILE: CompositeLayoutProfile = {
  format: "portrait_social",
  refWidth: 1024,
  refHeight: 1536,
  maxTextBlockHeightRatio: 0.32,
  phoneWidthRatio: 0.64,
  minPhoneWidthRatio: 0.46,
  verbSizeMax: 92,
  verbSizeMin: 56,
  verbSizeMaxCta: 80,
  verbSizeMinCta: 52,
  descriptorSize: 56,
  subSizeMin: 30,
  subSizeMax: 40,
  fadeHeightRatio: 0.3,
  fadeHeightRatioCta: 0.4,
  showFeaturePills: false,
  textAlign: "center",
  textSafeWidthRatio: 0.88,
  phoneAnchor: "center",
};

const LANDSCAPE_PROFILE: CompositeLayoutProfile = {
  format: "landscape",
  refWidth: 1536,
  refHeight: 1024,
  maxTextBlockHeightRatio: 0.78,
  phoneWidthRatio: 0.3,
  minPhoneWidthRatio: 0.22,
  verbSizeMax: 72,
  verbSizeMin: 44,
  verbSizeMaxCta: 64,
  verbSizeMinCta: 40,
  descriptorSize: 40,
  subSizeMin: 24,
  subSizeMax: 32,
  fadeHeightRatio: 0.55,
  fadeHeightRatioCta: 0.55,
  showFeaturePills: false,
  textAlign: "left",
  textSafeWidthRatio: 0.46,
  phoneAnchor: "right",
};

export function getCompositeLayoutProfile(width: number, height: number): CompositeLayoutProfile {
  const ratio = height / width;

  if (ratio >= 2.05) {
    return APP_STORE_PROFILE;
  }
  if (ratio >= 1.35) {
    return PORTRAIT_SOCIAL_PROFILE;
  }
  if (ratio <= 0.75) {
    return LANDSCAPE_PROFILE;
  }
  return SQUARE_PROFILE;
}

export function layoutScale(width: number, height: number, profile: CompositeLayoutProfile) {
  const wScale = width / profile.refWidth;
  const hScale = height / profile.refHeight;
  return Math.max(wScale, hScale);
}
