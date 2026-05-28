import { resolveMockupScreenFit } from "@/lib/mockupScreenFit";
import type { PerspectiveQuad } from "@/lib/mockupPerspectiveGeometry";
import { computeVerticalStripWarp } from "@/lib/warpQuadVerticalStrips";

const PREVIEW_STRIP_COUNT = 56;

function fitImageToScreenCanvas(
  ctx: CanvasRenderingContext2D,
  image: CanvasImageSource,
  srcW: number,
  srcH: number,
  screenW: number,
  screenH: number,
) {
  const fit = resolveMockupScreenFit(screenW, screenH);
  const scale = Math.min(fit.contentW / srcW, fit.contentH / srcH) * fit.containScale;
  const scaledW = Math.max(1, Math.round(srcW * scale));
  const scaledH = Math.max(1, Math.round(srcH * scale));
  const destX = fit.sideInset + (fit.contentW - scaledW) / 2 + fit.shiftX + fit.objectShiftX;
  const destY = fit.offsetY + fit.contentH - scaledH;

  ctx.clearRect(0, 0, screenW, screenH);
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, screenW, screenH);
  ctx.drawImage(image, 0, 0, srcW, srcH, destX, destY, scaledW, scaledH);
}

/**
 * Browser canvas perspective warp — same strip mapping as server sharp pipeline.
 */
export function warpImageToQuadCanvas(
  image: CanvasImageSource,
  srcW: number,
  srcH: number,
  quad: PerspectiveQuad,
  screenFitW: number,
  screenFitH: number,
): HTMLCanvasElement {
  const fitCanvas = document.createElement("canvas");
  fitCanvas.width = screenFitW;
  fitCanvas.height = screenFitH;
  const fitCtx = fitCanvas.getContext("2d");
  if (!fitCtx) return fitCanvas;
  fitImageToScreenCanvas(fitCtx, image, srcW, srcH, screenFitW, screenFitH);

  const { outW, outH, strips } = computeVerticalStripWarp(
    quad,
    screenFitW,
    screenFitH,
    PREVIEW_STRIP_COUNT,
  );

  const out = document.createElement("canvas");
  out.width = outW;
  out.height = outH;
  const ctx = out.getContext("2d");
  if (!ctx) return out;

  for (const strip of strips) {
    ctx.drawImage(
      fitCanvas,
      strip.srcLeft,
      0,
      strip.srcWidth,
      screenFitH,
      strip.destLeft,
      strip.destTop,
      strip.destW,
      strip.destH,
    );
  }

  return out;
}
