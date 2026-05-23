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

/** Cinematic brand plate — dark base + accent glow (not a flat gray wash). */
export async function createSolidBackground(width: number, height: number, hexColor: string): Promise<Buffer> {
  const normalized = hexColor.startsWith("#") ? hexColor : `#${hexColor}`;
  const { r, g, b } = hexToRgb(normalized);
  const deepR = Math.max(0, Math.round(r * 0.22));
  const deepG = Math.max(0, Math.round(g * 0.22));
  const deepB = Math.max(0, Math.round(b * 0.22));
  const glowR = Math.min(255, r + 40);
  const glowG = Math.min(255, g + 40);
  const glowB = Math.min(255, b + 40);

  const svg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <radialGradient id="accentGlow" cx="50%" cy="78%" r="72%">
      <stop offset="0%" stop-color="rgb(${glowR},${glowG},${glowB})" stop-opacity="0.42"/>
      <stop offset="38%" stop-color="rgb(${r},${g},${b})" stop-opacity="0.28"/>
      <stop offset="72%" stop-color="rgb(${deepR},${deepG},${deepB})" stop-opacity="0.85"/>
      <stop offset="100%" stop-color="#06080c"/>
    </radialGradient>
    <linearGradient id="headlineZone" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#0c1018" stop-opacity="0.92"/>
      <stop offset="42%" stop-color="#0c1018" stop-opacity="0.35"/>
      <stop offset="100%" stop-color="#0c1018" stop-opacity="0"/>
    </linearGradient>
    <radialGradient id="topSpot" cx="50%" cy="18%" r="55%">
      <stop offset="0%" stop-color="rgb(${r},${g},${b})" stop-opacity="0.12"/>
      <stop offset="100%" stop-color="#06080c" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="${width}" height="${height}" fill="#06080c"/>
  <rect width="${width}" height="${height}" fill="url(#accentGlow)"/>
  <rect width="${width}" height="${height}" fill="url(#topSpot)"/>
  <rect width="${width}" height="${Math.round(height * 0.45)}" fill="url(#headlineZone)"/>
</svg>`;

  return sharp(Buffer.from(svg)).png().toBuffer();
}
