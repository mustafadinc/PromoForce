import sharp from "sharp";

import {
  DEVICE_FRAME_HEIGHT,
  DEVICE_FRAME_WIDTH,
  generateMetallicIPhoneFrameSvg,
} from "@/lib/metallicIPhoneFrame";
import { generatePerspectiveMetallicFrameSvg } from "@/lib/metallicIPhoneFramePerspective";
import { usesPerspectiveMockup } from "@/lib/mockupPerspectiveGeometry";
import type { MockupOrientation } from "@/lib/mockupPose";
import { mockupFrameCacheKey, type MockupFrameColor } from "@/lib/mockupFrameColors";

const FRAME_CACHE_VERSION = 30;
const frameCache = new Map<string, Buffer>();

export async function getDeviceFrameBuffer(
  frameColor?: MockupFrameColor | null,
  orientation: MockupOrientation = "upright",
): Promise<Buffer> {
  const key = `${FRAME_CACHE_VERSION}:${orientation}:${mockupFrameCacheKey(frameColor)}`;
  const cached = frameCache.get(key);
  if (cached) return cached;

  const svg = usesPerspectiveMockup(orientation)
    ? generatePerspectiveMetallicFrameSvg({
        idPrefix: `export-${key.replace(/[^a-z0-9-]/gi, "-")}`,
        frameColor,
        orientation,
      })
    : generateMetallicIPhoneFrameSvg({
        width: DEVICE_FRAME_WIDTH,
        height: DEVICE_FRAME_HEIGHT,
        idPrefix: `export-${key.replace(/[^a-z0-9-]/gi, "-")}`,
        frameColor,
      });

  const buffer = await sharp(Buffer.from(svg)).png().toBuffer();
  frameCache.set(key, buffer);
  return buffer;
}

export {
  DEVICE_BEZEL,
  DEVICE_FRAME_HEIGHT,
  DEVICE_FRAME_WIDTH,
  DEVICE_SCREEN_CORNER_R,
  DEVICE_SCREEN_HEIGHT,
  DEVICE_SCREEN_WIDTH,
  DEVICE_SCREEN_X,
  DEVICE_SCREEN_Y,
  outerPhoneRadii,
  generateDeviceFrameSvg,
  generateMetallicIPhoneFrameSvg,
  computePhoneScreenLayout,
} from "@/lib/metallicIPhoneFrame";

export type { MockupFrameColor } from "@/lib/mockupFrameColors";

export {
  DEFAULT_MOCKUP_FRAME_COLOR,
  MOCKUP_FRAME_PRESETS,
  normalizeMockupFrameColor,
  presetSwatchColor,
} from "@/lib/mockupFrameColors";
