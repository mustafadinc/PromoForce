import type { MockupPose } from "@/lib/mockupPose";
import { buildPerspectivePhoneGeometry, usesPerspectiveMockup } from "@/lib/mockupPerspectiveGeometry";
import { METALLIC_FRAME_H, METALLIC_FRAME_W } from "@/lib/metallicIPhoneFrame";
import { getMockupPosePreviewLayout } from "@/lib/mockupPosePreviewLayout";
import { computePerspectiveStackPlacement } from "@/lib/perspectiveStackPosition";
import { nudgePerspectiveStackX } from "@/lib/perspectiveDeviceWarp";
import { perspectiveBoundsOnCanvas } from "@/lib/perspectiveBounds";

export type MockupPreviewScene = {
  orientation: MockupPose["orientation"];
  frontW: number;
  frontH: number;
  stackX: number;
  stackY: number;
  stack: { left: number; top: number; width: number; height: number };
};

function buildAtFrontW(
  pose: MockupPose,
  canvasWidth: number,
  canvasHeight: number,
  layout: ReturnType<typeof getMockupPosePreviewLayout>,
  frontW: number,
) {
  const frontH = Math.round(frontW * (METALLIC_FRAME_H / METALLIC_FRAME_W));
  const geo = buildPerspectivePhoneGeometry(pose.orientation);
  const scale = frontW / METALLIC_FRAME_W;
  const insetPx = Math.round((canvasWidth * layout.edgeInsetPct) / 100);
  const marginTop = Math.round((canvasHeight * layout.headlineReservePct) / 100);
  const bottomY = canvasHeight * (1 - layout.phoneBottomPct / 100);

  const placement =
    layout.anchor === "left" ? "left" : layout.anchor === "right" ? "right" : "center";

  let { stackX, stackY } = computePerspectiveStackPlacement(geo, scale, canvasWidth, placement, {
    bottomY,
    marginTop,
    edgeInsetPx: insetPx,
  });
  stackX = nudgePerspectiveStackX(geo, scale, stackX, stackY, canvasWidth, insetPx);

  const ext = perspectiveBoundsOnCanvas(pose.orientation, frontW, stackX, stackY);

  return {
    orientation: pose.orientation,
    frontW,
    frontH,
    stackX,
    stackY,
    stack: {
      left: Math.floor(ext.minX),
      top: Math.floor(ext.minY),
      width: Math.ceil(ext.maxX - ext.minX),
      height: Math.ceil(ext.maxY - ext.minY),
    },
    ext,
  };
}

function sceneFitsCanvas(
  ext: ReturnType<typeof perspectiveBoundsOnCanvas>,
  canvasWidth: number,
  canvasHeight: number,
  headlineReservePct: number,
) {
  const sidePad = 2;
  const topAllow = Math.max(0, Math.round((canvasHeight * headlineReservePct) / 100) - 10);
  return (
    ext.minX >= sidePad &&
    ext.minY >= topAllow &&
    ext.maxX <= canvasWidth - sidePad &&
    ext.maxY <= canvasHeight - sidePad
  );
}

/** Largest frontW that fits the vertical band (hero phones fill lower canvas). */
function maxFrontWForHeight(
  geo: ReturnType<typeof buildPerspectivePhoneGeometry>,
  canvasHeight: number,
  layout: ReturnType<typeof getMockupPosePreviewLayout>,
) {
  const bottomY = canvasHeight * (1 - layout.phoneBottomPct / 100);
  const topAllow = Math.round((canvasHeight * layout.headlineReservePct) / 100);
  const bandH = Math.max(40, bottomY - topAllow);
  const boundsH = geo.bounds.maxY - geo.bounds.minY;
  return Math.max(48, Math.floor((bandH / boundsH) * METALLIC_FRAME_W));
}

export function computeMockupPreviewScene(
  pose: MockupPose,
  canvasWidth: number,
  canvasHeight: number,
): MockupPreviewScene | null {
  if (canvasWidth < 8 || canvasHeight < 8) return null;

  const layout = getMockupPosePreviewLayout(pose);
  const geo = buildPerspectivePhoneGeometry(pose.orientation);
  const widthCap = Math.round(canvasWidth * layout.phoneWidthPct);
  const heightCap = maxFrontWForHeight(geo, canvasHeight, layout);
  let frontW = Math.min(widthCap, heightCap);

  for (let i = 0; i < 8; i += 1) {
    const scene = buildAtFrontW(pose, canvasWidth, canvasHeight, layout, frontW);
    if (sceneFitsCanvas(scene.ext, canvasWidth, canvasHeight, layout.headlineReservePct)) {
      const { ext: _ext, ...out } = scene;
      return out;
    }
    frontW = Math.max(48, Math.floor(frontW * 0.93));
  }

  const scene = buildAtFrontW(pose, canvasWidth, canvasHeight, layout, frontW);
  const { ext: _ext, ...out } = scene;
  return out;
}
