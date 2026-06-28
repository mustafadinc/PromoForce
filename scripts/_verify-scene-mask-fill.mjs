/**
 * Verify calibrated-quad scene composite for all MD942 templates.
 * node scripts/_verify-scene-mask-fill.mjs
 */
import { readFileSync } from "fs";
import sharp from "sharp";

function isBaked(r, g, b, a) {
  return a > 200 && Math.min(r, g, b) >= 248;
}

function sign(px, py, ax, ay, bx, by) {
  return (px - bx) * (ay - by) - (ax - bx) * (py - by);
}

function pointInTriangle(px, py, ax, ay, bx, by, cx, cy) {
  const d1 = sign(px, py, ax, ay, bx, by);
  const d2 = sign(px, py, bx, by, cx, cy);
  const d3 = sign(px, py, cx, cy, ax, ay);
  const hasNeg = d1 < 0 || d2 < 0 || d3 < 0;
  const hasPos = d1 > 0 || d2 > 0 || d3 > 0;
  return !(hasNeg && hasPos);
}

function pointInQuad(px, py, q) {
  return (
    pointInTriangle(px, py, q.tl.x, q.tl.y, q.tr.x, q.tr.y, q.br.x, q.br.y) ||
    pointInTriangle(px, py, q.tl.x, q.tl.y, q.br.x, q.br.y, q.bl.x, q.bl.y)
  );
}

function sceneScreenQuad(meta, canvasW, canvasH) {
  const q = meta.screenQuadNorm;
  const map = (p) => ({ x: p.x * canvasW, y: p.y * canvasH });
  return { tl: map(q.tl), tr: map(q.tr), br: map(q.br), bl: map(q.bl) };
}

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
      const f = m[row][col];
      for (let j = col; j <= n; j += 1) m[row][j] -= f * m[col][j];
    }
  }
  return m.map((row) => row[n]);
}

function homInv(quad) {
  const src = [
    [0, 0],
    [1, 0],
    [1, 1],
    [0, 1],
  ];
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
  const [A, B, C, D, E, F, G, H] = h;
  const det = A * (E * 1 - F * H) - B * (D * 1 - F * G) + C * (D * H - E * G);
  if (Math.abs(det) < 1e-12) return null;
  return [
    (E * 1 - F * H) / det,
    (C * H - B * 1) / det,
    (B * F - C * E) / det,
    (F * G - D * 1) / det,
    (A * 1 - C * G) / det,
    (C * D - A * F) / det,
    (D * H - E * G) / det,
    (B * G - A * H) / det,
    (A * E - B * D) / det,
  ];
}

function sample(data, sw, sh, ch, u, v) {
  const x = u * (sw - 1);
  const y = v * (sh - 1);
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const si = (y0 * sw + x0) * ch;
  return [data[si], data[si + 1], data[si + 2], 255];
}

const W = 1280;
const H = 2784;
const gridSvg = `<svg width="1179" height="2556" xmlns="http://www.w3.org/2000/svg">
  <rect width="100%" height="100%" fill="#10203a"/>
  <rect x="20" y="20" width="1139" height="2516" fill="none" stroke="#ff00ff" stroke-width="24"/>
  <line x1="0" y1="1278" x2="1179" y2="1278" stroke="#00ffaa" stroke-width="12"/>
  <text x="589" y="180" font-size="120" fill="#ffffff" text-anchor="middle">TOP</text>
  <text x="589" y="2460" font-size="120" fill="#ffffff" text-anchor="middle">BOTTOM</text>
</svg>`;
const shot = await sharp(Buffer.from(gridSvg)).png().toBuffer();
const { data: shotData, info: si } = await sharp(shot).ensureAlpha().raw().toBuffer({ resolveWithObject: true });

for (const id of ["01", "02", "03", "04", "05"]) {
  const slug = `iphone-16-md942-${id}`;
  const meta = JSON.parse(readFileSync(`public/mockups/${slug}.json`, "utf8"));
  const quad = sceneScreenQuad(meta, W, H);

  const { data, info } = await sharp(`public/mockups/${slug}-device.png`)
    .resize(W, H, { fit: "fill" })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const screenAlpha = new Uint8Array(W * H);
  for (let y = 0; y < H; y += 1) {
    for (let x = 0; x < W; x += 1) {
      if (!pointInQuad(x + 0.5, y + 0.5, quad)) continue;
      const p = y * W + x;
      const o = p * 4;
      if (!isBaked(data[o], data[o + 1], data[o + 2], data[o + 3])) continue;
      screenAlpha[p] = 255;
    }
  }

  const inv = homInv(quad);
  const out = Buffer.alloc(W * H * 4, 0);
  const [a, b, c, d, e, f, g, h7, i] = inv;
  let filled = 0;
  for (let y = 0; y < H; y += 1) {
    for (let x = 0; x < W; x += 1) {
      const p = y * W + x;
      if (screenAlpha[p] < 128) continue;
      const denom = g * (x + 0.5) + h7 * (y + 0.5) + i;
      if (Math.abs(denom) < 1e-9) continue;
      let u = (a * (x + 0.5) + b * (y + 0.5) + c) / denom;
      let v = (d * (x + 0.5) + e * (y + 0.5) + f) / denom;
      u = Math.max(0, Math.min(1, u));
      v = Math.max(0, Math.min(1, v));
      const rgba = sample(shotData, si.width, si.height, si.channels, u, v);
      const o = p * 4;
      out[o] = rgba[0];
      out[o + 1] = rgba[1];
      out[o + 2] = rgba[2];
      out[o + 3] = rgba[3];
      filled += 1;
    }
  }

  for (let j = 0; j < W * H; j += 1) {
    const o = j * 4;
    const x = j % W;
    const y = (j - x) / W;
    if (
      (screenAlpha[j] === 255 || pointInQuad(x + 0.5, y + 0.5, quad)) &&
      isBaked(data[o], data[o + 1], data[o + 2], data[o + 3])
    ) {
      data[o + 3] = 0;
    }
  }

  const bg = await sharp({
    create: { width: W, height: H, channels: 4, background: { r: 30, g: 40, b: 55, alpha: 255 } },
  })
    .png()
    .toBuffer();
  const screen = await sharp(out, { raw: { width: W, height: H, channels: 4 } }).png().toBuffer();
  const overlay = await sharp(data, { raw: { width: W, height: H, channels: 4 } }).png().toBuffer();
  await sharp(bg)
    .composite([{ input: screen }, { input: overlay }])
    .toFile(`public/mockups/_sim-${slug}.png`);
  console.log(slug, "filled", filled, "quad tl", Math.round(quad.tl.x), Math.round(quad.tl.y));
}
