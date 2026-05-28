import {
  computePhoneScreenLayout,
  generateMetallicIPhoneFrameSvg,
  METALLIC_FRAME_H,
  METALLIC_FRAME_W,
} from "@/lib/metallicIPhoneFrame";
import type { MockupOrientation } from "@/lib/mockupPose";
import { usesPerspectiveMockup } from "@/lib/mockupPerspectiveGeometry";
import { perspectiveDepthPx } from "@/lib/mockup3dProjection";
import { resolveMockupScreenFit } from "@/lib/mockupScreenFit";

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function svgToDataUrl(svg: string) {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function drawSideStrip(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  onRight: boolean,
) {
  const g = ctx.createLinearGradient(0, 0, w, 0);
  g.addColorStop(0, "#2e2e36");
  g.addColorStop(0.4, "#6e6e78");
  g.addColorStop(0.7, "#4a4a54");
  g.addColorStop(1, "#1a1a20");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = "rgba(255,255,255,0.22)";
  ctx.fillRect(onRight ? 0 : w - 1, 0, 1, h);
}

function drawFittedScreen(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  screenX: number,
  screenY: number,
  screenW: number,
  screenH: number,
) {
  const fit = resolveMockupScreenFit(screenW, screenH);
  const scale = Math.min(fit.contentW / img.naturalWidth, fit.contentH / img.naturalHeight) * fit.containScale;
  const scaledW = Math.max(1, Math.round(img.naturalWidth * scale));
  const scaledH = Math.max(1, Math.round(img.naturalHeight * scale));
  const destX = screenX + fit.sideInset + (fit.contentW - scaledW) / 2 + fit.shiftX + fit.objectShiftX;
  const destY = screenY + fit.offsetY + fit.contentH - scaledH;

  ctx.fillStyle = "#000";
  ctx.fillRect(screenX, screenY, screenW, screenH);
  ctx.drawImage(img, 0, 0, img.naturalWidth, img.naturalHeight, destX, destY, scaledW, scaledH);
}

export type FlatDeviceCanvas = {
  canvas: HTMLCanvasElement;
  width: number;
  height: number;
};

/** Front face raster (frame + screenshot). */
export async function buildFrontLayerCanvas(
  screenshotUrl: string,
  frontW: number,
): Promise<FlatDeviceCanvas> {
  const frontH = Math.round(frontW * (METALLIC_FRAME_H / METALLIC_FRAME_W));
  const [frameImg, shotImg] = await Promise.all([
    loadImage(svgToDataUrl(generateMetallicIPhoneFrameSvg({ width: frontW, height: frontH, includeShadow: false }))),
    loadImage(screenshotUrl),
  ]);

  const layout = computePhoneScreenLayout(0, 0, frontW, frontH);
  const canvas = document.createElement("canvas");
  canvas.width = frontW;
  canvas.height = frontH;
  const ctx = canvas.getContext("2d");
  if (!ctx) return { canvas, width: frontW, height: frontH };

  ctx.drawImage(frameImg, 0, 0, frontW, frontH);
  drawFittedScreen(ctx, shotImg, layout.screenX, layout.screenY, layout.screenW, layout.screenH);
  return { canvas, width: frontW, height: frontH };
}

/** Side thickness strip raster. */
export function buildSideLayerCanvas(
  frontW: number,
  orientation: MockupOrientation,
): FlatDeviceCanvas | null {
  if (!usesPerspectiveMockup(orientation)) return null;
  const frontH = Math.round(frontW * (METALLIC_FRAME_H / METALLIC_FRAME_W));
  const depthPx = perspectiveDepthPx(frontW);
  const onRight = orientation === "tilt_right";
  const canvas = document.createElement("canvas");
  canvas.width = depthPx;
  canvas.height = frontH;
  const ctx = canvas.getContext("2d");
  if (!ctx) return { canvas, width: depthPx, height: frontH };
  drawSideStrip(ctx, depthPx, frontH, onRight);
  return { canvas, width: depthPx, height: frontH };
}

/** @deprecated Use buildFrontLayerCanvas + buildSideLayerCanvas with per-face warps. */
export async function buildFlatDeviceUnitCanvas(
  screenshotUrl: string,
  frontW: number,
  orientation: MockupOrientation,
): Promise<FlatDeviceCanvas> {
  const front = await buildFrontLayerCanvas(screenshotUrl, frontW);
  const side = buildSideLayerCanvas(frontW, orientation);
  if (!side) return front;

  const totalW = front.width + side.width;
  const canvas = document.createElement("canvas");
  canvas.width = totalW;
  canvas.height = front.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return { canvas, width: totalW, height: front.height };

  if (orientation === "tilt_left") {
    ctx.drawImage(side.canvas, 0, 0);
    ctx.drawImage(front.canvas, side.width, 0);
  } else {
    ctx.drawImage(front.canvas, 0, 0);
    ctx.drawImage(side.canvas, front.width, 0);
  }

  return { canvas, width: totalW, height: front.height };
}
