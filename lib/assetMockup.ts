import type { MockupOrientation } from "@/lib/mockupPose";

export type QuadPoint = { x: number; y: number };
export type AssetQuad = { tl: QuadPoint; tr: QuadPoint; br: QuadPoint; bl: QuadPoint };

/**
 * Pre-rendered device mockup baked from a real 3D render (Creatoom iPhone 17 Pro PSD).
 * The PNG is a transparent, angled titanium device with a black (empty) screen.
 * `screenQuadNorm` is the perspective screen rectangle as fractions of the PNG size,
 * measured from the PSD "PASTE YOUR DESIGN" smart-object placement.
 */
export const ASSET_DEVICE = {
  slug: "iphone-17-pro-cosmic-orange",
  src: "/mockups/iphone-17-pro-cosmic-orange.png",
  /** Server-relative path under process.cwd(). */
  fsPath: ["public", "mockups", "iphone-17-pro-cosmic-orange.png"],
  width: 1195,
  height: 2627,
  /** Native angle: front face left, right rail receding (== tilt_right showcase). */
  screenQuadNorm: {
    tl: { x: 0.0075, y: 0.0137 },
    tr: { x: 0.9372, y: 0.0773 },
    br: { x: 0.9372, y: 1.0057 },
    bl: { x: 0.0109, y: 0.936 },
  } as AssetQuad,
} as const;

export const ASSET_DEVICE_ASPECT = ASSET_DEVICE.height / ASSET_DEVICE.width;

/** Orientations served by the baked asset (everything except flat upright). */
export function usesAssetMockup(orientation: MockupOrientation): boolean {
  return orientation === "tilt_left" || orientation === "tilt_right";
}

/** tilt_left is the horizontal mirror of the native render. */
export function assetDeviceMirrored(orientation: MockupOrientation): boolean {
  return orientation === "tilt_left";
}

/** Screen quad (normalized 0..1) for the orientation, mirrored for tilt_left. */
export function assetScreenQuadNorm(orientation: MockupOrientation): AssetQuad {
  const q = ASSET_DEVICE.screenQuadNorm;
  if (!assetDeviceMirrored(orientation)) return q;
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
): AssetQuad {
  const q = assetScreenQuadNorm(orientation);
  const map = (p: QuadPoint): QuadPoint => ({
    x: originX + p.x * deviceW,
    y: originY + p.y * deviceH,
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
}): AssetDevicePlacement {
  const { canvasW, canvasH, placement, targetDeviceW, topReserve, bottomMargin, edgeInset } = opts;

  let deviceW = Math.max(48, targetDeviceW);
  let deviceH = deviceW * ASSET_DEVICE_ASPECT;

  const bandH = Math.max(48, canvasH - topReserve - bottomMargin);
  if (deviceH > bandH) {
    deviceH = bandH;
    deviceW = deviceH / ASSET_DEVICE_ASPECT;
  }
  const maxW = canvasW - edgeInset * 2;
  if (deviceW > maxW) {
    deviceW = maxW;
    deviceH = deviceW * ASSET_DEVICE_ASPECT;
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
