import type { MockupOrientation } from "@/lib/mockupPose";

export type QuadPoint = { x: number; y: number };
export type AssetQuad = { tl: QuadPoint; tr: QuadPoint; br: QuadPoint; bl: QuadPoint };

export type MockupAssetKind = "device" | "scene";

export type MockupAssetId =
  | "iphone-17-pro-cosmic-orange"
  | "iphone-pro-on-rock"
  | "iphone-17-pro-in-hand-01"
  | "iphone-17-pro-in-hand-02";

export const DEFAULT_MOCKUP_ASSET_ID: MockupAssetId = "iphone-17-pro-cosmic-orange";

type MockupAssetBase = {
  id: MockupAssetId;
  kind: MockupAssetKind;
  label: string;
  src: string;
  fsPath: readonly string[];
  width: number;
  height: number;
  screenQuadNorm: AssetQuad;
};

export type DeviceMockupAsset = MockupAssetBase & {
  kind: "device";
  /** Native angle: front face left, right rail receding (== tilt_right showcase). */
  nativeOrientation: MockupOrientation;
};

export type SceneMockupAsset = MockupAssetBase & {
  kind: "scene";
  description: string;
};

export type MockupAsset = DeviceMockupAsset | SceneMockupAsset;

export const MOCKUP_ASSETS: Record<MockupAssetId, MockupAsset> = {
  "iphone-17-pro-cosmic-orange": {
    id: "iphone-17-pro-cosmic-orange",
    kind: "device",
    label: "iPhone 17 Pro — 3D showcase",
    src: "/mockups/iphone-17-pro-cosmic-orange.png",
    fsPath: ["public", "mockups", "iphone-17-pro-cosmic-orange.png"],
    width: 1195,
    height: 2627,
    nativeOrientation: "tilt_right",
    screenQuadNorm: {
      tl: { x: 0.0075, y: 0.0137 },
      tr: { x: 0.9372, y: 0.0773 },
      br: { x: 0.9372, y: 1.0057 },
      bl: { x: 0.0109, y: 0.936 },
    },
  },
  "iphone-pro-on-rock": {
    id: "iphone-pro-on-rock",
    kind: "scene",
    label: "iPhone on rock",
    description: "Outdoor rock surface — premium product hero shot.",
    src: "/mockups/iphone-pro-on-rock.png",
    fsPath: ["public", "mockups", "iphone-pro-on-rock.png"],
    width: 1280,
    height: 2784,
    screenQuadNorm: {
      tl: { x: -0.1253, y: 0.1997 },
      tr: { x: 1.1253, y: 0.1997 },
      br: { x: 1.1253, y: 0.8033 },
      bl: { x: -0.1253, y: 0.8033 },
    },
  },
  "iphone-17-pro-in-hand-01": {
    id: "iphone-17-pro-in-hand-01",
    kind: "scene",
    label: "iPhone in hand — studio",
    description: "Hand-held lifestyle scene with soft studio lighting.",
    src: "/mockups/iphone-17-pro-in-hand-01.png",
    fsPath: ["public", "mockups", "iphone-17-pro-in-hand-01.png"],
    width: 1280,
    height: 2784,
    screenQuadNorm: {
      tl: { x: 0.1729, y: 0.1155 },
      tr: { x: 0.8271, y: 0.1155 },
      br: { x: 0.8271, y: 0.7682 },
      bl: { x: 0.1729, y: 0.7682 },
    },
  },
  "iphone-17-pro-in-hand-02": {
    id: "iphone-17-pro-in-hand-02",
    kind: "scene",
    label: "iPhone in hand — home",
    description: "Casual home scene with curtains and warm ambient light.",
    src: "/mockups/iphone-17-pro-in-hand-02.png",
    fsPath: ["public", "mockups", "iphone-17-pro-in-hand-02.png"],
    width: 1280,
    height: 2784,
    screenQuadNorm: {
      tl: { x: 0.0525, y: 0.0964 },
      tr: { x: 0.9475, y: 0.0964 },
      br: { x: 0.9475, y: 0.8226 },
      bl: { x: 0.0525, y: 0.8226 },
    },
  },
};

export const MOCKUP_ASSET_OPTIONS = Object.values(MOCKUP_ASSETS).map((asset) => ({
  id: asset.id,
  label: asset.label,
  kind: asset.kind,
  description: asset.kind === "scene" ? asset.description : "Floating 3D device on AI background",
}));

/** @deprecated Use getMockupAsset(DEFAULT_MOCKUP_ASSET_ID) */
export const ASSET_DEVICE = MOCKUP_ASSETS["iphone-17-pro-cosmic-orange"];

export const ASSET_DEVICE_ASPECT = ASSET_DEVICE.height / ASSET_DEVICE.width;

export function normalizeMockupAssetId(raw: unknown): MockupAssetId {
  if (typeof raw === "string" && raw in MOCKUP_ASSETS) {
    return raw as MockupAssetId;
  }
  return DEFAULT_MOCKUP_ASSET_ID;
}

export function getMockupAsset(id?: MockupAssetId | null): MockupAsset {
  return MOCKUP_ASSETS[normalizeMockupAssetId(id)];
}

export function getDeviceMockupAsset(id?: MockupAssetId | null): DeviceMockupAsset {
  const asset = getMockupAsset(id);
  if (asset.kind !== "device") return MOCKUP_ASSETS["iphone-17-pro-cosmic-orange"] as DeviceMockupAsset;
  return asset;
}

export function getSceneMockupAsset(id?: MockupAssetId | null): SceneMockupAsset | null {
  const asset = getMockupAsset(id);
  return asset.kind === "scene" ? asset : null;
}

export function isSceneMockup(id?: MockupAssetId | null): boolean {
  return getMockupAsset(id).kind === "scene";
}

/** Orientations served by the baked device asset (everything except flat upright). */
export function usesAssetMockup(orientation: MockupOrientation, mockupAssetId?: MockupAssetId | null): boolean {
  if (isSceneMockup(mockupAssetId)) return false;
  return orientation === "tilt_left" || orientation === "tilt_right";
}

/** tilt_left is the horizontal mirror of the native device render. */
export function assetDeviceMirrored(
  orientation: MockupOrientation,
  mockupAssetId?: MockupAssetId | null,
): boolean {
  return orientation === "tilt_left";
}

/** Screen quad (normalized 0..1) for the orientation, mirrored for tilt_left. */
export function assetScreenQuadNorm(
  orientation: MockupOrientation,
  mockupAssetId?: MockupAssetId | null,
): AssetQuad {
  const q = getDeviceMockupAsset(mockupAssetId).screenQuadNorm;
  if (!assetDeviceMirrored(orientation, mockupAssetId)) return q;
  return {
    tl: { x: 1 - q.tr.x, y: q.tr.y },
    tr: { x: 1 - q.tl.x, y: q.tl.y },
    br: { x: 1 - q.bl.x, y: q.bl.y },
    bl: { x: 1 - q.br.x, y: q.br.y },
  };
}

/** Screen quad in pixel space for a device placed at (originX, originY) with given size. */
export function assetScreenQuad(
  orientation: MockupOrientation,
  deviceW: number,
  deviceH: number,
  originX = 0,
  originY = 0,
  mockupAssetId?: MockupAssetId | null,
): AssetQuad {
  const q = assetScreenQuadNorm(orientation, mockupAssetId);
  const map = (p: QuadPoint): QuadPoint => ({
    x: originX + p.x * deviceW,
    y: originY + p.y * deviceH,
  });
  return { tl: map(q.tl), tr: map(q.tr), br: map(q.br), bl: map(q.bl) };
}

export function sceneScreenQuad(
  asset: SceneMockupAsset,
  canvasW: number,
  canvasH: number,
): AssetQuad {
  const q = asset.screenQuadNorm;
  const map = (p: QuadPoint): QuadPoint => ({
    x: p.x * canvasW,
    y: p.y * canvasH,
  });
  return { tl: map(q.tl), tr: map(q.tr), br: map(q.br), bl: map(q.bl) };
}

export type AssetDevicePlacement = {
  deviceW: number;
  deviceH: number;
  originX: number;
  originY: number;
};

/**
 * Size the device by width and anchor it within a vertical band (headline reserve
 * on top, margin on the bottom). Shared by preview and export for 1:1 parity.
 */
export function computeAssetDevicePlacement(opts: {
  canvasW: number;
  canvasH: number;
  placement: "left" | "center" | "right";
  targetDeviceW: number;
  topReserve: number;
  bottomMargin: number;
  edgeInset: number;
  mockupAssetId?: MockupAssetId | null;
}): AssetDevicePlacement {
  const { canvasW, canvasH, placement, targetDeviceW, topReserve, bottomMargin, edgeInset } = opts;
  const aspect = getDeviceMockupAsset(opts.mockupAssetId).height / getDeviceMockupAsset(opts.mockupAssetId).width;

  let deviceW = Math.max(48, targetDeviceW);
  let deviceH = deviceW * aspect;

  const bandH = Math.max(48, canvasH - topReserve - bottomMargin);
  if (deviceH > bandH) {
    deviceH = bandH;
    deviceW = deviceH / aspect;
  }
  const maxW = canvasW - edgeInset * 2;
  if (deviceW > maxW) {
    deviceW = maxW;
    deviceH = deviceW * aspect;
  }

  deviceW = Math.round(deviceW);
  deviceH = Math.round(deviceH);

  let originX: number;
  if (placement === "left") {
    originX = edgeInset;
  } else if (placement === "right") {
    originX = canvasW - edgeInset - deviceW;
  } else {
    originX = Math.round((canvasW - deviceW) / 2);
  }

  let originY = canvasH - bottomMargin - deviceH;
  if (originY < topReserve) originY = topReserve;

  return { deviceW, deviceH, originX: Math.round(originX), originY: Math.round(originY) };
}
