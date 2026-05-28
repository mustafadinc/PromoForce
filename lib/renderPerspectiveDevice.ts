import sharp from "sharp";

import { mapQuadToCanvas } from "@/lib/deviceSilhouetteQuad";
import { trimVerticalScreenshotMargins } from "@/lib/fitScreenshotToMockupScreen";
import { getDeviceFrameBuffer } from "@/lib/generateDeviceFrame";
import { fitScreenshotToMockupScreen } from "@/lib/mockupScreenFitServer";
import { METALLIC_FRAME_W } from "@/lib/metallicIPhoneFrame";
import { perspectiveFrameRasterSize } from "@/lib/metallicIPhoneFramePerspective";
import { quadPixelDimensions } from "@/lib/mockupPerspectiveGeometry";
import { quadDrawOrigin } from "@/lib/perspectiveDeviceWarp";
import type { MockupOrientation } from "@/lib/mockupPose";
import { warpRectangleToQuad } from "@/lib/warpHomography";

export type PerspectiveDeviceLayers = {
  screen: { buffer: Buffer; left: number; top: number };
  frame: { buffer: Buffer; left: number; top: number };
};

/**
 * Premium 3D device: native perspective SVG frame (titanium + side + buttons)
 * with only the screenshot warped into the screen quad.
 */
export async function renderPerspectiveDeviceLayers(
  screenshot: Buffer,
  orientation: MockupOrientation,
  frontW: number,
  stackX: number,
  stackY: number,
  mockupColor?: string,
): Promise<PerspectiveDeviceLayers> {
  const geoScale = frontW / METALLIC_FRAME_W;
  const { width: frameW, height: frameH, geometry } = perspectiveFrameRasterSize(orientation, frontW);

  const frameBuf = await getDeviceFrameBuffer(mockupColor, orientation);
  const framePng = await sharp(frameBuf).resize(frameW, frameH).png().toBuffer();

  const screenQuad = mapQuadToCanvas(geometry.screen, geoScale, stackX, stackY);
  const screenSize = quadPixelDimensions(geometry.screen);
  const fitW = Math.max(1, Math.round(screenSize.width * geoScale));
  const fitH = Math.max(1, Math.round(screenSize.height * geoScale));

  const trimmed = await trimVerticalScreenshotMargins(screenshot);
  const screenPng = await fitScreenshotToMockupScreen(trimmed, fitW, fitH);
  const warpedScreen = await warpRectangleToQuad(screenPng, fitW, fitH, screenQuad);
  const screenOrigin = quadDrawOrigin(screenQuad);

  const frameLeft = Math.round(stackX + geometry.bounds.minX * geoScale);
  const frameTop = Math.round(stackY + geometry.bounds.minY * geoScale);

  return {
    screen: { buffer: warpedScreen, left: screenOrigin.left, top: screenOrigin.top },
    frame: { buffer: framePng, left: frameLeft, top: frameTop },
  };
}

