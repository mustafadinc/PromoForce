import { ASSET_DEVICE, assetDeviceMirrored, assetScreenQuad } from "@/lib/assetMockup";
import type { MockupOrientation } from "@/lib/mockupPose";
import type { PerspectiveQuad } from "@/lib/mockupPerspectiveGeometry";
import { warpRectangleToQuadCanvas } from "@/lib/warpRectangleToQuadCanvas";

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

let devicePromise: Promise<HTMLImageElement> | null = null;
function loadDevice(): Promise<HTMLImageElement> {
  if (!devicePromise) devicePromise = loadImage(ASSET_DEVICE.src);
  return devicePromise;
}

/** Render the device at deviceW×deviceH (mirrored for tilt_left) on its own canvas. */
function rasterizeDevice(img: HTMLImageElement, deviceW: number, deviceH: number, mirrored: boolean) {
  const canvas = document.createElement("canvas");
  canvas.width = deviceW;
  canvas.height = deviceH;
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;
  if (mirrored) {
    ctx.translate(deviceW, 0);
    ctx.scale(-1, 1);
  }
  ctx.drawImage(img, 0, 0, deviceW, deviceH);
  return canvas;
}

/** Mask canvas: opaque where the device glass (near-black) sits. */
function buildScreenMaskCanvas(deviceCanvas: HTMLCanvasElement) {
  const w = deviceCanvas.width;
  const h = deviceCanvas.height;
  const dctx = deviceCanvas.getContext("2d");
  const mask = document.createElement("canvas");
  mask.width = w;
  mask.height = h;
  const mctx = mask.getContext("2d");
  if (!dctx || !mctx) return mask;

  const src = dctx.getImageData(0, 0, w, h);
  const out = mctx.createImageData(w, h);
  for (let i = 0; i < w * h; i += 1) {
    const o = i * 4;
    const r = src.data[o];
    const g = src.data[o + 1];
    const b = src.data[o + 2];
    const a = src.data[o + 3];
    if (a > 200 && r < 48 && g < 48 && b < 48) {
      out.data[o] = 0;
      out.data[o + 1] = 0;
      out.data[o + 2] = 0;
      out.data[o + 3] = 255;
    }
  }
  mctx.putImageData(out, 0, 0);
  return mask;
}

/** Browser preview — real titanium asset device + screenshot warped into the glass. */
export async function drawAssetDevicePreview(
  ctx: CanvasRenderingContext2D,
  screenshotUrl: string,
  orientation: MockupOrientation,
  deviceW: number,
  deviceH: number,
  originX: number,
  originY: number,
) {
  if (deviceW < 4 || deviceH < 4) return;
  const mirrored = assetDeviceMirrored(orientation);
  const [deviceImg, shotImg] = await Promise.all([loadDevice(), loadImage(screenshotUrl)]);

  const deviceCanvas = rasterizeDevice(deviceImg, deviceW, deviceH, mirrored);
  const maskCanvas = buildScreenMaskCanvas(deviceCanvas);

  const quad = assetScreenQuad(orientation, deviceW, deviceH, 0, 0) as unknown as PerspectiveQuad;
  const minX = Math.floor(Math.min(quad.tl.x, quad.tr.x, quad.bl.x, quad.br.x));
  const minY = Math.floor(Math.min(quad.tl.y, quad.tr.y, quad.bl.y, quad.br.y));
  const warped = warpRectangleToQuadCanvas(
    shotImg,
    shotImg.naturalWidth || deviceW,
    shotImg.naturalHeight || deviceH,
    quad,
  );

  const screenLayer = document.createElement("canvas");
  screenLayer.width = deviceW;
  screenLayer.height = deviceH;
  const sctx = screenLayer.getContext("2d");
  if (!sctx) return;
  sctx.drawImage(warped, minX, minY);
  sctx.globalCompositeOperation = "destination-in";
  sctx.drawImage(maskCanvas, 0, 0);
  sctx.globalCompositeOperation = "source-over";

  ctx.drawImage(deviceCanvas, originX, originY);
  ctx.drawImage(screenLayer, originX, originY);
}
