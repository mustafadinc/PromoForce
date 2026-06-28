import type { SceneMockupAsset } from "@/lib/assetMockup";
import { sceneScreenQuad } from "@/lib/assetMockup";
import { loadPreviewImage } from "@/lib/previewImageLoad";
import type { PerspectiveQuad } from "@/lib/mockupPerspectiveGeometry";
import {
  analyzeSceneDeviceOverlay,
  finalizeSceneDeviceOverlay,
} from "@/lib/sceneDeviceMask";
import { fillScreenshotIntoScreenMask } from "@/lib/sceneScreenFill";

/** Matches export preview — subtle lifestyle stand-in for AI background. */
function drawPreviewBackground(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const gradient = ctx.createLinearGradient(0, 0, w * 0.2, h);
  gradient.addColorStop(0, "#1e2838");
  gradient.addColorStop(0.45, "#121820");
  gradient.addColorStop(1, "#182830");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, w, h);
}

const PREVIEW_RENDER_WIDTH = 640;

/**
 * Browser preview — AI-style background + screenshot filled into the baked screen glass +
 * transparent device overlay. Mirrors server `renderSceneMockupLayer` (mask + dynamic quad).
 */
export async function drawSceneMockupPreview(
  ctx: CanvasRenderingContext2D,
  screenshotUrl: string | null,
  asset: SceneMockupAsset,
  canvasW: number,
  canvasH: number,
  options: { transparentBackground?: boolean } = {},
) {
  if (canvasW < 8 || canvasH < 8) return;

  const renderW = PREVIEW_RENDER_WIDTH;
  const renderH = Math.round((renderW * asset.height) / asset.width);
  const screenQuadPx = sceneScreenQuad(asset, renderW, renderH) as unknown as PerspectiveQuad;

  const off = document.createElement("canvas");
  off.width = renderW;
  off.height = renderH;
  const octx = off.getContext("2d");
  if (!octx) return;

  if (options.transparentBackground) {
    octx.clearRect(0, 0, renderW, renderH);
  } else {
    drawPreviewBackground(octx, renderW, renderH);
  }

  let overlayCanvas: HTMLCanvasElement | null = null;
  let screenAlpha: Uint8Array | null = null;
  let screenQuad = null as ReturnType<typeof analyzeSceneDeviceOverlay>["screenQuad"] | null;
  let scenePlateData: Uint8ClampedArray | null = null;

  try {
    const sceneImg = await loadPreviewImage(asset.src);
    const sceneLayer = document.createElement("canvas");
    sceneLayer.width = renderW;
    sceneLayer.height = renderH;
    const sctx = sceneLayer.getContext("2d");
    if (sctx) {
      sctx.drawImage(sceneImg, 0, 0, renderW, renderH);
      scenePlateData = sctx.getImageData(0, 0, renderW, renderH).data;
    }
  } catch {
    /* scene plate optional — falls back to full quad */
  }

  try {
    const deviceImg = await loadPreviewImage(asset.deviceOverlaySrc);
    const deviceLayer = document.createElement("canvas");
    deviceLayer.width = renderW;
    deviceLayer.height = renderH;
    const dctx = deviceLayer.getContext("2d");
    if (dctx) {
      dctx.drawImage(deviceImg, 0, 0, renderW, renderH);
      const imgData = dctx.getImageData(0, 0, renderW, renderH);
      const analyzed = analyzeSceneDeviceOverlay(
        imgData.data,
        renderW,
        renderH,
        screenQuadPx,
        scenePlateData,
      );
      finalizeSceneDeviceOverlay(
        imgData.data,
        renderW,
        renderH,
        analyzed.screenQuad,
        scenePlateData,
        analyzed.screenAlpha,
      );
      dctx.putImageData(imgData, 0, 0);
      overlayCanvas = deviceLayer;
      screenAlpha = analyzed.screenAlpha;
      screenQuad = analyzed.screenQuad;
    }
  } catch (error) {
    console.warn("[drawSceneMockupPreview] device overlay failed", asset.id, error);
  }

  if (screenshotUrl && screenAlpha && screenQuad) {
    try {
      const shotImg = await loadPreviewImage(screenshotUrl);
      const shotW = shotImg.naturalWidth || renderW;
      const shotH = shotImg.naturalHeight || renderH;

      const shotCanvas = document.createElement("canvas");
      shotCanvas.width = shotW;
      shotCanvas.height = shotH;
      const sctx = shotCanvas.getContext("2d");
      if (sctx) {
        sctx.drawImage(shotImg, 0, 0, shotW, shotH);
        const shotData = sctx.getImageData(0, 0, shotW, shotH).data;

        const screenCanvas = document.createElement("canvas");
        screenCanvas.width = renderW;
        screenCanvas.height = renderH;
        const scctx = screenCanvas.getContext("2d");
        if (scctx) {
          const outData = scctx.createImageData(renderW, renderH);
          fillScreenshotIntoScreenMask(
            outData.data,
            renderW,
            renderH,
            screenAlpha,
            shotData,
            shotW,
            shotH,
            4,
            screenQuad,
          );
          scctx.putImageData(outData, 0, 0);
          octx.drawImage(screenCanvas, 0, 0);
        }
      }
    } catch {
      /* screenshot load failed — show frame only */
    }
  }

  if (overlayCanvas) {
    octx.drawImage(overlayCanvas, 0, 0);
  }

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(off, 0, 0, canvasW, canvasH);
}
