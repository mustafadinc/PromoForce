import {
  buildMockupFrameGradients,
  type MockupFrameColor,
  resolveMockupFrameHex,
} from "@/lib/mockupFrameColors";

/** Metallic iPhone 17 Pro frame — shared by UI preview and export composite. */

export const METALLIC_FRAME_W = 430;
export const METALLIC_FRAME_H = 880;

/** Outer shell corner radius in design coordinates (matches frame SVG). */
export const METALLIC_OUTER_RADIUS = 48;

/** Bottom inner edge of the screen hole in design coordinates. */
const METALLIC_SCREEN_BOTTOM = 875;

export const METALLIC_SCREEN = {
  x: 5,
  y: 3,
  w: 420,
  h: METALLIC_SCREEN_BOTTOM - 3,
  r: 45,
} as const;

/** Horizontal overscan — equal bleed keeps side gaps balanced. */
export const METALLIC_SCREEN_CONTENT_BLEED_LEFT = 6;
export const METALLIC_SCREEN_CONTENT_BLEED_RIGHT = 6;

/** Fine horizontal centering tweak (positive = right, negative = left). */
export const METALLIC_SCREEN_CONTENT_SHIFT_X = -3;

/** Horizontal nudge in contain mode. */
export const METALLIC_SCREEN_OBJECT_SHIFT_X = 0;

/** Side inset — keeps screenshot corners inside rounded screen hole. */
export const METALLIC_SCREEN_CONTENT_INSET_SIDE = 2;

/** Slight shrink so square screenshot corners don't peek past frame radius. */
export const METALLIC_SCREEN_CONTAIN_SCALE = 0.988;

/** Vertical crop anchor when width-fit fallback is required. */
export const METALLIC_SCREEN_OBJECT_ANCHOR_Y = 0.5;

/** Bump when mockup fit math changes — export recompositing picks this up. */
export const MOCKUP_SCREEN_FIT_VERSION = 9;

/** Inset from top inner bezel / Dynamic Island — room above status bar. */
export const METALLIC_SCREEN_CONTENT_OFFSET_Y = 8;

/** Inset from bottom inner bezel — small gap under tab bar. */
export const METALLIC_SCREEN_CONTENT_INSET_BOTTOM = 2;

/** Production raster size for sharp compositing. */
export const DEVICE_FRAME_WIDTH = 1030;
export const DEVICE_FRAME_HEIGHT = Math.round(DEVICE_FRAME_WIDTH * (METALLIC_FRAME_H / METALLIC_FRAME_W));

export const DEVICE_SCREEN_X = Math.round((METALLIC_SCREEN.x / METALLIC_FRAME_W) * DEVICE_FRAME_WIDTH);
export const DEVICE_SCREEN_Y = Math.round((METALLIC_SCREEN.y / METALLIC_FRAME_H) * DEVICE_FRAME_HEIGHT);
export const DEVICE_SCREEN_WIDTH = Math.round((METALLIC_SCREEN.w / METALLIC_FRAME_W) * DEVICE_FRAME_WIDTH);
export const DEVICE_SCREEN_HEIGHT = Math.round((METALLIC_SCREEN.h / METALLIC_FRAME_H) * DEVICE_FRAME_HEIGHT);
export const DEVICE_SCREEN_CORNER_R = Math.round((METALLIC_SCREEN.r / METALLIC_FRAME_W) * DEVICE_FRAME_WIDTH);

/** @deprecated use DEVICE_SCREEN_X */
export const DEVICE_BEZEL = DEVICE_SCREEN_X;

export const deviceFrameScreenInsets = {
  left: `${(METALLIC_SCREEN.x / METALLIC_FRAME_W) * 100}%`,
  top: `${(METALLIC_SCREEN.y / METALLIC_FRAME_H) * 100}%`,
  width: `${(METALLIC_SCREEN.w / METALLIC_FRAME_W) * 100}%`,
  height: `${(METALLIC_SCREEN.h / METALLIC_FRAME_H) * 100}%`,
  borderRadius: `${METALLIC_SCREEN.r}px`,
} as const;

export const deviceFrameAspectRatio = `${METALLIC_FRAME_W} / ${METALLIC_FRAME_H}`;

export function outerPhoneRadii(phoneW: number, phoneH: number) {
  return {
    rx: (METALLIC_OUTER_RADIUS / METALLIC_FRAME_W) * phoneW,
    ry: (METALLIC_OUTER_RADIUS / METALLIC_FRAME_H) * phoneH,
  };
}

export function computePhoneScreenLayout(phoneX: number, phoneY: number, phoneW: number, phoneH: number) {
  const scale = phoneW / METALLIC_FRAME_W;

  return {
    phoneX,
    phoneY,
    phoneW,
    phoneH,
    screenX: Math.round(phoneX + METALLIC_SCREEN.x * scale),
    screenY: Math.round(phoneY + METALLIC_SCREEN.y * scale),
    screenW: Math.round(METALLIC_SCREEN.w * scale),
    screenH: Math.round(METALLIC_SCREEN.h * scale),
    screenRadius: Math.round(METALLIC_SCREEN.r * scale),
  };
}

type MetallicFrameSvgOptions = {
  idPrefix?: string;
  width?: number;
  height?: number;
  includeShadow?: boolean;
  frameColor?: MockupFrameColor | null;
};

function defaultTitaniumGradients(id: string) {
  return {
    titanium: `<linearGradient id="${id}-titanium" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#f8f8fa"/>
      <stop offset="6%" stop-color="#e8e8ec"/>
      <stop offset="18%" stop-color="#b0b0b8"/>
      <stop offset="32%" stop-color="#787880"/>
      <stop offset="46%" stop-color="#505058"/>
      <stop offset="54%" stop-color="#3a3a40"/>
      <stop offset="66%" stop-color="#707078"/>
      <stop offset="80%" stop-color="#b8b8c0"/>
      <stop offset="92%" stop-color="#e0e0e6"/>
      <stop offset="100%" stop-color="#fafafa"/>
    </linearGradient>`,
    edgeShine: `<linearGradient id="${id}-edge-shine" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.7"/>
      <stop offset="8%" stop-color="#ffffff" stop-opacity="0.12"/>
      <stop offset="50%" stop-color="#000000" stop-opacity="0.08"/>
      <stop offset="92%" stop-color="#000000" stop-opacity="0.15"/>
      <stop offset="100%" stop-color="#ffffff" stop-opacity="0.35"/>
    </linearGradient>`,
    btn: `<linearGradient id="${id}-btn" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#ececf0"/>
      <stop offset="40%" stop-color="#909098"/>
      <stop offset="100%" stop-color="#585860"/>
    </linearGradient>`,
  };
}

export function generateMetallicIPhoneFrameSvg(options: MetallicFrameSvgOptions = {}): string {
  const id = options.idPrefix ?? "metallic";
  const w = options.width ?? METALLIC_FRAME_W;
  const h = options.height ?? METALLIC_FRAME_H;
  const customHex = resolveMockupFrameHex(options.frameColor);
  const gradients = customHex ? buildMockupFrameGradients(customHex, id) : defaultTitaniumGradients(id);
  const shadow = options.includeShadow
    ? `<filter id="${id}-shadow" x="-20%" y="-10%" width="140%" height="130%">
        <feDropShadow dx="0" dy="20" stdDeviation="18" flood-color="#000" flood-opacity="0.5"/>
        <feDropShadow dx="0" dy="4" stdDeviation="3" flood-color="#000" flood-opacity="0.3"/>
      </filter>`
    : "";

  const shadowRef = options.includeShadow ? ` filter="url(#${id}-shadow)"` : "";

  return `<svg width="${w}" height="${h}" viewBox="0 0 ${METALLIC_FRAME_W} ${METALLIC_FRAME_H}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    ${shadow}
    ${gradients.titanium}
    ${gradients.edgeShine}
    ${gradients.btn}
  </defs>
  <g${shadowRef}>
    <path fill="url(#${id}-titanium)" fill-rule="evenodd" d="
      M 48 0 H 382 Q 430 0 430 48 V 832 Q 430 880 382 880 H 48 Q 0 880 0 832 V 48 Q 0 0 48 0 Z
      M 50 3 H 380 Q 425 3 425 48 V 830 Q 425 875 380 875 H 50 Q 5 875 5 830 V 48 Q 5 3 50 3 Z
    "/>
    <path fill="url(#${id}-edge-shine)" fill-rule="evenodd" opacity="0.5" d="
      M 48 0 H 382 Q 430 0 430 48 V 832 Q 430 880 382 880 H 48 Q 0 880 0 832 V 48 Q 0 0 48 0 Z
      M 50 3 H 380 Q 425 3 425 48 V 830 Q 425 875 380 875 H 50 Q 5 875 5 830 V 48 Q 5 3 50 3 Z
    "/>
    <rect x="158" y="1" width="114" height="1" rx="0.5" fill="rgba(0,0,0,0.25)"/>
    <rect x="158" y="876" width="114" height="1" rx="0.5" fill="rgba(0,0,0,0.25)"/>
    <rect x="152" y="16" width="126" height="34" rx="17" fill="#000"/>
    <rect x="152" y="16" width="126" height="34" rx="17" fill="none" stroke="rgba(255,255,255,0.06)" stroke-width="0.75"/>
    <circle cx="256" cy="33" r="6" fill="#1c1c1e" stroke="rgba(255,255,255,0.1)" stroke-width="0.5"/>
    <circle cx="256" cy="33" r="2.5" fill="#08080a"/>
    <rect x="0" y="252" width="3" height="58" rx="1.5" fill="url(#${id}-btn)"/>
    <rect x="0" y="334" width="3" height="32" rx="1.5" fill="url(#${id}-btn)"/>
    <rect x="0" y="378" width="3" height="32" rx="1.5" fill="url(#${id}-btn)"/>
    <rect x="427" y="322" width="3" height="48" rx="1.5" fill="url(#${id}-btn)"/>
  </g>
</svg>`;
}

export function generateDeviceFrameSvg(): string {
  return generateMetallicIPhoneFrameSvg({
    width: DEVICE_FRAME_WIDTH,
    height: DEVICE_FRAME_HEIGHT,
    idPrefix: "export-frame",
  });
}
