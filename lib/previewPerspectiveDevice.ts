import { mapQuadToCanvas } from "@/lib/deviceSilhouetteQuad";
import {
  generatePerspectiveMetallicFrameSvg,
  perspectiveFrameRasterSize,
} from "@/lib/metallicIPhoneFramePerspective";
import { METALLIC_FRAME_W } from "@/lib/metallicIPhoneFrame";
import { quadPixelDimensions } from "@/lib/mockupPerspectiveGeometry";
import { quadDrawOrigin } from "@/lib/perspectiveDeviceWarp";
import type { MockupOrientation } from "@/lib/mockupPose";
import { resolveMockupScreenFit } from "@/lib/mockupScreenFit";
import { warpRectangleToQuadCanvas } from "@/lib/warpRectangleToQuadCanvas";
import type { MockupFrameColor } from "@/lib/mockupFrameColors";

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

function drawFittedScreen(img: HTMLImageElement, screenW: number, screenH: number) {
  const fit = resolveMockupScreenFit(screenW, screenH);
  const scale = Math.min(fit.contentW / img.naturalWidth, fit.contentH / img.naturalHeight) * fit.containScale;
  const scaledW = Math.max(1, Math.round(img.naturalWidth * scale));
  const scaledH = Math.max(1, Math.round(img.naturalHeight * scale));
  const destX = fit.sideInset + (fit.contentW - scaledW) / 2 + fit.shiftX + fit.objectShiftX;
  const destY = fit.offsetY + fit.contentH - scaledH;

  const canvas = document.createElement("canvas");
  canvas.width = screenW;
  canvas.height = screenH;
  const sctx = canvas.getContext("2d");
  if (!sctx) return canvas;
  sctx.fillStyle = "#000";
  sctx.fillRect(0, 0, screenW, screenH);
  sctx.drawImage(img, 0, 0, img.naturalWidth, img.naturalHeight, destX, destY, scaledW, scaledH);
  return canvas;
}

/** Browser preview — perspective SVG frame + warped screen (matches export). */
export async function drawPerspectiveDevicePreview(
  ctx: CanvasRenderingContext2D,
  screenshotUrl: string,
  orientation: MockupOrientation,
  frontW: number,
  stackX: number,
  stackY: number,
  frameColor?: MockupFrameColor | null,
) {
  const geoScale = frontW / METALLIC_FRAME_W;
  const { width: frameW, height: frameH, geometry } = perspectiveFrameRasterSize(orientation, frontW);

  const screenQuad = mapQuadToCanvas(geometry.screen, geoScale, stackX, stackY);
  const screenSize = quadPixelDimensions(geometry.screen);
  const fitW = Math.max(1, Math.round(screenSize.width * geoScale));
  const fitH = Math.max(1, Math.round(screenSize.height * geoScale));

  const [frameImg, shotImg] = await Promise.all([
    loadImage(
      svgToDataUrl(
        generatePerspectiveMetallicFrameSvg({
          orientation,
          frameColor,
          idPrefix: "preview-persp",
        }),
      ),
    ),
    loadImage(screenshotUrl),
  ]);

  const screenFlat = drawFittedScreen(shotImg, fitW, fitH);
  const warpedScreen = warpRectangleToQuadCanvas(screenFlat, fitW, fitH, screenQuad);
  const screenOrigin = quadDrawOrigin(screenQuad);

  const frameLeft = Math.round(stackX + geometry.bounds.minX * geoScale);
  const frameTop = Math.round(stackY + geometry.bounds.minY * geoScale);

  ctx.drawImage(warpedScreen, screenOrigin.left, screenOrigin.top);
  ctx.drawImage(frameImg, frameLeft, frameTop, frameW, frameH);
}
