import path from "node:path";
import { readFile } from "node:fs/promises";

import sharp from "sharp";

import { cleanWarpAlphaFringe, sampleBilinearPremultiplied } from "@/lib/alphaBilinearSample";
import {
  ASSET_DEVICE,
  assetDeviceMirrored,
  assetScreenQuad,
} from "@/lib/assetMockup";
import type { MockupOrientation } from "@/lib/mockupPose";
import type { PerspectiveQuad } from "@/lib/mockupPerspectiveGeometry";
import {
  homographyUnitSquareToQuadInverse,
  homographyMapDestToSrc,
} from "@/lib/rectToQuadHomography";

type DeviceRaster = {
  data: Buffer;
  width: number;
  height: number;
  /** Alpha=255 where the glass screen is (near-black opaque region). */
  screenMask: Uint8Array;
};

let sourcePromise: Promise<Buffer> | null = null;
function loadDeviceSource(): Promise<Buffer> {
  if (!sourcePromise) {
    const file = path.join(process.cwd(), ...ASSET_DEVICE.fsPath);
    sourcePromise = readFile(file);
  }
  return sourcePromise;
}

const rasterCache = new Map<string, Promise<DeviceRaster>>();

async function getDeviceRaster(
  deviceW: number,
  deviceH: number,
  mirrored: boolean,
): Promise<DeviceRaster> {
  const key = `${deviceW}x${deviceH}:${mirrored ? "m" : "n"}`;
  const existing = rasterCache.get(key);
  if (existing) return existing;

  const promise = (async () => {
    const source = await loadDeviceSource();
    let pipe = sharp(source).resize(deviceW, deviceH, { fit: "fill" });
    if (mirrored) pipe = pipe.flop();
    const { data, info } = await pipe.ensureAlpha().raw().toBuffer({ resolveWithObject: true });

    const screenMask = new Uint8Array(info.width * info.height);
    for (let i = 0; i < info.width * info.height; i += 1) {
      const o = i * info.channels;
      const r = data[o];
      const g = data[o + 1];
      const b = data[o + 2];
      const a = data[o + 3];
      if (a > 200 && r < 48 && g < 48 && b < 48) screenMask[i] = 255;
    }

    return { data, width: info.width, height: info.height, screenMask };
  })();

  rasterCache.set(key, promise);
  return promise;
}

/** Warp the screenshot into the screen quad, clipped to the device glass mask. */
async function buildScreenFill(
  screenshot: Buffer,
  raster: DeviceRaster,
  quad: PerspectiveQuad,
): Promise<Buffer> {
  const { width, height, screenMask } = raster;
  const inv = homographyUnitSquareToQuadInverse(quad);
  const out = Buffer.alloc(width * height * 4, 0);

  if (inv) {
    const { data, info } = await sharp(screenshot)
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    const srcW = info.width;
    const srcH = info.height;
    const channels = info.channels;

    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const idx = y * width + x;
        if (screenMask[idx] === 0) continue;
        const uv = homographyMapDestToSrc(inv, x + 0.5, y + 0.5);
        if (!uv) continue;
        const rgba = sampleBilinearPremultiplied(data, srcW, srcH, channels, uv.u, uv.v);
        const o = idx * 4;
        out[o] = rgba[0];
        out[o + 1] = rgba[1];
        out[o + 2] = rgba[2];
        out[o + 3] = rgba[3];
      }
    }
    cleanWarpAlphaFringe(out, width, height);
  }

  return sharp(out, { raw: { width, height, channels: 4 } }).png().toBuffer();
}

export type AssetDeviceRender = {
  buffer: Buffer;
  width: number;
  height: number;
};

/**
 * Render the premium device (real titanium 3D frame) with the screenshot warped
 * into its perspective screen. Returns a deviceW×deviceH RGBA layer.
 */
export async function renderAssetDeviceLayer(
  screenshot: Buffer,
  orientation: MockupOrientation,
  deviceW: number,
  deviceH: number,
): Promise<AssetDeviceRender> {
  const mirrored = assetDeviceMirrored(orientation);
  const raster = await getDeviceRaster(deviceW, deviceH, mirrored);

  const quad = assetScreenQuad(orientation, raster.width, raster.height) as unknown as PerspectiveQuad;
  const screenFill = await buildScreenFill(screenshot, raster, quad);

  const frame = await sharp(raster.data, {
    raw: { width: raster.width, height: raster.height, channels: 4 },
  })
    .png()
    .toBuffer();

  const buffer = await sharp({
    create: {
      width: raster.width,
      height: raster.height,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([
      { input: frame, top: 0, left: 0 },
      { input: screenFill, top: 0, left: 0 },
    ])
    .png()
    .toBuffer();

  return { buffer, width: raster.width, height: raster.height };
}
