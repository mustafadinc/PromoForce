/**
 * Diagnostic: dump intermediate layers from the scene mockup rendering pipeline.
 *
 *   node scripts/debug-scene-render.mjs [slug]
 *
 * Outputs to public/mockups/_debug-<slug>-*.png
 */
import sharp from "sharp";
import { readFileSync } from "fs";
import path from "path";

const slug = process.argv[2] || "iphone-16-md942-05";
const meta = JSON.parse(readFileSync(`public/mockups/${slug}.json`, "utf8"));
const W = 1280;
const H = 2784;

// ---- helpers (same as runtime) ----

function solve8x8(a, b) {
  const n = 8;
  const m = a.map((row, i) => [...row, b[i]]);
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

function homographyUnitSquareToQuad(quad) {
  const src = [[0, 0], [1, 0], [1, 1], [0, 1]];
  const dst = [quad.tl, quad.tr, quad.br, quad.bl];
  const a = [];
  const b = [];
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

function invertHomography3(h) {
  const [a, b, c, d, e, f, g, h7, i] = h;
  const det = a * (e * i - f * h7) - b * (d * i - f * g) + c * (d * h7 - e * g);
  if (Math.abs(det) < 1e-12) return null;
  return [
    (e * i - f * h7) / det, (c * h7 - b * i) / det, (b * f - c * e) / det,
    (f * g - d * i) / det, (a * i - c * g) / det, (c * d - a * f) / det,
    (d * h7 - e * g) / det, (b * g - a * h7) / det, (a * e - b * d) / det,
  ];
}

function homographyMapDestToSrc(inv, x, y) {
  const [a, b, c, d, e, f, g, h7, i] = inv;
  const w = g * x + h7 * y + i;
  if (Math.abs(w) < 1e-9) return null;
  const u = (a * x + b * y + c) / w;
  const v = (d * x + e * y + f) / w;
  if (u < -0.02 || u > 1.02 || v < -0.02 || v > 1.02) return null;
  return { u, v };
}

function homographyUnitSquareToQuadInverse(quad) {
  const fwd = homographyUnitSquareToQuad(quad);
  if (!fwd) return null;
  return invertHomography3(fwd);
}

function isBakedScreenPixel(r, g, b, a) {
  return a > 200 && Math.min(r, g, b) >= 248;
}

function isSceneWhiteGlassPixel(r, g, b, a) {
  return a > 200 && Math.min(r, g, b) >= 248;
}

function pointInTriangle(px, py, ax, ay, bx, by, cx, cy) {
  const d1 = (px - bx) * (ay - by) - (ax - bx) * (py - by);
  const d2 = (px - bx) * (by - cy) - (bx - cx) * (py - by);
  // simpler sign test:
  const s1 = (px - bx) * (ay - by) - (ax - bx) * (py - by);
  const s2 = (px - cx) * (by - cy) - (bx - cx) * (py - cy);
  const s3 = (px - ax) * (cy - ay) - (cx - ax) * (py - ay);
  const hasNeg = s1 < 0 || s2 < 0 || s3 < 0;
  const hasPos = s1 > 0 || s2 > 0 || s3 > 0;
  return !(hasNeg && hasPos);
}

function pointInQuad(px, py, quad) {
  const { tl, tr, br, bl } = quad;
  return (
    pointInTriangle(px, py, tl.x, tl.y, tr.x, tr.y, br.x, br.y) ||
    pointInTriangle(px, py, tl.x, tl.y, br.x, br.y, bl.x, bl.y)
  );
}

// ---- main ----

const screenQuadPx = {
  tl: { x: meta.screenQuadNorm.tl.x * W, y: meta.screenQuadNorm.tl.y * H },
  tr: { x: meta.screenQuadNorm.tr.x * W, y: meta.screenQuadNorm.tr.y * H },
  br: { x: meta.screenQuadNorm.br.x * W, y: meta.screenQuadNorm.br.y * H },
  bl: { x: meta.screenQuadNorm.bl.x * W, y: meta.screenQuadNorm.bl.y * H },
};

console.log("Screen quad (px):", JSON.stringify(screenQuadPx));

// 1. Load scene plate
const scenePlateRaw = await sharp(`public/mockups/${slug}.png`)
  .resize(W, H, { fit: "fill" }).ensureAlpha().raw()
  .toBuffer({ resolveWithObject: true });
const scenePlateData = scenePlateRaw.data;

// Count white glass pixels in quad
let whiteInQuad = 0;
let totalInQuad = 0;
const qMinX = Math.max(0, Math.floor(Math.min(screenQuadPx.tl.x, screenQuadPx.tr.x, screenQuadPx.br.x, screenQuadPx.bl.x)));
const qMaxX = Math.min(W - 1, Math.ceil(Math.max(screenQuadPx.tl.x, screenQuadPx.tr.x, screenQuadPx.br.x, screenQuadPx.bl.x)));
const qMinY = Math.max(0, Math.floor(Math.min(screenQuadPx.tl.y, screenQuadPx.tr.y, screenQuadPx.br.y, screenQuadPx.bl.y)));
const qMaxY = Math.min(H - 1, Math.ceil(Math.max(screenQuadPx.tl.y, screenQuadPx.tr.y, screenQuadPx.br.y, screenQuadPx.bl.y)));

for (let y = qMinY; y <= qMaxY; y++) {
  for (let x = qMinX; x <= qMaxX; x++) {
    if (!pointInQuad(x + 0.5, y + 0.5, screenQuadPx)) continue;
    totalInQuad++;
    const o = (y * W + x) * 4;
    if (isSceneWhiteGlassPixel(scenePlateData[o], scenePlateData[o + 1], scenePlateData[o + 2], scenePlateData[o + 3])) {
      whiteInQuad++;
    }
  }
}
console.log(`Scene plate: ${whiteInQuad}/${totalInQuad} white glass pixels in quad (${(whiteInQuad / totalInQuad * 100).toFixed(1)}%)`);

// 2. Load device overlay
const deviceOverlay = await sharp(`public/mockups/${slug}-device.png`)
  .resize(W, H, { fit: "fill" }).ensureAlpha().raw()
  .toBuffer({ resolveWithObject: true });
const overlayData = deviceOverlay.data;

// Count opaque overlay pixels in screen quad
let opaqueInScreen = 0;
let transparentInScreen = 0;
for (let y = qMinY; y <= qMaxY; y++) {
  for (let x = qMinX; x <= qMaxX; x++) {
    if (!pointInQuad(x + 0.5, y + 0.5, screenQuadPx)) continue;
    const o = (y * W + x) * 4;
    const a = overlayData[o + 3];
    if (a > 128) {
      opaqueInScreen++;
    } else {
      transparentInScreen++;
    }
  }
}
console.log(`Device overlay: ${opaqueInScreen} opaque, ${transparentInScreen} transparent in screen quad`);
console.log(`Opaque ratio in screen: ${(opaqueInScreen / (opaqueInScreen + transparentInScreen) * 100).toFixed(1)}%`);

// 3. Visualize the screen alpha mask that the runtime would compute
// This simulates buildSceneScreenFillMask with scenePlateData
const roundedInv = homographyUnitSquareToQuadInverse(screenQuadPx);
function insideRoundedUnitRect(u, v, radius = 0.072) {
  if (u < 0 || u > 1 || v < 0 || v > 1) return false;
  const cx = u < radius ? radius : u > 1 - radius ? 1 - radius : u;
  const cy = v < radius ? radius : v > 1 - radius ? 1 - radius : v;
  const dx = u - cx;
  const dy = v - cy;
  return dx * dx + dy * dy <= radius * radius;
}

const screenAlpha = new Uint8Array(W * H);
let screenAlphaCount = 0;
const hasWhiteGlass = whiteInQuad > 0;
console.log(`Using white glass mask: ${hasWhiteGlass}`);

for (let y = qMinY; y <= qMaxY; y++) {
  for (let x = qMinX; x <= qMaxX; x++) {
    if (!pointInQuad(x + 0.5, y + 0.5, screenQuadPx)) continue;
    if (roundedInv) {
      const uv = homographyMapDestToSrc(roundedInv, x + 0.5, y + 0.5);
      if (!uv || !insideRoundedUnitRect(uv.u, uv.v)) continue;
    }
    const p = y * W + x;
    const o = p * 4;
    if (hasWhiteGlass) {
      if (isSceneWhiteGlassPixel(scenePlateData[o], scenePlateData[o + 1], scenePlateData[o + 2], scenePlateData[o + 3])) {
        screenAlpha[p] = 255;
        screenAlphaCount++;
      }
    } else {
      screenAlpha[p] = 255;
      screenAlphaCount++;
    }
  }
}
console.log(`Screen alpha mask pixels: ${screenAlphaCount}`);

// Save screen mask visualization
const maskVis = Buffer.alloc(W * H * 4, 0);
for (let i = 0; i < W * H; i++) {
  if (screenAlpha[i] >= 128) {
    maskVis[i * 4] = 0;
    maskVis[i * 4 + 1] = 255;
    maskVis[i * 4 + 2] = 0;
    maskVis[i * 4 + 3] = 255;
  }
}
await sharp(maskVis, { raw: { width: W, height: H, channels: 4 } })
  .png()
  .toFile(`public/mockups/_debug-${slug}-screen-mask.png`);
console.log(`Wrote _debug-${slug}-screen-mask.png`);

// 4. Save the scene plate for inspection
await sharp(scenePlateData, { raw: { width: W, height: H, channels: 4 } })
  .resize(640, Math.round(640 * H / W))
  .png()
  .toFile(`public/mockups/_debug-${slug}-scene-plate-thumb.png`);
console.log(`Wrote _debug-${slug}-scene-plate-thumb.png`);

// 5. Save device overlay for inspection
await sharp(overlayData, { raw: { width: W, height: H, channels: 4 } })
  .resize(640, Math.round(640 * H / W))
  .png()
  .toFile(`public/mockups/_debug-${slug}-device-overlay-thumb.png`);
console.log(`Wrote _debug-${slug}-device-overlay-thumb.png`);

console.log("\nDone. Check the _debug-* files in public/mockups/");
