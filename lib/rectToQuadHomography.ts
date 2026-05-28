import type { PerspectiveQuad } from "@/lib/mockupPerspectiveGeometry";

/** 3×3 homography (row-major), maps normalized source (u,v)∈[0,1]² → destination (x,y). */
export type Homography3 = [
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
];

function solve8x8(a: number[][], b: number[]): number[] | null {
  const n = 8;
  const m = a.map((row, i) => [...row, b[i]!]);

  for (let col = 0; col < n; col += 1) {
    let pivot = col;
    for (let row = col + 1; row < n; row += 1) {
      if (Math.abs(m[row][col]) > Math.abs(m[pivot][col])) pivot = row;
    }
    if (Math.abs(m[pivot][col]) < 1e-12) return null;
    [m[col], m[pivot]] = [m[pivot], m[col]];

    const div = m[col][col];
    for (let j = col; j <= n; j += 1) m[col][j] /= div;

    for (let row = 0; row < n; row += 1) {
      if (row === col) continue;
      const factor = m[row][col];
      for (let j = col; j <= n; j += 1) m[row][j] -= factor * m[col][j];
    }
  }

  return m.map((row) => row[n]);
}

/**
 * Perspective homography: unit square (0,0)-(1,1) → quad corners tl,tr,br,bl.
 * Use inverse mapping for warp (bilinear inverse is wrong for perspective trapezoids).
 */
export function homographyUnitSquareToQuad(quad: PerspectiveQuad): Homography3 | null {
  const src = [
    [0, 0],
    [1, 0],
    [1, 1],
    [0, 1],
  ];
  const dst = [quad.tl, quad.tr, quad.br, quad.bl];

  const a: number[][] = [];
  const b: number[] = [];

  for (let i = 0; i < 4; i += 1) {
    const [u, v] = src[i];
    const { x, y } = dst[i];
    a.push([u, v, 1, 0, 0, 0, -u * x, -v * x]);
    b.push(x);
    a.push([0, 0, 0, u, v, 1, -u * y, -v * y]);
    b.push(y);
  }

  const h = solve8x8(a, b);
  if (!h) return null;

  return [h[0], h[1], h[2], h[3], h[4], h[5], h[6], h[7], 1];
}

export function invertHomography3(h: Homography3): Homography3 | null {
  const [a, b, c, d, e, f, g, h7, i] = h;
  const det =
    a * (e * i - f * h7) - b * (d * i - f * g) + c * (d * h7 - e * g);
  if (Math.abs(det) < 1e-12) return null;

  const inv: Homography3 = [
    (e * i - f * h7) / det,
    (c * h7 - b * i) / det,
    (b * f - c * e) / det,
    (f * g - d * i) / det,
    (a * i - c * g) / det,
    (c * d - a * f) / det,
    (d * h7 - e * g) / det,
    (b * g - a * h7) / det,
    (a * e - b * d) / det,
  ];
  return inv;
}

/** Map destination pixel → normalized source (u,v) in [0,1]. */
export function homographyMapDestToSrc(
  inv: Homography3,
  x: number,
  y: number,
): { u: number; v: number } | null {
  const [a, b, c, d, e, f, g, h7, i] = inv;
  const w = g * x + h7 * y + i;
  if (Math.abs(w) < 1e-9) return null;
  const u = (a * x + b * y + c) / w;
  const v = (d * x + e * y + f) / w;
  if (u < -0.02 || u > 1.02 || v < -0.02 || v > 1.02) return null;
  return { u, v };
}

export function homographyUnitSquareToQuadInverse(quad: PerspectiveQuad): Homography3 | null {
  const fwd = homographyUnitSquareToQuad(quad);
  if (!fwd) return null;
  return invertHomography3(fwd);
}
