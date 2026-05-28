export type MockupOrientation = "upright" | "tilt_left" | "tilt_right";
export type MockupScale = "compact" | "standard" | "hero";
export type MockupPlacement = "center" | "left" | "right";

export type MockupPose = {
  orientation: MockupOrientation;
  scale: MockupScale;
  placement: MockupPlacement;
};

export const DEFAULT_MOCKUP_POSE: MockupPose = {
  orientation: "tilt_right",
  scale: "hero",
  placement: "right",
};

const SCALE_MULTIPLIER: Record<MockupScale, number> = {
  compact: 0.76,
  standard: 1,
  hero: 1.08,
};

/** Per-slide ASO poses — screenshot slides use 3D showcase (SWAY-style). */
export const SLIDE_MOCKUP_POSE_PRESETS: MockupPose[] = [
  { orientation: "tilt_right", scale: "hero", placement: "right" },
  { orientation: "tilt_right", scale: "standard", placement: "right" },
  { orientation: "tilt_left", scale: "standard", placement: "left" },
  { orientation: "tilt_right", scale: "standard", placement: "center" },
  { orientation: "upright", scale: "compact", placement: "center" },
];

export function mockupPoseForSlide(slideNumber: number): MockupPose {
  return SLIDE_MOCKUP_POSE_PRESETS[Math.min(Math.max(slideNumber - 1, 0), SLIDE_MOCKUP_POSE_PRESETS.length - 1)];
}

export function normalizeMockupPose(raw: unknown, slideNumber?: number): MockupPose {
  const fallback = slideNumber ? mockupPoseForSlide(slideNumber) : DEFAULT_MOCKUP_POSE;
  if (!raw || typeof raw !== "object") return { ...fallback };

  const row = raw as Partial<MockupPose>;
  let orientation: MockupOrientation =
    row.orientation === "upright" ||
    row.orientation === "tilt_left" ||
    row.orientation === "tilt_right"
      ? row.orientation
      : fallback.orientation;

  // Screenshot slides: flat upright reads as a pasted screenshot — use per-slide 3D preset.
  if (
    slideNumber &&
    slideNumber <= 4 &&
    orientation === "upright" &&
    fallback.orientation !== "upright"
  ) {
    orientation = fallback.orientation;
  }

  return {
    orientation,
    scale:
      row.scale === "compact" || row.scale === "standard" || row.scale === "hero"
        ? row.scale
        : fallback.scale,
    placement:
      row.placement === "center" || row.placement === "left" || row.placement === "right"
        ? row.placement
        : fallback.placement,
  };
}

/** Resolve pose for composite/export (slide presets when fields missing). */
export function resolveCompositeMockupPose(
  pose: MockupPose | undefined,
  slideNumber?: number,
): MockupPose {
  return normalizeMockupPose(pose, slideNumber);
}

export function mockupPoseScaleMultiplier(pose: MockupPose): number {
  return SCALE_MULTIPLIER[pose.scale];
}

/** Max front-face width on canvas for 3D tilts (SWAY-style, not full-bleed flat paste). */
export function perspectiveFrontWidthCap(canvasWidth: number, pose: MockupPose): number {
  const ratio =
    pose.scale === "hero" ? 0.7 : pose.scale === "compact" ? 0.52 : 0.62;
  return Math.round(canvasWidth * ratio * mockupPoseScaleMultiplier(pose));
}

export function applyMockupPlacementX(
  _phoneX: number,
  phoneW: number,
  canvasWidth: number,
  placement: MockupPlacement,
): number {
  const sideInset = Math.round(canvasWidth * 0.055);
  if (placement === "left") {
    return sideInset;
  }
  if (placement === "right") {
    return Math.max(sideInset, canvasWidth - phoneW - sideInset);
  }
  return Math.round((canvasWidth - phoneW) / 2);
}

export function mockupPoseCompositionHint(pose: MockupPose): string {
  const scaleLine =
    pose.scale === "compact"
      ? "Phone mockup will be SMALLER — leave generous negative space around the device; background detail should read clearly."
      : pose.scale === "hero"
        ? "Phone mockup will be LARGE and dominant — keep the center-lower zone open but avoid clutter directly behind the device silhouette."
        : "Phone mockup at STANDARD size — balance headline zone with an open center-lower area.";

  const placementLine =
    pose.placement === "left"
      ? "Device sits on the LEFT — compose the RIGHT half with rich environment and bokeh."
      : pose.placement === "right"
        ? "Device sits on the RIGHT — compose the LEFT half with lifestyle depth (SWAY hero: person/desk on left)."
        : "Device is CENTERED — keep sides moderately calm; strongest interest can sit above or below the device band.";

  const tiltLine =
    pose.orientation === "tilt_left"
      ? "Device in premium 3D showcase (~20° yaw) with LEFT edge toward camera — visible side + readable front screen."
      : pose.orientation === "tilt_right"
        ? "Device in premium 3D showcase (~20° yaw) with RIGHT edge toward camera — visible side + readable front screen (SWAY reference)."
        : "Device faces camera flat-on — symmetric front view.";

  return [scaleLine, placementLine, tiltLine].join(" ");
}

export const MOCKUP_ORIENTATION_OPTIONS: Array<{ value: MockupOrientation; label: string }> = [
  { value: "upright", label: "Front (flat)" },
  { value: "tilt_left", label: "3D showcase — left edge visible" },
  { value: "tilt_right", label: "3D showcase — right edge (SWAY hero)" },
];

export const MOCKUP_SCALE_OPTIONS: Array<{ value: MockupScale; label: string }> = [
  { value: "compact", label: "Small" },
  { value: "standard", label: "Medium" },
  { value: "hero", label: "Large" },
];

export const MOCKUP_PLACEMENT_OPTIONS: Array<{ value: MockupPlacement; label: string }> = [
  { value: "center", label: "Center" },
  { value: "left", label: "Show right bg" },
  { value: "right", label: "Show left bg" },
];
