import type { PerspectiveQuad } from "@/lib/mockupPerspectiveGeometry";
import {
  homographyMapDestToSrc,
  homographyUnitSquareToQuadInverse,
} from "@/lib/rectToQuadHomography";

export type SceneScreenMaskResult = {
  /** Alpha mask — 255 inside the lit screen glass. */
  screenAlpha: Uint8Array;
  /** Perspective quad in pixel space used for homography fill. */
  screenQuad: PerspectiveQuad;
  width: number;
  height: number;
};

/** Lit white screen glass baked into MD942 `-device.png` overlays. */
export function isBakedScreenPixel(r: number, g: number, b: number, a: number): boolean {
  return a > 200 && Math.min(r, g, b) >= 248;
}

/** White screen placeholder on the full scene plate PSD export. */
export function isSceneWhiteGlassPixel(r: number, g: number, b: number, a: number): boolean {
  return a > 200 && Math.min(r, g, b) >= 248;
}

function looksLikeDesignLayerPixel(r: number, g: number, b: number, a: number): boolean {
  if (a < 8) return false;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  return max > 180 || (max - min > 18 && max > 28);
}

function sign(px: number, py: number, ax: number, ay: number, bx: number, by: number): number {
  return (px - bx) * (ay - by) - (ax - bx) * (py - by);
}

function pointInTriangle(
  px: number,
  py: number,
  ax: number,
  ay: number,
  bx: number,
  by: number,
  cx: number,
  cy: number,
): boolean {
  const d1 = sign(px, py, ax, ay, bx, by);
  const d2 = sign(px, py, bx, by, cx, cy);
  const d3 = sign(px, py, cx, cy, ax, ay);
  const hasNeg = d1 < 0 || d2 < 0 || d3 < 0;
  const hasPos = d1 > 0 || d2 > 0 || d3 > 0;
  return !(hasNeg && hasPos);
}

export function pointInPerspectiveQuad(px: number, py: number, quad: PerspectiveQuad): boolean {
  const { tl, tr, br, bl } = quad;
  return (
    pointInTriangle(px, py, tl.x, tl.y, tr.x, tr.y, br.x, br.y) ||
    pointInTriangle(px, py, tl.x, tl.y, br.x, br.y, bl.x, bl.y)
  );
}

function quadBounds(quad: PerspectiveQuad, width: number, height: number) {
  const xs = [quad.tl.x, quad.tr.x, quad.br.x, quad.bl.x];
  const ys = [quad.tl.y, quad.tr.y, quad.br.y, quad.bl.y];
  return {
    minX: Math.max(0, Math.floor(Math.min(...xs))),
    maxX: Math.min(width - 1, Math.ceil(Math.max(...xs))),
    minY: Math.max(0, Math.floor(Math.min(...ys))),
    maxY: Math.min(height - 1, Math.ceil(Math.max(...ys))),
  };
}

function hasSceneWhiteGlassInQuad(
  width: number,
  height: number,
  screenQuad: PerspectiveQuad,
  scenePlateData?: Uint8ClampedArray | Buffer | null,
): boolean {
  if (!scenePlateData) return false;
  const { minX, maxX, minY, maxY } = quadBounds(screenQuad, width, height);

  for (let y = minY; y <= maxY; y += 1) {
    for (let x = minX; x <= maxX; x += 1) {
      if (!pointInPerspectiveQuad(x + 0.5, y + 0.5, screenQuad)) continue;
      const o = (y * width + x) * 4;
      if (isSceneWhiteGlassPixel(scenePlateData[o], scenePlateData[o + 1], scenePlateData[o + 2], scenePlateData[o + 3])) {
        return true;
      }
    }
  }

  return false;
}

function expandQuadFromCenter(quad: PerspectiveQuad, amount: number): PerspectiveQuad {
  const cx = (quad.tl.x + quad.tr.x + quad.br.x + quad.bl.x) / 4;
  const cy = (quad.tl.y + quad.tr.y + quad.br.y + quad.bl.y) / 4;
  const expand = (p: PerspectiveQuad["tl"]) => ({
    x: cx + (p.x - cx) * (1 + amount),
    y: cy + (p.y - cy) * (1 + amount),
  });
  return {
    tl: expand(quad.tl),
    tr: expand(quad.tr),
    br: expand(quad.br),
    bl: expand(quad.bl),
  };
}

function effectiveSceneScreenQuad(
  width: number,
  height: number,
  screenQuad: PerspectiveQuad,
  scenePlateData?: Uint8ClampedArray | Buffer | null,
): PerspectiveQuad {
  return hasSceneWhiteGlassInQuad(width, height, screenQuad, scenePlateData)
    ? screenQuad
    : expandQuadFromCenter(screenQuad, 0);
}

function insideRoundedUnitRect(u: number, v: number, radius = 0.072): boolean {
  if (u < 0 || u > 1 || v < 0 || v > 1) return false;

  const cx = u < radius ? radius : u > 1 - radius ? 1 - radius : u;
  const cy = v < radius ? radius : v > 1 - radius ? 1 - radius : v;
  const dx = u - cx;
  const dy = v - cy;
  return dx * dx + dy * dy <= radius * radius;
}

function hasMaskPixels(mask: Uint8Array, minPixels: number): boolean {
  let count = 0;
  for (let i = 0; i < mask.length; i += 1) {
    if (mask[i] < 128) continue;
    count += 1;
    if (count >= minPixels) return true;
  }
  return false;
}

function buildOverlayScreenHoleMask(
  width: number,
  height: number,
  screenQuad: PerspectiveQuad,
  overlayData: Uint8ClampedArray | Buffer,
): Uint8Array {
  const { minX, maxX, minY, maxY } = quadBounds(screenQuad, width, height);
  const roundedInv = homographyUnitSquareToQuadInverse(screenQuad);
  const seed = new Uint8Array(width * height);
  const centerX = Math.round((screenQuad.tl.x + screenQuad.tr.x + screenQuad.br.x + screenQuad.bl.x) / 4);
  const centerY = Math.round((screenQuad.tl.y + screenQuad.tr.y + screenQuad.br.y + screenQuad.bl.y) / 4);
  let bestStart = -1;
  let bestDistance = Infinity;

  for (let y = minY; y <= maxY; y += 1) {
    for (let x = minX; x <= maxX; x += 1) {
      if (!pointInPerspectiveQuad(x + 0.5, y + 0.5, screenQuad)) continue;
      if (roundedInv) {
        const uv = homographyMapDestToSrc(roundedInv, x + 0.5, y + 0.5);
        if (!uv || !insideRoundedUnitRect(uv.u, uv.v)) continue;
      }

      const p = y * width + x;
      const o = p * 4;
      const r = overlayData[o];
      const g = overlayData[o + 1];
      const b = overlayData[o + 2];
      const a = overlayData[o + 3];

      if (a >= 32 && !isBakedScreenPixel(r, g, b, a)) continue;
      seed[p] = 1;

      const dx = x - centerX;
      const dy = y - centerY;
      const distance = dx * dx + dy * dy;
      if (distance < bestDistance) {
        bestDistance = distance;
        bestStart = p;
      }
    }
  }

  if (bestStart < 0) return new Uint8Array(width * height);

  const mask = new Uint8Array(width * height);
  const queue = new Int32Array(width * height);
  let head = 0;
  let tail = 0;
  queue[tail++] = bestStart;
  mask[bestStart] = 255;

  while (head < tail) {
    const idx = queue[head++];
    const x = idx % width;
    const y = (idx - x) / width;
    const neighbors = [
      x + 1 < width ? idx + 1 : -1,
      x - 1 >= 0 ? idx - 1 : -1,
      y + 1 < height ? idx + width : -1,
      y - 1 >= 0 ? idx - width : -1,
    ];

    for (const next of neighbors) {
      if (next < 0 || !seed[next] || mask[next]) continue;
      mask[next] = 255;
      queue[tail++] = next;
    }
  }

  return mask;
}

/**
 * Pixels that receive the warped screenshot — white glass on the scene plate inside the
 * calibrated perspective quad. Matches the visible screen opening on angled MD942 mockups.
 */
export function buildSceneScreenFillMask(
  width: number,
  height: number,
  screenQuad: PerspectiveQuad,
  scenePlateData?: Uint8ClampedArray | Buffer | null,
  overlayData?: Uint8ClampedArray | Buffer | null,
): Uint8Array {
  const screenAlpha = new Uint8Array(width * height);
  const { minX, maxX, minY, maxY } = quadBounds(screenQuad, width, height);
  const useSceneWhiteMask = hasSceneWhiteGlassInQuad(width, height, screenQuad, scenePlateData);
  const roundedInv = homographyUnitSquareToQuadInverse(screenQuad);

  if (!useSceneWhiteMask && overlayData) {
    const overlayMask = buildOverlayScreenHoleMask(width, height, screenQuad, overlayData);
    if (hasMaskPixels(overlayMask, Math.max(128, Math.round(width * height * 0.002)))) {
      return overlayMask;
    }
  }

  for (let y = minY; y <= maxY; y += 1) {
    for (let x = minX; x <= maxX; x += 1) {
      if (!pointInPerspectiveQuad(x + 0.5, y + 0.5, screenQuad)) continue;
      if (roundedInv) {
        const uv = homographyMapDestToSrc(roundedInv, x + 0.5, y + 0.5);
        if (!uv || !insideRoundedUnitRect(uv.u, uv.v)) continue;
      }
      const p = y * width + x;
      const o = p * 4;

      if (scenePlateData && useSceneWhiteMask) {
        if (isSceneWhiteGlassPixel(scenePlateData[o], scenePlateData[o + 1], scenePlateData[o + 2], scenePlateData[o + 3])) {
          screenAlpha[p] = 255;
        }
        continue;
      }

      if (overlayData) {
        const r = overlayData[o];
        const g = overlayData[o + 1];
        const b = overlayData[o + 2];
        const a = overlayData[o + 3];
        if (isBakedScreenPixel(r, g, b, a)) {
          screenAlpha[p] = 255;
        }
        continue;
      }

      screenAlpha[p] = 255;
    }
  }

  return screenAlpha;
}

/** Build the screen mask + homography quad from scene plate white glass. */
export function buildSceneScreenMaskFromQuad(
  width: number,
  height: number,
  screenQuad: PerspectiveQuad,
  scenePlateData?: Uint8ClampedArray | Buffer | null,
  overlayData?: Uint8ClampedArray | Buffer | null,
): SceneScreenMaskResult {
  const effectiveQuad = effectiveSceneScreenQuad(width, height, screenQuad, scenePlateData);
  const screenAlpha = buildSceneScreenFillMask(width, height, effectiveQuad, scenePlateData, overlayData);
  return { screenAlpha, screenQuad: effectiveQuad, width, height };
}

function screenInteriorBounds(screenQuad: PerspectiveQuad, width: number, height: number) {
  const xs = [screenQuad.tl.x, screenQuad.tr.x, screenQuad.br.x, screenQuad.bl.x];
  const ys = [screenQuad.tl.y, screenQuad.tr.y, screenQuad.br.y, screenQuad.bl.y];
  return {
    left: Math.max(0, Math.floor(Math.min(...xs))),
    top: Math.max(0, Math.floor(Math.min(...ys))),
    right: Math.min(width, Math.ceil(Math.max(...xs))),
    bottom: Math.min(height, Math.ceil(Math.max(...ys))),
  };
}

/** Punch the screen opening using scene-plate white glass; hardware (DI, cameras) stays opaque. */
export function finalizeSceneDeviceOverlay(
  data: Uint8ClampedArray | Buffer,
  width: number,
  height: number,
  screenQuad: PerspectiveQuad,
  scenePlateData?: Uint8ClampedArray | Buffer | null,
  screenAlpha?: Uint8Array,
) {
  const { left, top, right, bottom } = screenInteriorBounds(screenQuad, width, height);
  const useSceneWhiteMask = hasSceneWhiteGlassInQuad(width, height, screenQuad, scenePlateData);
  const framePad = Math.max(18, Math.round(Math.min(width, height) * 0.045));

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const o = (y * width + x) * 4;
      const r = data[o];
      const g = data[o + 1];
      const b = data[o + 2];
      const a = data[o + 3];
      const inQuad = pointInPerspectiveQuad(x + 0.5, y + 0.5, screenQuad);
      const inScreen = x >= left && x < right && y >= top && y < bottom;
      const p = y * width + x;
      const inScreenMask = screenAlpha ? screenAlpha[p] >= 128 : inQuad;

      if (scenePlateData && useSceneWhiteMask && inQuad) {
        if (
          isSceneWhiteGlassPixel(
            scenePlateData[o],
            scenePlateData[o + 1],
            scenePlateData[o + 2],
            scenePlateData[o + 3],
          ) ||
          looksLikeDesignLayerPixel(r, g, b, a)
        ) {
          data[o + 3] = 0;
        }
        continue;
      }

      if (scenePlateData && !useSceneWhiteMask && inScreenMask) {
        data[o + 3] = 0;
        continue;
      }

      if (inScreen && isBakedScreenPixel(r, g, b, a)) {
        data[o + 3] = 0;
        continue;
      }

      if (inScreen && a > 0) {
        if (Math.min(r, g, b) >= 248) {
          data[o + 3] = 0;
          continue;
        }
        if (Math.max(r, g, b) < 240) {
          data[o + 3] = 255;
          continue;
        }
        if (a < 255 && Math.min(r, g, b) > 180) {
          data[o + 3] = 0;
          continue;
        }
      }

      if (!inScreen && a >= 8) {
        const nearScreenFrame =
          x >= left - framePad &&
          x < right + framePad &&
          y >= top - framePad &&
          y < bottom + framePad;
        const lum = (r + g + b) / 3;
        if (nearScreenFrame && a > 80) {
          data[o + 3] = 255;
        } else if (lum < 22) {
          data[o + 3] = Math.round(a * Math.max(0.04, lum / 22) * 0.55);
        }
      }
    }
  }
}

function collectLargestScreenBlob(
  data: Uint8ClampedArray | Buffer,
  width: number,
  height: number,
): Uint8Array {
  const binary = new Uint8Array(width * height);
  for (let i = 0; i < width * height; i += 1) {
    const o = i * 4;
    if (isBakedScreenPixel(data[o], data[o + 1], data[o + 2], data[o + 3])) binary[i] = 1;
  }

  const visited = new Uint8Array(width * height);
  let best: number[] = [];

  for (let start = 0; start < width * height; start += 1) {
    if (!binary[start] || visited[start]) continue;
    const queue = new Int32Array(width * height);
    let head = 0;
    let tail = 0;
    queue[tail++] = start;
    visited[start] = 1;
    const comp: number[] = [];

    while (head < tail) {
      const idx = queue[head++];
      comp.push(idx);
      const x = idx % width;
      const y = (idx - x) / width;
      const neighbors = [
        x + 1 < width ? idx + 1 : -1,
        x - 1 >= 0 ? idx - 1 : -1,
        y + 1 < height ? idx + width : -1,
        y - 1 >= 0 ? idx - width : -1,
      ];
      for (const ni of neighbors) {
        if (ni < 0 || !binary[ni] || visited[ni]) continue;
        visited[ni] = 1;
        queue[tail++] = ni;
      }
    }

    if (comp.length > best.length) best = comp;
  }

  const mask = new Uint8Array(width * height);
  for (const idx of best) {
    mask[idx] = 255;
  }
  return mask;
}

function samplePointsFromMask(mask: Uint8Array, width: number, height: number): [number, number][] {
  const points: [number, number][] = [];
  const gridStep = Math.max(4, Math.floor(Math.sqrt((width * height) / 60_000)));

  for (let y = 0; y < height; y += gridStep) {
    for (let x = 0; x < width; x += gridStep) {
      if (mask[y * width + x] >= 128) points.push([x, y]);
    }
  }

  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  let pMinX: [number, number] = [0, 0];
  let pMaxX: [number, number] = [0, 0];
  let pMinY: [number, number] = [0, 0];
  let pMaxY: [number, number] = [0, 0];

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (mask[y * width + x] < 128) continue;
      if (x < minX) {
        minX = x;
        pMinX = [x, y];
      }
      if (x > maxX) {
        maxX = x;
        pMaxX = [x, y];
      }
      if (y < minY) {
        minY = y;
        pMinY = [x, y];
      }
      if (y > maxY) {
        maxY = y;
        pMaxY = [x, y];
      }
    }
  }

  if (minX <= maxX) {
    points.push(pMinX, pMaxX, pMinY, pMaxY);
    const band = Math.max(4, Math.round((maxY - minY) * 0.02));
    let tl: [number, number] | null = null;
    let tr: [number, number] | null = null;
    let bl: [number, number] | null = null;
    let br: [number, number] | null = null;

    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        if (mask[y * width + x] < 128) continue;
        if (y <= minY + band) {
          if (!tl || x < tl[0] || (x === tl[0] && y < tl[1])) tl = [x, y];
          if (!tr || x > tr[0] || (x === tr[0] && y < tr[1])) tr = [x, y];
        }
        if (y >= maxY - band) {
          if (!bl || x < bl[0] || (x === bl[0] && y > bl[1])) bl = [x, y];
          if (!br || x > br[0] || (x === br[0] && y > br[1])) br = [x, y];
        }
      }
    }

    for (const corner of [tl, tr, bl, br]) {
      if (corner) points.push(corner);
    }
  }

  return points;
}

/** PCA-oriented rectangle for a screen blob — fallback when no calibrated quad exists. */
export function quadFromScreenPoints(points: [number, number][]): PerspectiveQuad {
  if (points.length < 4) {
    return {
      tl: { x: 0, y: 0 },
      tr: { x: 1, y: 0 },
      br: { x: 1, y: 1 },
      bl: { x: 0, y: 1 },
    };
  }

  let mx = 0;
  let my = 0;
  for (const [x, y] of points) {
    mx += x;
    my += y;
  }
  mx /= points.length;
  my /= points.length;

  let cxx = 0;
  let cyy = 0;
  let cxy = 0;
  for (const [x, y] of points) {
    const dx = x - mx;
    const dy = y - my;
    cxx += dx * dx;
    cyy += dy * dy;
    cxy += dx * dy;
  }

  const theta = 0.5 * Math.atan2(2 * cxy, cxx - cyy);
  let ux = Math.cos(theta);
  let uy = Math.sin(theta);
  let vx = -uy;
  let vy = ux;

  const us = new Float64Array(points.length);
  const vs = new Float64Array(points.length);
  for (let i = 0; i < points.length; i += 1) {
    us[i] = points[i][0] * ux + points[i][1] * uy;
    vs[i] = points[i][0] * vx + points[i][1] * vy;
  }
  us.sort();
  vs.sort();
  const lo = Math.floor(points.length * 0.004);
  const hi = Math.ceil(points.length * 0.996) - 1;
  let minU = us[lo];
  let maxU = us[hi];
  let minV = vs[lo];
  let maxV = vs[hi];

  if (maxU - minU < maxV - minV) {
    [ux, vx] = [vx, ux];
    [uy, vy] = [vy, uy];
    [minU, minV] = [minV, minU];
    [maxU, maxV] = [maxV, maxU];
  }

  const corner = (u: number, v: number) => ({ x: u * ux + v * vx, y: u * uy + v * vy });
  const corners = [corner(minU, minV), corner(minU, maxV), corner(maxU, maxV), corner(maxU, minV)];
  corners.sort((a, b) => a.y - b.y);
  const top = corners.slice(0, 2).sort((a, b) => a.x - b.x);
  const bottom = corners.slice(2, 4).sort((a, b) => a.x - b.x);
  return { tl: top[0], tr: top[1], br: bottom[1], bl: bottom[0] };
}

function analyzeSceneDeviceOverlayFromBlob(
  data: Uint8ClampedArray | Buffer,
  width: number,
  height: number,
): SceneScreenMaskResult {
  const mask = collectLargestScreenBlob(data, width, height);
  const screenQuad = quadFromScreenPoints(samplePointsFromMask(mask, width, height));
  return { screenAlpha: mask, screenQuad, width, height };
}

/** Derive screen fill mask + homography quad from scene plate + calibrated quad. */
export function analyzeSceneDeviceOverlay(
  overlayData: Uint8ClampedArray | Buffer,
  width: number,
  height: number,
  screenQuadPx?: PerspectiveQuad,
  scenePlateData?: Uint8ClampedArray | Buffer | null,
): SceneScreenMaskResult {
  if (screenQuadPx) {
    const effectiveQuad = effectiveSceneScreenQuad(width, height, screenQuadPx, scenePlateData);
    const screenAlpha = buildSceneScreenFillMask(
      width,
      height,
      effectiveQuad,
      scenePlateData,
      overlayData,
    );
    return { screenAlpha, screenQuad: effectiveQuad, width, height };
  }
  return analyzeSceneDeviceOverlayFromBlob(overlayData, width, height);
}

/** Knock out white screen glass; hardware + frame stay opaque (see finalizeSceneDeviceOverlay). */
export function punchSceneDeviceOverlay(
  data: Uint8ClampedArray | Buffer,
  width: number,
  height: number,
  _screenAlpha: Uint8Array,
  screenQuad?: PerspectiveQuad,
  scenePlateData?: Uint8ClampedArray | Buffer | null,
) {
  if (!screenQuad) return;
  finalizeSceneDeviceOverlay(data, width, height, screenQuad, scenePlateData, _screenAlpha);
}
