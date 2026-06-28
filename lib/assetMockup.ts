import type { MockupOrientation } from "@/lib/mockupPose";

export type QuadPoint = { x: number; y: number };
export type AssetQuad = { tl: QuadPoint; tr: QuadPoint; br: QuadPoint; bl: QuadPoint };

export type MockupAssetKind = "device" | "scene";

export type MockupAssetId =
  | "iphone-17-pro-cosmic-orange"
  | "iphone-pro-on-rock"
  | "iphone-17-pro-in-hand-01"
  | "iphone-17-pro-in-hand-02"
  | "iphone-16-md942-01"
  | "iphone-16-md942-02"
  | "iphone-16-md942-03"
  | "iphone-16-md942-04"
  | "iphone-16-md942-05";

export const DEFAULT_MOCKUP_ASSET_ID: MockupAssetId = "iphone-17-pro-cosmic-orange";

/** Default scene mockup per slide (1–5) — MD942 iPhone 16 set, one pose each. */
export const SLIDE_SCENE_MOCKUP_PRESETS: MockupAssetId[] = [
  "iphone-16-md942-01",
  "iphone-16-md942-02",
  "iphone-16-md942-03",
  "iphone-16-md942-04",
  "iphone-16-md942-05",
];

export function mockupAssetForSlide(slideNumber: number): MockupAssetId {
  return SLIDE_SCENE_MOCKUP_PRESETS[
    Math.min(Math.max(slideNumber - 1, 0), SLIDE_SCENE_MOCKUP_PRESETS.length - 1)
  ];
}

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
  /** Transparent PNG — device frame + shadow only (no studio backdrop). */
  deviceOverlaySrc: string;
  deviceOverlayFsPath: readonly string[];
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
    deviceOverlaySrc: "/mockups/iphone-pro-on-rock-device.png",
    fsPath: ["public", "mockups", "iphone-pro-on-rock.png"],
    deviceOverlayFsPath: ["public", "mockups", "iphone-pro-on-rock-device.png"],
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
    deviceOverlaySrc: "/mockups/iphone-17-pro-in-hand-01-device.png",
    fsPath: ["public", "mockups", "iphone-17-pro-in-hand-01.png"],
    deviceOverlayFsPath: ["public", "mockups", "iphone-17-pro-in-hand-01-device.png"],
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
    deviceOverlaySrc: "/mockups/iphone-17-pro-in-hand-02-device.png",
    fsPath: ["public", "mockups", "iphone-17-pro-in-hand-02.png"],
    deviceOverlayFsPath: ["public", "mockups", "iphone-17-pro-in-hand-02-device.png"],
    width: 1280,
    height: 2784,
    screenQuadNorm: {
      tl: { x: 0.0525, y: 0.0964 },
      tr: { x: 0.9475, y: 0.0964 },
      br: { x: 0.9475, y: 0.8226 },
      bl: { x: 0.0525, y: 0.8226 },
    },
  },
  "iphone-16-md942-01": {
    id: "iphone-16-md942-01",
    kind: "scene",
    label: "iPhone 16 — front & back",
    description: "Hero duo shot — front screen plus back camera angle on gray studio backdrop.",
    src: "/mockups/iphone-16-md942-01.png",
    deviceOverlaySrc: "/mockups/iphone-16-md942-01-device.png",
    fsPath: ["public", "mockups", "iphone-16-md942-01.png"],
    deviceOverlayFsPath: ["public", "mockups", "iphone-16-md942-01-device.png"],
    width: 1280,
    height: 2784,
    screenQuadNorm: {
      tl: { x: 0.38203125, y: 0.1867816091954023 },
      tr: { x: 0.9953125, y: 0.18606321839080459 },
      br: { x: 0.9984375, y: 0.8591954022988506 },
      bl: { x: 0.38515625, y: 0.8599137931034483 },
    },
  },
  "iphone-16-md942-02": {
    id: "iphone-16-md942-02",
    kind: "scene",
    label: "iPhone 16 — floating tilt",
    description: "Dynamic diagonal float with soft shadow — scroll-stopping hero angle.",
    src: "/mockups/iphone-16-md942-02.png",
    deviceOverlaySrc: "/mockups/iphone-16-md942-02-device.png",
    fsPath: ["public", "mockups", "iphone-16-md942-02.png"],
    deviceOverlayFsPath: ["public", "mockups", "iphone-16-md942-02-device.png"],
    width: 1280,
    height: 2784,
    screenQuadNorm: {
      tl: { x: -0.146875, y: 0.3056752873563218 },
      tr: { x: 0.42265625, y: 0.1505028735632184 },
      br: { x: 1.165625, y: 0.7252155172413793 },
      bl: { x: 0.59609375, y: 0.8807471264367817 },
    },
  },
  "iphone-16-md942-03": {
    id: "iphone-16-md942-03",
    kind: "scene",
    label: "iPhone 16 — 3/4 angle",
    description: "Three-quarter upright view — UI-readable with subtle depth.",
    src: "/mockups/iphone-16-md942-03.png",
    deviceOverlaySrc: "/mockups/iphone-16-md942-03-device.png",
    fsPath: ["public", "mockups", "iphone-16-md942-03.png"],
    deviceOverlayFsPath: ["public", "mockups", "iphone-16-md942-03-device.png"],
    width: 1280,
    height: 2784,
    screenQuadNorm: {
      tl: { x: 0.25703125, y: 0.16882183908045978 },
      tr: { x: 0.83203125, y: 0.17564655172413793 },
      br: { x: 0.79140625, y: 0.8864942528735632 },
      bl: { x: 0.21640625, y: 0.8793103448275862 },
    },
  },
  "iphone-16-md942-04": {
    id: "iphone-16-md942-04",
    kind: "scene",
    label: "iPhone 16 — dual depth",
    description: "Crossed front and back phones — premium product-story composition.",
    src: "/mockups/iphone-16-md942-04.png",
    deviceOverlaySrc: "/mockups/iphone-16-md942-04-device.png",
    fsPath: ["public", "mockups", "iphone-16-md942-04.png"],
    deviceOverlayFsPath: ["public", "mockups", "iphone-16-md942-04-device.png"],
    width: 1280,
    height: 2784,
    screenQuadNorm: {
      tl: { x: 0.2859375, y: 0.29310344827586204 },
      tr: { x: 0.8, y: 0.21695402298850575 },
      br: { x: 1.18125, y: 0.7607758620689655 },
      bl: { x: 0.66796875, y: 0.8369252873563219 },
    },
  },
  "iphone-16-md942-05": {
    id: "iphone-16-md942-05",
    kind: "scene",
    label: "iPhone 16 — front center",
    description: "Straight-on centered device — maximum UI clarity for feature slides.",
    src: "/mockups/iphone-16-md942-05.png",
    deviceOverlaySrc: "/mockups/iphone-16-md942-05-device.png",
    fsPath: ["public", "mockups", "iphone-16-md942-05.png"],
    deviceOverlayFsPath: ["public", "mockups", "iphone-16-md942-05-device.png"],
    width: 1280,
    height: 2784,
    screenQuadNorm: {
      tl: { x: 0.15390625, y: 0.1839080459770115 },
      tr: { x: 0.84453125, y: 0.1839080459770115 },
      br: { x: 0.84453125, y: 0.8732040229885057 },
      bl: { x: 0.15390625, y: 0.8732040229885057 },
    },
  },
};

export const MOCKUP_ASSET_OPTIONS = Object.values(MOCKUP_ASSETS).map((asset) => ({
  id: asset.id,
  label: asset.label,
  kind: asset.kind,
  description: asset.kind === "scene" ? asset.description : "Floating 3D device on AI background",
}));

export const DEVICE_MOCKUP_ASSET_OPTIONS = MOCKUP_ASSET_OPTIONS.filter(
  (asset) => asset.kind === "device",
);

export const SCENE_MOCKUP_ASSET_OPTIONS = MOCKUP_ASSET_OPTIONS.filter(
  (asset) => asset.kind === "scene",
);

export const IPHONE_16_SCENE_OPTIONS = SCENE_MOCKUP_ASSET_OPTIONS.filter((asset) =>
  asset.id.startsWith("iphone-16-md942-"),
);

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

export function normalizeDeviceMockupAssetId(raw: unknown): MockupAssetId {
  const id = normalizeMockupAssetId(raw);
  return getMockupAsset(id).kind === "device" ? id : DEFAULT_MOCKUP_ASSET_ID;
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

export function getRenderableSceneMockupAsset(
  id?: MockupAssetId | null,
  _slideNumber?: number,
): SceneMockupAsset | null {
  return getSceneMockupAsset(id);
}

export function isUnknownMockupAssetId(raw: unknown): boolean {
  return typeof raw === "string" && raw.length > 0 && !(raw in MOCKUP_ASSETS);
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

/** Top edge of the screen hole in normalized canvas Y (0–1). Used to cap headline zone. */
export function scenePhoneTopNorm(asset: SceneMockupAsset): number {
  const q = asset.screenQuadNorm;
  return Math.min(q.tl.y, q.tr.y);
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
