import { readFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

/** Device template constants — iPhone 6.7" screen aspect (1290×2796). */
export const DEVICE_FRAME_WIDTH = 1030;
export const IPHONE_SCREEN_HEIGHT_RATIO = 2796 / 1290;
export const DEVICE_FRAME_HEIGHT = Math.round(DEVICE_FRAME_WIDTH * IPHONE_SCREEN_HEIGHT_RATIO);
export const DEVICE_BEZEL = 24;
export const DEVICE_SCREEN_CORNER_R = 58;
export const DEVICE_SCREEN_WIDTH = DEVICE_FRAME_WIDTH - 2 * DEVICE_BEZEL;
export const DEVICE_SCREEN_HEIGHT = DEVICE_FRAME_HEIGHT - 2 * DEVICE_BEZEL;

const DEVICE_FRAME_ASSET = path.join(process.cwd(), "assets", "device_frame.png");

let cachedFrame: Buffer | null = null;
const FRAME_CACHE_VERSION = 2;
let cachedFrameVersion = 0;

export function generateDeviceFrameSvg(): string {
  const w = DEVICE_FRAME_WIDTH;
  const h = DEVICE_FRAME_HEIGHT;
  const outerR = 82;
  const screenR = DEVICE_SCREEN_CORNER_R;
  const bezel = DEVICE_BEZEL;
  const screenW = w - bezel * 2;
  const screenH = h - bezel * 2;
  const diW = 130;
  const diH = 38;
  const diX = (w - diW) / 2;
  const diY = bezel + 14;

  return `<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <mask id="frameMask">
      <rect width="${w}" height="${h}" fill="white"/>
      <rect x="${bezel}" y="${bezel}" width="${screenW}" height="${screenH}" rx="${screenR}" fill="black"/>
    </mask>
    <linearGradient id="frameBody" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#2a2a2e"/>
      <stop offset="100%" stop-color="#121214"/>
    </linearGradient>
  </defs>
  <rect width="${w}" height="${h}" rx="${outerR}" fill="url(#frameBody)" mask="url(#frameMask)"/>
  <rect x="${diX}" y="${diY}" width="${diW}" height="${diH}" rx="${diH / 2}" fill="#08080a"/>
  <rect x="${w - 3}" y="340" width="5" height="120" rx="2.5" fill="#1f1f22"/>
  <rect x="-2" y="280" width="5" height="80" rx="2.5" fill="#1f1f22"/>
  <rect x="-2" y="380" width="5" height="80" rx="2.5" fill="#1f1f22"/>
  <rect x="0" y="0" width="${w}" height="${h}" rx="${outerR}" fill="none" stroke="rgba(255,255,255,0.28)" stroke-width="3"/>
  <rect x="${bezel - 1}" y="${bezel - 1}" width="${screenW + 2}" height="${screenH + 2}" rx="${screenR + 1}" fill="none" stroke="rgba(255,255,255,0.08)" stroke-width="1"/>
</svg>`;
}

async function loadBundledDeviceFrame(): Promise<Buffer | null> {
  try {
    const raw = await readFile(DEVICE_FRAME_ASSET);
    const meta = await sharp(raw).metadata();
    if (meta.width !== DEVICE_FRAME_WIDTH || meta.height !== DEVICE_FRAME_HEIGHT) {
      console.warn(
        `[device_frame] Expected ${DEVICE_FRAME_WIDTH}x${DEVICE_FRAME_HEIGHT}, got ${meta.width}x${meta.height} — using programmatic fallback.`,
      );
      return null;
    }
    return sharp(raw).png().toBuffer();
  } catch {
    return null;
  }
}

async function generateProgrammaticDeviceFrame(): Promise<Buffer> {
  return sharp(Buffer.from(generateDeviceFrameSvg())).png().toBuffer();
}

export async function getDeviceFrameBuffer(): Promise<Buffer> {
  if (cachedFrame && cachedFrameVersion === FRAME_CACHE_VERSION) return cachedFrame;

  cachedFrame = await generateProgrammaticDeviceFrame();
  cachedFrameVersion = FRAME_CACHE_VERSION;
  return cachedFrame;
}
