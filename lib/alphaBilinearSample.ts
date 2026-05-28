/** Bilinear sample with premultiplied-alpha blending (prevents white halos on warp edges). */
export function sampleBilinearPremultiplied(
  data: Buffer | Uint8ClampedArray,
  srcW: number,
  srcH: number,
  channels: number,
  u: number,
  v: number,
): [number, number, number, number] {
  const x = u * (srcW - 1);
  const y = v * (srcH - 1);
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const x1 = Math.min(srcW - 1, x0 + 1);
  const y1 = Math.min(srcH - 1, y0 + 1);
  const tx = x - x0;
  const ty = y - y0;

  const sample = (xi: number, yi: number) => {
    const i = (yi * srcW + xi) * channels;
    const a = channels >= 4 ? data[i + 3]! / 255 : 1;
    return {
      r: data[i]! * a,
      g: data[i + 1]! * a,
      b: data[i + 2]! * a,
      a,
    };
  };

  const p00 = sample(x0, y0);
  const p10 = sample(x1, y0);
  const p01 = sample(x0, y1);
  const p11 = sample(x1, y1);

  const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
  const lerpPx = (
    a: typeof p00,
    b: typeof p00,
    t: number,
  ) => ({
    r: lerp(a.r, b.r, t),
    g: lerp(a.g, b.g, t),
    b: lerp(a.b, b.b, t),
    a: lerp(a.a, b.a, t),
  });

  const top = lerpPx(p00, p10, tx);
  const bottom = lerpPx(p01, p11, tx);
  const out = lerpPx(top, bottom, ty);
  const a = out.a;

  if (a < 1 / 255) return [0, 0, 0, 0];

  return [
    Math.round(out.r / a),
    Math.round(out.g / a),
    Math.round(out.b / a),
    Math.round(a * 255),
  ];
}

/** Remove bright semi-transparent fringe pixels after perspective warp. */
export function cleanWarpAlphaFringe(
  out: Buffer | Uint8ClampedArray,
  width: number,
  height: number,
) {
  for (let i = 0; i < width * height; i += 1) {
    const o = i * 4;
    const a = out[o + 3]!;
    if (a < 6) {
      out[o] = 0;
      out[o + 1] = 0;
      out[o + 2] = 0;
      out[o + 3] = 0;
      continue;
    }
    if (a < 220) {
      const lum = (out[o]! + out[o + 1]! + out[o + 2]!) / 3;
      if (lum > 160) {
        const k = a / 255;
        out[o] = Math.round(out[o]! * k);
        out[o + 1] = Math.round(out[o + 1]! * k);
        out[o + 2] = Math.round(out[o + 2]! * k);
      }
    }
  }
}
