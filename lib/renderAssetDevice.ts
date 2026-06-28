import path from "node:path";
import { readFile } from "node:fs/promises";

import sharp from "sharp";

import { cleanWarpAlphaFringe, sampleBilinearPremultiplied } from "@/lib/alphaBilinearSample";
import {
  assetDeviceMirrored,
  assetScreenQuad,
  getDeviceMockupAsset,
  getSceneMockupAsset,
  sceneScreenQuad,
  type MockupAssetId,
  type SceneMockupAsset,
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
  screenMask: Uint8Array;
};

const deviceSourceCache = new Map<MockupAssetId, Promise<Buffer>>();
const sceneSourceCache = new Map<MockupAssetId, Promise<Buffer>>();
const rasterCache = new Map<string, Promise<DeviceRaster>>();

function loadDeviceSource(mockupAssetId: MockupAssetId): Promise<Buffer> {
  const existing = deviceSourceCache.get(mockupAssetId);
  if (existing) return existing;

  const asset = getDeviceMockupAsset(mockupAssetId);
  const promise = readFile(path.join(process.cwd(), ...asset.fsPath));
  deviceSourceCache.set(mockupAssetId, promise);
  return promise;
}

export async function loadSceneMockupBuffer(
  asset: SceneMockupAsset,
  width: number,
  height: number,
): Promise<Buffer> {
  const source = await loadSceneSource(asset.id);
  return sharp(source)
    .resize(width, height, { fit: "cover", position: "centre" })
    .png()
    .toBuffer();
}

function loadSceneSource(mockupAssetId: MockupAssetId): Promise<Buffer> {
  const existing = sceneSourceCache.get(mockupAssetId);
  if (existing) return existing;

  const asset = getSceneMockupAsset(mockupAssetId);
  if (!asset) throw new Error(`Not a scene mockup: ${mockupAssetId}`);
  const promise = readFile(path.join(process.cwd(), ...asset.fsPath));
  sceneSourceCache.set(mockupAssetId, promise);
  return promise;
}

async function getDeviceRaster(
  deviceW: number,
  deviceH: number,
  mirrored: boolean,
  mockupAssetId: MockupAssetId,
): Promise<DeviceRaster> {
  const key = `${mockupAssetId}:${deviceW}x${deviceH}:${mirrored ? "m" : "n"}`;
  const existing = rasterCache.get(key);
  if (existing) return existing;

  const promise = (async () => {
    const source = await loadDeviceSource(mockupAssetId);
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

async function warpScreenshotToQuad(
  screenshot: Buffer,
  quad: PerspectiveQuad,
  outW: number,
  outH: number,
): Promise<Buffer> {
  const inv = homographyUnitSquareToQuadInverse(quad);
  const out = Buffer.alloc(outW * outH * 4, 0);

  if (!inv) {
    return sharp(out, { raw: { width: outW, height: outH, channels: 4 } }).png().toBuffer();
  }

  const { data, info } = await sharp(screenshot)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const srcW = info.width;
  const srcH = info.height;
  const channels = info.channels;

  for (let y = 0; y < outH; y += 1) {
    for (let x = 0; x < outW; x += 1) {
      const uv = homographyMapDestToSrc(inv, x + 0.5, y + 0.5);
      if (!uv) continue;
      const rgba = sampleBilinearPremultiplied(data, srcW, srcH, channels, uv.u, uv.v);
      const idx = (y * outW + x) * 4;
      out[idx] = rgba[0];
      out[idx + 1] = rgba[1];
      out[idx + 2] = rgba[2];
      out[idx + 3] = rgba[3];
    }
  }
  cleanWarpAlphaFringe(out, outW, outH);

  return sharp(out, { raw: { width: outW, height: outH, channels: 4 } }).png().toBuffer();
}

export type AssetDeviceRender = {
  buffer: Buffer;
  width: number;
  height: number;
};

export async function renderAssetDeviceLayer(
  screenshot: Buffer,
  orientation: MockupOrientation,
  deviceW: number,
  deviceH: number,
  mockupAssetId?: MockupAssetId | null,
): Promise<AssetDeviceRender> {
  const assetId = getDeviceMockupAsset(mockupAssetId).id;
  const mirrored = assetDeviceMirrored(orientation, assetId);
  const raster = await getDeviceRaster(deviceW, deviceH, mirrored, assetId);

  const quad = assetScreenQuad(orientation, raster.width, raster.height, 0, 0, assetId) as unknown as PerspectiveQuad;
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

export async function loadSceneDeviceOverlayBuffer(asset: SceneMockupAsset, width: number, height: number): Promise<Buffer> {
  const source = await readFile(path.join(process.cwd(), ...asset.deviceOverlayFsPath));
  return sharp(source)
    .resize(width, height, { fit: "cover", position: "centre" })
    .png()
    .toBuffer();
}

/** Warp screenshot into a baked lifestyle scene mockup at canvas resolution. */
export async function renderSceneMockupLayer(
  sceneBackground: Buffer,
  screenshot: Buffer,
  asset: SceneMockupAsset,
  width: number,
  height: number,
): Promise<Buffer> {
  const quad = sceneScreenQuad(asset, width, height) as unknown as PerspectiveQuad;
  const warped = await warpScreenshotToQuad(screenshot, quad, width, height);
  const scenePlate = await loadSceneMockupBuffer(asset, width, height);
  
  let deviceOverlay: Buffer | null = null;
  try {
    deviceOverlay = await loadSceneDeviceOverlayBuffer(asset, width, height);
  } catch (e) {
    console.warn("[renderSceneMockupLayer] Missing device overlay", e);
  }

  const composites: sharp.OverlayOptions[] = [
    { input: scenePlate, top: 0, left: 0 },
    { input: warped, top: 0, left: 0 },
  ];
  if (deviceOverlay) {
    composites.push({ input: deviceOverlay, top: 0, left: 0 });
  }

  return sharp(sceneBackground)
    .resize(width, height, { fit: "cover", position: "centre" })
    .composite(composites)
    .png()
    .toBuffer();
}
