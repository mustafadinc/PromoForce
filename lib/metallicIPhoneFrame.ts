import {
  buildMockupFrameGradients,
  type MockupFrameColor,
  resolveMockupFrameHex,
} from "@/lib/mockupFrameColors";

/** Metallic iPhone 17 Pro frame — shared by UI preview and export composite. */

export const METALLIC_FRAME_W = 430;
export const METALLIC_FRAME_H = 900;

/** Outer shell corner radius in design coordinates (matches frame SVG). */
export const METALLIC_OUTER_RADIUS = 48;

export const METALLIC_SCREEN = {
  x: 15,
  y: 15,
  w: 400,
  h: 870,
  r: 33,
} as const;

/** Horizontal overscan — equal bleed keeps side gaps balanced. */
export const METALLIC_SCREEN_CONTENT_BLEED_LEFT = 4;
export const METALLIC_SCREEN_CONTENT_BLEED_RIGHT = 4;

/** Fine horizontal centering tweak (positive = right, negative = left). */
export const METALLIC_SCREEN_CONTENT_SHIFT_X = -2;

/** Horizontal nudge in contain mode. */
export const METALLIC_SCREEN_OBJECT_SHIFT_X = 0;

/** Side inset — keeps screenshot corners inside rounded screen hole. */
export const METALLIC_SCREEN_CONTENT_INSET_SIDE = 1;

/** Slight shrink so square screenshot corners don't peek past frame radius. */
export const METALLIC_SCREEN_CONTAIN_SCALE = 0.99;

/** Vertical crop anchor when width-fit fallback is required. */
export const METALLIC_SCREEN_OBJECT_ANCHOR_Y = 0.5;

/** Bump when mockup fit math changes — export recompositing picks this up. */
export const MOCKUP_SCREEN_FIT_VERSION = 15;

/** Inset from top inner bezel / Dynamic Island — room above status bar. */
export const METALLIC_SCREEN_CONTENT_OFFSET_Y = 6;

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
      <stop offset="0%" stop-color="#f4f4f6"/>
      <stop offset="5%" stop-color="#e2e2e6"/>
      <stop offset="15%" stop-color="#a8a8b0"/>
      <stop offset="30%" stop-color="#7a7a82"/>
      <stop offset="45%" stop-color="#5a5a60"/>
      <stop offset="55%" stop-color="#404044"/>
      <stop offset="65%" stop-color="#606066"/>
      <stop offset="80%" stop-color="#aaaaaf"/>
      <stop offset="92%" stop-color="#c4c4ca"/>
      <stop offset="100%" stop-color="#ebebec"/>
    </linearGradient>`,
    edgeShine: `<linearGradient id="${id}-edge-shine" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.85"/>
      <stop offset="6%" stop-color="#ffffff" stop-opacity="0.15"/>
      <stop offset="50%" stop-color="#000000" stop-opacity="0.15"/>
      <stop offset="94%" stop-color="#000000" stop-opacity="0.25"/>
      <stop offset="100%" stop-color="#ffffff" stop-opacity="0.45"/>
    </linearGradient>`,
    btn: `<linearGradient id="${id}-btn" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#d0d0d6"/>
      <stop offset="40%" stop-color="#76767e"/>
      <stop offset="100%" stop-color="#46464a"/>
    </linearGradient>`,
    mid: "#8a8a92",
    deep: "#303033",
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

  return `<svg width="${w}" height="${h}" viewBox="0 0 ${METALLIC_FRAME_W} ${METALLIC_FRAME_H}" style="overflow: visible;" xmlns="http://www.w3.org/2000/svg">
  <defs>
    ${shadow}
    ${gradients.titanium}
    ${gradients.edgeShine}
    ${gradients.btn}
    <linearGradient id="${id}-btn-dark" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#444"/>
      <stop offset="50%" stop-color="#111"/>
      <stop offset="100%" stop-color="#333"/>
    </linearGradient>
  </defs>
  <g${shadowRef}>
    <!-- Left Buttons -->
    <rect x="-2" y="180" width="4" height="30" rx="1.5" fill="url(#${id}-btn)"/>
    <rect x="-2" y="240" width="4" height="60" rx="1.5" fill="url(#${id}-btn)"/>
    <rect x="-2" y="320" width="4" height="60" rx="1.5" fill="url(#${id}-btn)"/>
    
    <!-- Right Buttons -->
    <rect x="428" y="260" width="4" height="90" rx="1.5" fill="url(#${id}-btn)"/>
    <rect x="428" y="560" width="2" height="70" rx="1" fill="url(#${id}-btn-dark)"/>

    <!-- Titanium Frame Outer -->
    <path fill="url(#${id}-titanium)" fill-rule="evenodd" d="
      M 48 0 H 382 Q 430 0 430 48 V 852 Q 430 900 382 900 H 48 Q 0 900 0 852 V 48 Q 0 0 48 0 Z
      M 48 2 H 382 Q 428 2 428 48 V 852 Q 428 898 382 898 H 48 Q 2 898 2 852 V 48 Q 2 2 48 2 Z
    "/>
    <path fill="url(#${id}-edge-shine)" fill-rule="evenodd" d="
      M 48 0 H 382 Q 430 0 430 48 V 852 Q 430 900 382 900 H 48 Q 0 900 0 852 V 48 Q 0 0 48 0 Z
      M 48 2 H 382 Q 428 2 428 48 V 852 Q 428 898 382 898 H 48 Q 2 898 2 852 V 48 Q 2 2 48 2 Z
    "/>

    <!-- Antenna Bands -->
    <rect x="100" y="0" width="4" height="3" fill="#222" opacity="0.6"/>
    <rect x="326" y="0" width="4" height="3" fill="#222" opacity="0.6"/>
    <rect x="100" y="897" width="4" height="3" fill="#222" opacity="0.6"/>
    <rect x="326" y="897" width="4" height="3" fill="#222" opacity="0.6"/>
    <rect x="0" y="150" width="3" height="4" fill="#222" opacity="0.6"/>
    <rect x="0" y="750" width="3" height="4" fill="#222" opacity="0.6"/>
    <rect x="427" y="150" width="3" height="4" fill="#222" opacity="0.6"/>
    <rect x="427" y="750" width="3" height="4" fill="#222" opacity="0.6"/>

    <!-- Black Glass Bezel -->
    <path fill="#050505" fill-rule="evenodd" d="
      M 48 2 H 382 Q 428 2 428 48 V 852 Q 428 898 382 898 H 48 Q 2 898 2 852 V 48 Q 2 2 48 2 Z
      M 48 15 H 382 Q 415 15 415 48 V 852 Q 415 885 382 885 H 48 Q 15 885 15 852 V 48 Q 15 15 48 15 Z
    "/>
    
    <!-- Screen Inner Edge Highlights (Depth) -->
    <path fill="none" stroke="rgba(255,255,255,0.06)" stroke-width="1.5" d="
      M 48 15 H 382 Q 415 15 415 48 V 852 Q 415 885 382 885 H 48 Q 15 885 15 852 V 48 Q 15 15 48 15 Z
    "/>
    <path fill="none" stroke="#000" stroke-width="3" d="
      M 48 15 H 382 Q 415 15 415 48 V 852 Q 415 885 382 885 H 48 Q 15 885 15 852 V 48 Q 15 15 48 15 Z
    " opacity="0.5" style="transform: translate(0, 1px)"/>

    <!-- Dynamic Island -->
    <g transform="translate(152, 26)">
      <rect x="0" y="0" width="126" height="36" rx="18" fill="#000"/>
      <!-- Face ID module -->
      <circle cx="18" cy="18" r="7" fill="#1c1c1e" stroke="rgba(255,255,255,0.04)" stroke-width="0.5"/>
      <circle cx="18" cy="18" r="3" fill="#08080a"/>
      <!-- Front Camera -->
      <circle cx="108" cy="18" r="8" fill="#0a0a0c" stroke="rgba(255,255,255,0.03)" stroke-width="0.5"/>
      <circle cx="108" cy="18" r="4" fill="#030304"/>
      <!-- Lens reflection -->
      <circle cx="109" cy="16" r="1.5" fill="rgba(255,255,255,0.15)"/>
    </g>
    
    <!-- Top Ear Speaker Grill -->
    <rect x="180" y="4" width="70" height="2" rx="1" fill="#000"/>
    <rect x="180" y="4" width="70" height="2" rx="1" fill="none" stroke="rgba(255,255,255,0.1)" stroke-width="0.5"/>
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
