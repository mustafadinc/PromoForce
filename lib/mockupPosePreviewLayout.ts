import type { CSSProperties } from "react";
import type { MockupPose } from "@/lib/mockupPose";
import { usesPerspectiveMockup } from "@/lib/mockupPerspectiveGeometry";

/** Rough phone width as % of canvas — tuned to match export composite (~app store profile). */
const PREVIEW_WIDTH_RATIO: Record<MockupPose["scale"], number> = {
  compact: 0.58,
  standard: 0.72,
  hero: 0.88,
};

/** Max width in preview (3D adds horizontal footprint via side face). */
const PREVIEW_3D_WIDTH_CAP: Record<MockupPose["scale"], number> = {
  compact: 0.58,
  standard: 0.74,
  hero: 0.9,
};

export type MockupPreviewAnchor = "left" | "center" | "right";

export type MockupPosePreviewLayout = {
  phoneWidthPct: number;
  phoneBottomPct: number;
  /** Top band reserved for headline (device may slightly overlap in preview). */
  headlineReservePct: number;
  anchor: MockupPreviewAnchor;
  edgeInsetPct: number;
  showLeftBg: boolean;
  showRightBg: boolean;
};

export function getMockupPosePreviewLayout(pose: MockupPose): MockupPosePreviewLayout {
  let phoneWidthPct = PREVIEW_WIDTH_RATIO[pose.scale];
  if (usesPerspectiveMockup(pose.orientation)) {
    phoneWidthPct = Math.min(phoneWidthPct, PREVIEW_3D_WIDTH_CAP[pose.scale]);
  }
  phoneWidthPct = Math.min(0.92, phoneWidthPct);

  let anchor: MockupPreviewAnchor = "center";
  if (pose.placement === "left") {
    anchor = "left";
  } else if (pose.placement === "right") {
    anchor = "right";
  }

  return {
    phoneWidthPct,
    phoneBottomPct: 4,
    headlineReservePct: 26,
    anchor,
    edgeInsetPct: 7,
    showLeftBg: pose.placement === "right",
    showRightBg: pose.placement === "left",
  };
}

type RigStyleInput = {
  layout: MockupPosePreviewLayout;
  phoneScale?: number;
  yawDeg?: number;
  pitchDeg?: number;
};

/** CSS for preview rig — edge-anchored so placement changes are visible and nothing clips out. */
export function getPreviewRigStyle({
  layout,
  phoneScale = 1,
  yawDeg = 0,
  pitchDeg = 0,
}: RigStyleInput): CSSProperties {
  const rotate = `rotateY(${yawDeg}deg) rotateX(${-pitchDeg}deg) scale(${phoneScale})`;

  if (layout.anchor === "left") {
    return {
      left: `${layout.edgeInsetPct}%`,
      right: "auto",
      bottom: `${layout.phoneBottomPct}%`,
      transform: rotate,
      transformOrigin: "left bottom",
    };
  }

  if (layout.anchor === "right") {
    return {
      left: "auto",
      right: `${layout.edgeInsetPct}%`,
      bottom: `${layout.phoneBottomPct}%`,
      transform: rotate,
      transformOrigin: "right bottom",
    };
  }

  return {
    left: "50%",
    right: "auto",
    bottom: `${layout.phoneBottomPct}%`,
    transform: `translateX(-50%) ${rotate}`,
    transformOrigin: "center bottom",
  };
}

/** Upright (flat) phone box in preview. */
export function getPreviewUprightPhoneStyle(layout: MockupPosePreviewLayout): CSSProperties {
  const base: CSSProperties = {
    width: `${layout.phoneWidthPct * 100}%`,
    bottom: `${layout.phoneBottomPct}%`,
  };

  if (layout.anchor === "left") {
    return {
      ...base,
      left: `${layout.edgeInsetPct}%`,
      right: "auto",
      transform: "none",
      transformOrigin: "left bottom",
    };
  }

  if (layout.anchor === "right") {
    return {
      ...base,
      left: "auto",
      right: `${layout.edgeInsetPct}%`,
      transform: "none",
      transformOrigin: "right bottom",
    };
  }

  return {
    ...base,
    left: "50%",
    transform: "translateX(-50%)",
    transformOrigin: "center bottom",
  };
}
