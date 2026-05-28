import sharp from "sharp";

import { getDeviceFrameBuffer } from "@/lib/generateDeviceFrame";
import { trimVerticalScreenshotMargins } from "@/lib/fitScreenshotToMockupScreen";
import { fitScreenshotToMockupScreen } from "@/lib/mockupScreenFitServer";
import { computePhoneScreenLayout } from "@/lib/metallicIPhoneFrame";
import { perspectiveDepthPx } from "@/lib/mockup3dProjection";
import type { MockupOrientation } from "@/lib/mockupPose";
import { usesPerspectiveMockup } from "@/lib/mockupPerspectiveGeometry";

function sideStripSvg(depthPx: number, heightPx: number, onRight: boolean): Buffer {
  const gradId = onRight ? "sideR" : "sideL";
  const svg = `<svg width="${depthPx}" height="${heightPx}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="${gradId}" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stop-color="#2e2e36"/>
        <stop offset="40%" stop-color="#6e6e78"/>
        <stop offset="70%" stop-color="#4a4a54"/>
        <stop offset="100%" stop-color="#1a1a20"/>
      </linearGradient>
    </defs>
    <rect width="${depthPx}" height="${heightPx}" fill="url(#${gradId})"/>
    <rect x="${onRight ? 0 : depthPx - 1}" y="0" width="1" height="${heightPx}" fill="#ffffff" opacity="0.25"/>
  </svg>`;
  return Buffer.from(svg);
}

/** Front face only (frame + screen) — warped to geo.front quad. */
export async function renderFrontDeviceLayer(
  screenshot: Buffer,
  frontW: number,
  frontH: number,
  mockupColor?: string,
): Promise<{ buffer: Buffer; width: number; height: number }> {
  const trimmed = await trimVerticalScreenshotMargins(screenshot);
  const frameBuf = await getDeviceFrameBuffer(mockupColor, "upright");
  const frame = await sharp(frameBuf).resize(frontW, frontH).png().toBuffer();
  const layout = computePhoneScreenLayout(0, 0, frontW, frontH);
  const screen = await fitScreenshotToMockupScreen(trimmed, layout.screenW, layout.screenH);

  const buffer = await sharp({
    create: {
      width: frontW,
      height: frontH,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([
      { input: frame, left: 0, top: 0 },
      { input: screen, left: layout.screenX, top: layout.screenY },
    ])
    .png()
    .toBuffer();

  return { buffer, width: frontW, height: frontH };
}

/** Side thickness strip — warped to geo.side quad. */
export async function renderSideDeviceLayer(
  frontW: number,
  frontH: number,
  orientation: MockupOrientation,
): Promise<{ buffer: Buffer; width: number; height: number } | null> {
  if (!usesPerspectiveMockup(orientation)) return null;
  const depthPx = perspectiveDepthPx(frontW);
  const onRight = orientation === "tilt_right";
  const buffer = await sharp(sideStripSvg(depthPx, frontH, onRight)).png().toBuffer();
  return { buffer, width: depthPx, height: frontH };
}

/** @deprecated Unfolded strip layout — use per-face warps in perspectiveDeviceWarp. */
export async function renderFlatDeviceUnit(
  screenshot: Buffer,
  frontW: number,
  frontH: number,
  orientation: MockupOrientation,
  mockupColor?: string,
): Promise<{ buffer: Buffer; width: number; height: number }> {
  const front = await renderFrontDeviceLayer(screenshot, frontW, frontH, mockupColor);
  const side = await renderSideDeviceLayer(frontW, frontH, orientation);
  if (!side) return front;

  const yawNegative = orientation === "tilt_left";
  const composites: sharp.OverlayOptions[] = yawNegative
    ? [
        { input: side.buffer, left: 0, top: 0 },
        { input: front.buffer, left: side.width, top: 0 },
      ]
    : [
        { input: front.buffer, left: 0, top: 0 },
        { input: side.buffer, left: front.width, top: 0 },
      ];

  const totalW = front.width + side.width;
  const buffer = await sharp({
    create: {
      width: totalW,
      height: frontH,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite(composites)
    .png()
    .toBuffer();

  return { buffer, width: totalW, height: frontH };
}
