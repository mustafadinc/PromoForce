import type { MockupPlacement, MockupPose } from "@/lib/mockupPose";
import { mockupPoseScaleMultiplier, perspectiveFrontWidthCap } from "@/lib/mockupPose";

/** Approximate device keep-out on canvas (post-production overlay). */
export type MockupKeepOutRect = {
  x: number;
  y: number;
  width: number;
  height: number;
  openSide: "left" | "right" | "both";
};

const FRAME_ASPECT = 2796 / 1290;

export function estimateMockupKeepOutRect(
  canvasW: number,
  canvasH: number,
  pose: MockupPose,
  textBlockBottomRatio = 0.38,
): MockupKeepOutRect {
  const sizeMult = mockupPoseScaleMultiplier(pose);
  const textBottom = Math.round(canvasH * textBlockBottomRatio);
  const bottomMargin = Math.round(canvasH * 0.12);
  const topBound = textBottom + Math.round(canvasH * 0.04);
  const availableH = Math.max(0, canvasH - bottomMargin - topBound);

  let deviceW = Math.round(canvasW * 0.76 * sizeMult);
  const capW = perspectiveFrontWidthCap(canvasW, pose);
  if (deviceW > capW) deviceW = capW;

  let deviceH = Math.floor(deviceW * FRAME_ASPECT);
  if (deviceH > availableH && availableH > 0) {
    deviceH = availableH;
    deviceW = Math.floor(deviceH / FRAME_ASPECT);
  }

  const edgeInset = Math.round(canvasW * 0.055);
  let x: number;
  let openSide: MockupKeepOutRect["openSide"];

  if (pose.placement === "left") {
    x = edgeInset;
    openSide = "right";
  } else if (pose.placement === "right") {
    x = canvasW - edgeInset - deviceW;
    openSide = "left";
  } else {
    x = Math.round((canvasW - deviceW) / 2);
    openSide = "both";
  }

  const y = canvasH - bottomMargin - deviceH;

  return {
    x,
    y,
    width: deviceW,
    height: deviceH,
    openSide,
  };
}

export function mockupKeepOutPromptBlock(
  canvasW: number,
  canvasH: number,
  pose: MockupPose,
): string {
  const rect = estimateMockupKeepOutRect(canvasW, canvasH, pose);
  const xPct = Math.round((rect.x / canvasW) * 100);
  const yPct = Math.round((rect.y / canvasH) * 100);
  const wPct = Math.round((rect.width / canvasW) * 100);
  const hPct = Math.round((rect.height / canvasH) * 100);

  const openSideLine =
    rect.openSide === "left"
      ? "Place ALL people, faces, hands, and primary focal subjects in the LEFT ~35% of the frame ONLY."
      : rect.openSide === "right"
        ? "Place ALL people, faces, hands, and primary focal subjects in the RIGHT ~35% of the frame ONLY."
        : "Keep sides moderately calm; strongest interest above or below the device band, not behind it.";

  return [
    "DEVICE KEEP-OUT ZONE (post-production phone overlay — CRITICAL):",
    `- A phone mockup will cover roughly x=${xPct}%-${xPct + wPct}%, y=${yPct}%-${yPct + hPct}% of the canvas.`,
    "- Do NOT place faces, people, hands, or key story elements inside this rectangle.",
    `- ${openSideLine}`,
    "- Top ~35% must stay calm for headline text overlay.",
  ].join("\n");
}

export function placementAwarePersonTreatment(
  treatment: string,
  pose: MockupPose,
): string {
  if (!treatment.includes("person") && !treatment.includes("Person")) {
    return treatment;
  }

  const side =
    pose.placement === "right"
      ? "LEFT third of frame (device will cover center-right)"
      : pose.placement === "left"
        ? "RIGHT third of frame (device will cover center-left)"
        : "upper-left or upper-right quadrant — never centered behind the device";

  return `${treatment} CRITICAL PLACEMENT: person must sit entirely in the ${side}. Side profile or over-shoulder only — never centered.`;
}

export function appendPlacementToSceneDescription(
  sceneDescription: string,
  pose: MockupPose,
): string {
  if (pose.placement === "right") {
    return `${sceneDescription} Subject/person and main focal interest on the LEFT side of frame; center-right stays open for device overlay.`;
  }
  if (pose.placement === "left") {
    return `${sceneDescription} Subject/person and main focal interest on the RIGHT side of frame; center-left stays open for device overlay.`;
  }
  return sceneDescription;
}
