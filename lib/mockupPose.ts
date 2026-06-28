export type MockupOrientation = "upright" | "showcase_upright" | "tilt_left" | "tilt_right";
export type MockupScale = "compact" | "standard" | "hero";
export type MockupPlacement = "center" | "left" | "right" | "auto";

export type MockupPose = {
  orientation: MockupOrientation;
  scale: MockupScale;
  placement: MockupPlacement;
};

/** Per-slide ASO poses — product-first, readable, varied (competitor-aligned). */
export const SLIDE_MOCKUP_POSE_PRESETS: MockupPose[] = [
  { orientation: "showcase_upright", scale: "hero", placement: "center" },
  { orientation: "upright", scale: "standard", placement: "center" },
  { orientation: "showcase_upright", scale: "standard", placement: "center" },
  { orientation: "upright", scale: "standard", placement: "center" },
  { orientation: "upright", scale: "standard", placement: "center" },
];

export const DEFAULT_MOCKUP_POSE: MockupPose = {
  orientation: "showcase_upright",
  scale: "standard",
  placement: "center",
};

export function mockupPoseForSlide(slideNumber: number): MockupPose {
  return SLIDE_MOCKUP_POSE_PRESETS[Math.min(Math.max(slideNumber - 1, 0), SLIDE_MOCKUP_POSE_PRESETS.length - 1)];
}

export function normalizeMockupPose(raw: unknown, slideNumber?: number): MockupPose {
  const fallback = slideNumber ? mockupPoseForSlide(slideNumber) : DEFAULT_MOCKUP_POSE;
  if (!raw || typeof raw !== "object") return { ...fallback };

  const row = raw as Partial<MockupPose>;
  let orientation: MockupOrientation =
    row.orientation === "upright" ||
    row.orientation === "showcase_upright" ||
    row.orientation === "tilt_left" ||
    row.orientation === "tilt_right"
      ? row.orientation
      : fallback.orientation;

  return {
    orientation,
    scale:
      row.scale === "compact" || row.scale === "standard" || row.scale === "hero"
        ? row.scale
        : fallback.scale,
    placement:
      row.placement === "center" ||
      row.placement === "left" ||
      row.placement === "right" ||
      row.placement === "auto"
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

const SCALE_MULTIPLIER: Record<MockupScale, number> = {
  compact: 0.72,
  standard: 0.92,
  hero: 1.08,
};

export function mockupPoseScaleMultiplier(pose: MockupPose): number {
  return SCALE_MULTIPLIER[pose.scale];
}

/** Adjust layout scale to hit art-director phone height target (0–1 canvas fraction). */
export function phoneHeightLayoutScale(
  phoneHeightRatio: number | undefined,
  canvasHeight: number,
  computedPhoneHeight: number,
): number {
  if (!phoneHeightRatio || phoneHeightRatio <= 0 || computedPhoneHeight <= 0) return 1;
  const target = canvasHeight * phoneHeightRatio;
  const scale = target / computedPhoneHeight;
  return Math.max(0.78, Math.min(1.28, scale));
}

/** Max front-face width — raised for product-first centered mockups. */
export function perspectiveFrontWidthCap(canvasWidth: number, pose: MockupPose): number {
  const ratio =
    pose.scale === "hero" ? 0.72 : pose.scale === "compact" ? 0.58 : 0.68;
  return Math.round(canvasWidth * ratio * mockupPoseScaleMultiplier(pose));
}

export function applyMockupPlacementX(
  _phoneX: number,
  phoneW: number,
  canvasWidth: number,
  placement: Exclude<MockupPlacement, "auto">,
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
  const effectivePlacement =
    pose.placement === "auto" ? "right (default until subject-aware resolve)" : pose.placement;

  const scaleLine =
    pose.scale === "compact"
      ? "Phone mockup will be SMALLER — leave generous negative space around the device; background detail should read clearly."
      : pose.scale === "hero"
        ? "Phone mockup will be LARGE and dominant — keep the center-lower zone open but avoid clutter directly behind the device silhouette."
        : "Phone mockup at STANDARD size — balance headline zone with an open center-lower area.";

  const placementLine =
    effectivePlacement === "left"
      ? "Device sits on the LEFT — compose the RIGHT half with rich environment and bokeh. NO faces in the left device zone."
      : effectivePlacement === "right"
        ? "Device sits on the RIGHT — compose the LEFT half with lifestyle depth. Person/desk MUST be in the LEFT third only."
        : "Device is CENTERED — keep sides moderately calm; strongest interest can sit above or below the device band.";

  const tiltLine =
    pose.orientation === "tilt_left"
      ? "Device in premium 3D showcase (~20° yaw) with LEFT edge toward camera — visible side + readable front screen."
      : pose.orientation === "tilt_right"
        ? "Device in premium 3D showcase (~20° yaw) with RIGHT edge toward camera — visible side + readable front screen (SWAY reference)."
        : pose.orientation === "showcase_upright"
          ? "Device uses the premium 3D showcase mockup but stands straight with no extra rotation."
          : "Device faces camera flat-on — symmetric front view.";

  return [scaleLine, placementLine, tiltLine].join(" ");
}

/** Resolve auto placement to a concrete side for layout/prompts. */
export function resolveMockupPlacement(pose: MockupPose): Exclude<MockupPlacement, "auto"> {
  if (pose.placement === "auto") {
    return "center";
  }
  return pose.placement;
}

export const MOCKUP_ORIENTATION_OPTIONS: Array<{ value: MockupOrientation; label: string }> = [
  { value: "upright", label: "Front (flat)" },
  { value: "showcase_upright", label: "3D showcase — straight" },
  { value: "tilt_left", label: "3D showcase — left edge visible" },
  { value: "tilt_right", label: "3D showcase — right edge (SWAY hero)" },
];

export const MOCKUP_SCALE_OPTIONS: Array<{ value: MockupScale; label: string }> = [
  { value: "compact", label: "Small" },
  { value: "standard", label: "Medium" },
  { value: "hero", label: "Large" },
];

export const MOCKUP_PLACEMENT_OPTIONS: Array<{ value: MockupPlacement; label: string }> = [
  { value: "auto", label: "Auto (subject-aware)" },
  { value: "center", label: "Center" },
  { value: "left", label: "Show right bg" },
  { value: "right", label: "Show left bg" },
];
