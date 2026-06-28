/** Soften baked-in opaque black shadow plates so AI backgrounds show through. */
export function softenOpaqueShadowInRgba(data: Uint8ClampedArray | Buffer, channels = 4) {
  for (let i = 0; i < data.length; i += channels) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const a = data[i + 3];
    if (a < 8) continue;

    const lum = (r + g + b) / 3;
    if (lum >= 22) continue;

    data[i + 3] = Math.round(a * Math.max(0.04, lum / 22) * 0.55);
  }
}
