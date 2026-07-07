import sharp from "sharp";

function hexToRgb(hex: string) {
  const normalized = hex.replace("#", "").trim();
  const value =
    normalized.length === 3
      ? normalized
          .split("")
          .map((c) => c + c)
          .join("")
      : normalized.slice(0, 6);

  if (!/^[0-9a-fA-F]{6}$/.test(value)) {
    return { r: 45, g: 212, b: 191 };
  }

  return {
    r: parseInt(value.slice(0, 2), 16),
    g: parseInt(value.slice(2, 4), 16),
    b: parseInt(value.slice(4, 6), 16),
  };
}

function clampChannel(value: number) {
  return Math.min(255, Math.max(0, Math.round(value)));
}

function mixRgb(
  a: { r: number; g: number; b: number },
  b: { r: number; g: number; b: number },
  amount: number,
) {
  const t = Math.min(1, Math.max(0, amount));
  return {
    r: clampChannel(a.r + (b.r - a.r) * t),
    g: clampChannel(a.g + (b.g - a.g) * t),
    b: clampChannel(a.b + (b.b - a.b) * t),
  };
}

function rgb({ r, g, b }: { r: number; g: number; b: number }) {
  return `rgb(${r},${g},${b})`;
}

/** Premium brand plate — solid-mode cohesion without looking like a flat hex fill. */
export async function createSolidBackground(width: number, height: number, hexColor: string): Promise<Buffer> {
  const normalized = hexColor.startsWith("#") ? hexColor : `#${hexColor}`;
  const brand = hexToRgb(normalized);
  const black = { r: 5, g: 7, b: 12 };
  const ink = mixRgb(brand, black, 0.88);
  const deepBrand = mixRgb(brand, black, 0.62);
  const glow = mixRgb(brand, { r: 255, g: 255, b: 255 }, 0.18);
  const mist = mixRgb(brand, { r: 255, g: 255, b: 255 }, 0.48);
  const lowerStage = mixRgb(brand, black, 0.42);

  const svg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="baseWash" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${rgb(ink)}"/>
      <stop offset="46%" stop-color="${rgb(mixRgb(ink, deepBrand, 0.35))}"/>
      <stop offset="100%" stop-color="${rgb(black)}"/>
    </linearGradient>
    <radialGradient id="deviceHalo" cx="50%" cy="62%" r="52%">
      <stop offset="0%" stop-color="${rgb(glow)}" stop-opacity="0.42"/>
      <stop offset="38%" stop-color="${rgb(brand)}" stop-opacity="0.22"/>
      <stop offset="72%" stop-color="${rgb(deepBrand)}" stop-opacity="0.10"/>
      <stop offset="100%" stop-color="${rgb(black)}" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="lowerStage" cx="50%" cy="92%" r="82%">
      <stop offset="0%" stop-color="${rgb(lowerStage)}" stop-opacity="0.55"/>
      <stop offset="58%" stop-color="${rgb(deepBrand)}" stop-opacity="0.18"/>
      <stop offset="100%" stop-color="${rgb(black)}" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="headlineZone" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${rgb(black)}" stop-opacity="0.96"/>
      <stop offset="55%" stop-color="${rgb(black)}" stop-opacity="0.58"/>
      <stop offset="100%" stop-color="${rgb(black)}" stop-opacity="0"/>
    </linearGradient>
    <radialGradient id="cornerLight" cx="9%" cy="8%" r="46%">
      <stop offset="0%" stop-color="${rgb(mist)}" stop-opacity="0.16"/>
      <stop offset="100%" stop-color="${rgb(black)}" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="edgeVignette" cx="50%" cy="48%" r="78%">
      <stop offset="64%" stop-color="#000000" stop-opacity="0"/>
      <stop offset="100%" stop-color="#000000" stop-opacity="0.48"/>
    </radialGradient>
    <filter id="grain" x="0" y="0" width="100%" height="100%">
      <feTurbulence type="fractalNoise" baseFrequency="0.82" numOctaves="3" seed="7"/>
      <feColorMatrix type="saturate" values="0"/>
      <feComponentTransfer>
        <feFuncA type="table" tableValues="0 0.055"/>
      </feComponentTransfer>
    </filter>
  </defs>
  <rect width="${width}" height="${height}" fill="url(#baseWash)"/>
  <rect width="${width}" height="${height}" fill="url(#cornerLight)"/>
  <rect width="${width}" height="${height}" fill="url(#deviceHalo)"/>
  <rect width="${width}" height="${height}" fill="url(#lowerStage)"/>
  <rect width="${width}" height="${Math.round(height * 0.45)}" fill="url(#headlineZone)"/>
  <rect width="${width}" height="${height}" fill="url(#edgeVignette)"/>
  <rect width="${width}" height="${height}" filter="url(#grain)" opacity="0.75"/>
</svg>`;

  return sharp(Buffer.from(svg)).png().toBuffer();
}
