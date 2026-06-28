/**
 * Visual alignment check — magenta screenshot warped into each MD942 device overlay.
 * Replicates the export order: background -> warped screenshot -> device overlay (shadow softened).
 * node scripts/test-scene-mockup-alignment.mjs
 */
import { readFileSync } from "fs";
import sharp from "sharp";

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

const SLUGS = [
  "iphone-16-md942-01",
  "iphone-16-md942-02",
  "iphone-16-md942-03",
  "iphone-16-md942-04",
  "iphone-16-md942-05",
];

const W = 1280;
const H = 2784;

function sceneScreenQuad(meta, canvasW, canvasH) {
  const q = meta.screenQuadNorm;
  const map = (p) => ({ x: p.x * canvasW, y: p.y * canvasH });
  return { tl: map(q.tl), tr: map(q.tr), br: map(q.br), bl: map(q.bl) };
}

async function warpScreenshotToQuad(screenshot, quad, outW, outH) {
  const inv = homographyUnitSquareToQuadInverse(quad);
  const { data, info } = await sharp(screenshot).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const srcW = info.width;
  const srcH = info.height;
  const channels = info.channels;
  const out = Buffer.alloc(outW * outH * 4, 0);

  if (!inv) return out;

  for (let y = 0; y < outH; y += 1) {
    for (let x = 0; x < outW; x += 1) {
      const uv = homographyMapDestToSrc(inv, x + 0.5, y + 0.5);
      if (!uv) continue;
      if (uv.u < 0 || uv.u > 1 || uv.v < 0 || uv.v > 1) continue;
      const u = Math.max(0, Math.min(srcW - 1, uv.u * (srcW - 1)));
      const v = Math.max(0, Math.min(srcH - 1, uv.v * (srcH - 1)));
      const x0 = Math.floor(u);
      const y0 = Math.floor(v);
      const idx = (y * outW + x) * 4;
      const si = (y0 * srcW + x0) * channels;
      out[idx] = data[si];
      out[idx + 1] = data[si + 1];
      out[idx + 2] = data[si + 2];
      out[idx + 3] = 255;
    }
  }
  return out;
}

async function softenShadow(devicePng) {
  const { data, info } = await sharp(devicePng).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const a = data[i + 3];
    if (a < 8) continue;
    const lum = (r + g + b) / 3;
    if (lum >= 22) continue;
    data[i + 3] = Math.round(a * Math.max(0.04, lum / 22) * 0.55);
  }
  return sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } }).png().toBuffer();
}

// Labeled grid screenshot so we can see warp orientation + fit.
const gridSvg = `<svg width="1179" height="2556" xmlns="http://www.w3.org/2000/svg">
  <rect width="100%" height="100%" fill="#10203a"/>
  <rect x="20" y="20" width="1139" height="2516" fill="none" stroke="#ff00ff" stroke-width="24"/>
  <line x1="0" y1="1278" x2="1179" y2="1278" stroke="#00ffaa" stroke-width="12"/>
  <line x1="589" y1="0" x2="589" y2="2556" stroke="#00ffaa" stroke-width="12"/>
  <text x="589" y="180" font-size="120" fill="#ffffff" text-anchor="middle">TOP</text>
  <text x="589" y="2460" font-size="120" fill="#ffffff" text-anchor="middle">BOTTOM</text>
</svg>`;
const testShot = await sharp(Buffer.from(gridSvg)).png().toBuffer();

for (const slug of SLUGS) {
  const meta = JSON.parse(readFileSync(`public/mockups/${slug}.json`, "utf8"));

  const bg = await sharp({
    create: { width: W, height: H, channels: 4, background: { r: 60, g: 70, b: 90, alpha: 255 } },
  })
    .png()
    .toBuffer();

  const quad = sceneScreenQuad(meta, W, H);
  const warpedRaw = await warpScreenshotToQuad(testShot, quad, W, H);
  const warped = await sharp(warpedRaw, { raw: { width: W, height: H, channels: 4 } }).png().toBuffer();

  const deviceRaw = await sharp(`public/mockups/${slug}-device.png`).resize(W, H, { fit: "fill" }).png().toBuffer();
  const device = await softenShadow(deviceRaw);

  // Diagnostic: device overlay (opaque white screen) UNDER a 55% warped grid.
  // The magenta grid should sit exactly on the white screen glass.
  const warpedTranslucent = await sharp(warped)
    .ensureAlpha()
    .composite([
      {
        input: Buffer.from([255, 255, 255, 140]),
        raw: { width: 1, height: 1, channels: 4 },
        tile: true,
        blend: "dest-in",
      },
    ])
    .png()
    .toBuffer();

  const out = await sharp(bg)
    .composite([
      { input: device, top: 0, left: 0 },
      { input: warpedTranslucent, top: 0, left: 0 },
    ])
    .png()
    .toBuffer();

  await sharp(out).toFile(`public/mockups/_test-${slug}.png`);
  console.log("wrote", slug);
}
