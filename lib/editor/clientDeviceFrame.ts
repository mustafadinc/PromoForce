import {
  DEFAULT_MOCKUP_ASSET_ID,
  getDeviceMockupAsset,
  normalizeMockupAssetId,
  normalizeDeviceMockupAssetId,
  usesAssetMockup,
  type MockupAssetId,
} from "@/lib/assetMockup";
import { getCompositeLayoutProfile, layoutScale } from "@/lib/compositeLayoutProfile";
import {
  generateMetallicIPhoneFrameSvg,
  METALLIC_FRAME_H,
  METALLIC_FRAME_W,
  computePhoneScreenLayout,
} from "@/lib/metallicIPhoneFrame";
import type { MockupFrameColor } from "@/lib/mockupFrameColors";
import { DEFAULT_MOCKUP_FRAME_COLOR, normalizeMockupFrameColor } from "@/lib/mockupFrameColors";
import {
  applyMockupPlacementX,
  mockupPoseScaleMultiplier,
  perspectiveFrontWidthCap,
  resolveMockupPlacement,
  type MockupPose,
} from "@/lib/mockupPose";
import { usesPerspectiveMockup } from "@/lib/mockupPerspectiveGeometry";
import { drawAssetDevicePreview } from "@/lib/previewAssetDevice";
import { drawPerspectiveDevicePreview } from "@/lib/previewPerspectiveDevice";
import { perspectiveFrameRasterSize } from "@/lib/metallicIPhoneFramePerspective";
import { resolveMockupScreenFit } from "@/lib/mockupScreenFit";
import type { SlideEditorDeviceState, SlideEditorState } from "@/lib/campaignTypes";
import { SLIDE_EDITOR_STATE_VERSION } from "@/lib/campaignTypes";

export const BASE_DEVICE_RENDER_WIDTH = 420;

const FRAME_ASPECT = METALLIC_FRAME_H / METALLIC_FRAME_W;
const MIN_TEXT_DEVICE_GAP = 64;
const BOTTOM_SAFE_MARGIN = 48;
const PHONE_CHIN_CLEARANCE = -Math.round(2784 * 0.04);

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function svgToDataUrl(svg: string) {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
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
  const scale =
    Math.min(fit.contentW / img.naturalWidth, fit.contentH / img.naturalHeight) * fit.containScale;
  const scaledW = Math.max(1, Math.round(img.naturalWidth * scale));
  const scaledH = Math.max(1, Math.round(img.naturalHeight * scale));
  const destX = screenX + fit.sideInset + (fit.contentW - scaledW) / 2 + fit.shiftX + fit.objectShiftX;
  const destY = screenY + fit.offsetY + fit.contentH - scaledH;

  ctx.fillStyle = "#000";
  ctx.fillRect(screenX, screenY, screenW, screenH);
  ctx.drawImage(img, 0, 0, img.naturalWidth, img.naturalHeight, destX, destY, scaledW, scaledH);
}

export type DeviceCanvasResult = {
  canvas: HTMLCanvasElement;
  width: number;
  height: number;
};

async function buildUprightDeviceCanvas(
  screenshotUrl: string,
  frontW: number,
  frameColor: MockupFrameColor,
): Promise<DeviceCanvasResult> {
  const frontH = Math.round(frontW * FRAME_ASPECT);
  const [frameImg, shotImg] = await Promise.all([
    loadImage(
      svgToDataUrl(
        generateMetallicIPhoneFrameSvg({
          width: frontW,
          height: frontH,
          includeShadow: false,
          frameColor,
        }),
      ),
    ),
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

async function buildAssetDeviceCanvas(
  screenshotUrl: string,
  deviceW: number,
  orientation: MockupPose["orientation"],
  mockupAssetId: MockupAssetId,
): Promise<DeviceCanvasResult> {
  const aspect = getDeviceMockupAsset(mockupAssetId).height / getDeviceMockupAsset(mockupAssetId).width;
  const deviceH = Math.round(deviceW * aspect);
  const canvas = document.createElement("canvas");
  canvas.width = deviceW;
  canvas.height = deviceH;
  const ctx = canvas.getContext("2d");
  if (!ctx) return { canvas, width: deviceW, height: deviceH };

  await drawAssetDevicePreview(ctx, screenshotUrl, orientation, deviceW, deviceH, 0, 0);
  return { canvas, width: deviceW, height: deviceH };
}

async function buildPerspectiveDeviceCanvas(
  screenshotUrl: string,
  frontW: number,
  orientation: MockupPose["orientation"],
  frameColor: MockupFrameColor,
): Promise<DeviceCanvasResult> {
  const { width, height, geometry } = perspectiveFrameRasterSize(orientation, frontW);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return { canvas, width, height };

  const scale = frontW / METALLIC_FRAME_W;
  const stackX = -geometry.bounds.minX * scale;
  const stackY = -geometry.bounds.minY * scale;

  await drawPerspectiveDevicePreview(ctx, screenshotUrl, orientation, frontW, stackX, stackY, frameColor);
  return { canvas, width, height };
}

export async function buildEditorDeviceCanvas(
  screenshotUrl: string,
  mockupPose: MockupPose,
  frameColor: MockupFrameColor,
  mockupAssetId?: MockupAssetId | null,
  baseWidth = BASE_DEVICE_RENDER_WIDTH,
): Promise<DeviceCanvasResult> {
  const assetId = normalizeDeviceMockupAssetId(mockupAssetId ?? DEFAULT_MOCKUP_ASSET_ID);
  if (usesAssetMockup(mockupPose.orientation, assetId)) {
    return buildAssetDeviceCanvas(screenshotUrl, baseWidth, mockupPose.orientation, assetId);
  }
  if (usesPerspectiveMockup(mockupPose.orientation)) {
    return buildPerspectiveDeviceCanvas(screenshotUrl, baseWidth, mockupPose.orientation, frameColor);
  }
  return buildUprightDeviceCanvas(screenshotUrl, baseWidth, frameColor);
}

function defaultRotationDeg(orientation: MockupPose["orientation"]) {
  if (orientation === "tilt_left") return -18;
  if (orientation === "tilt_right") return 18;
  return 0;
}

export function computeDefaultDeviceState(
  width: number,
  height: number,
  mockupPose: MockupPose,
  textBlockBottom: number,
  frameColor?: string,
  mockupAssetId?: MockupAssetId | null,
): SlideEditorDeviceState {
  const profile = getCompositeLayoutProfile(width, height);
  const scale = layoutScale(width, height, profile);
  const sizeMult = mockupPoseScaleMultiplier(mockupPose);
  const placement = resolveMockupPlacement(mockupPose);
  const assetId = normalizeDeviceMockupAssetId(mockupAssetId ?? DEFAULT_MOCKUP_ASSET_ID);
  const usesAssetDevice = usesAssetMockup(mockupPose.orientation, assetId);
  const deviceAspect = usesAssetDevice
    ? getDeviceMockupAsset(assetId).height / getDeviceMockupAsset(assetId).width
    : FRAME_ASPECT;

  let phoneW = Math.round(width * profile.phoneWidthRatio * sizeMult);
  if (usesPerspectiveMockup(mockupPose.orientation)) {
    phoneW = Math.min(phoneW, perspectiveFrontWidthCap(width, mockupPose));
  }

  let phoneH = Math.round(phoneW * deviceAspect);
  const chinClearance = Math.round(PHONE_CHIN_CLEARANCE * scale);
  const bottomMargin = Math.max(Math.round(BOTTOM_SAFE_MARGIN * scale), 0) + chinClearance;
  const maxTextBottom = Math.round(height * profile.maxTextBlockHeightRatio);
  const topBound = maxTextBottom + MIN_TEXT_DEVICE_GAP;
  const bottomBound = height - bottomMargin;
  const availableH = Math.max(0, bottomBound - topBound);

  if (availableH > 0 && phoneH > availableH) {
    phoneH = availableH;
    phoneW = Math.round(phoneH / deviceAspect);
  }

  const originX = applyMockupPlacementX(Math.round((width - phoneW) / 2), phoneW, width, placement);
  const originY = Math.max(topBound, bottomBound - phoneH);

  return {
    xPct: (originX + phoneW / 2) / width,
    yPct: (originY + phoneH / 2) / height,
    scale: phoneW / BASE_DEVICE_RENDER_WIDTH,
    rotationDeg: defaultRotationDeg(mockupPose.orientation),
    frameColor: normalizeMockupFrameColor(
      frameColor ?? (assetId === "iphone-17-pro-cosmic-orange" ? "cosmic-orange" : DEFAULT_MOCKUP_FRAME_COLOR)
    ),
    mockupAssetId: assetId,
  };
}

export function deviceStateToPixels(
  device: SlideEditorDeviceState,
  canvasW: number,
  canvasH: number,
  baseDeviceW = BASE_DEVICE_RENDER_WIDTH,
  baseDeviceH = Math.round(BASE_DEVICE_RENDER_WIDTH * FRAME_ASPECT),
) {
  const displayW = baseDeviceW * device.scale;
  const displayH = baseDeviceH * device.scale;
  return {
    x: device.xPct * canvasW,
    y: device.yPct * canvasH,
    width: displayW,
    height: displayH,
    rotation: device.rotationDeg,
    offsetX: displayW / 2,
    offsetY: displayH / 2,
  };
}

export function pixelsToDeviceState(
  x: number,
  y: number,
  scaleX: number,
  rotationDeg: number,
  canvasW: number,
  canvasH: number,
  frameColor: string,
  mockupAssetId?: MockupAssetId,
): SlideEditorDeviceState {
  return {
    xPct: x / canvasW,
    yPct: y / canvasH,
    scale: scaleX,
    rotationDeg: rotationDeg,
    frameColor,
    mockupAssetId,
  };
}

export function createDefaultEditorState(input: {
  width: number;
  height: number;
  mockupPose: MockupPose;
  textBlockBottom: number;
  frameColor?: string;
  mockupAssetId?: MockupAssetId | null;
}): SlideEditorState {
  return {
    version: SLIDE_EDITOR_STATE_VERSION,
    device: computeDefaultDeviceState(
      input.width,
      input.height,
      input.mockupPose,
      input.textBlockBottom,
      input.frameColor,
      input.mockupAssetId,
    ),
    hiddenLayers: {},
    textStyles: {},
    overrides: {},
  };
}

export function canvasFromImage(img: HTMLImageElement | HTMLCanvasElement) {
  if (img instanceof HTMLCanvasElement) return img;
  const canvas = document.createElement("canvas");
  canvas.width = img.naturalWidth || img.width;
  canvas.height = img.naturalHeight || img.height;
  const ctx = canvas.getContext("2d");
  ctx?.drawImage(img, 0, 0);
  return canvas;
}
