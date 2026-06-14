/**
 * One-time dev tool: bake a transparent device PNG + screen quad from a Creatoom
 * "PASTE YOUR DESIGN" PSD. Requires `npm i -D ag-psd` (not a runtime dependency).
 *
 *   node --max-old-space-size=8192 scripts/bake-mockup.mjs <psd> [outDir] [slug] [testShot]
 *
 * Outputs <slug>.png (device frame, black screen) + <slug>.json (screen quad).
 * Copy the quad/dimensions it prints into lib/assetMockup.ts.
 */
import { readPsd, initializeCanvas } from 'ag-psd';
import { createCanvas } from '@napi-rs/canvas';
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import sharp from 'sharp';

initializeCanvas(createCanvas);

const psdPath = process.argv[2];
const assetDir = process.argv[3] || 'public/mockups';
const slug = process.argv[4] || 'iphone-17-pro-cosmic-orange';
const proofDir = 'C:/Users/Alperen/Downloads/_psd_layers';
mkdirSync(assetDir, { recursive: true });

const buf = readFileSync(psdPath);
const psd = readPsd(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength), {
  useImageData: true,
  skipCompositeImageData: true,
  skipThumbnail: true,
});

let deviceLayer = null;
let designLayer = null;
function walk(layers) {
  for (const l of layers || []) {
    if (l.children) { walk(l.children); continue; }
    if (l.name === 'iPhone 17 Pro Cosmic Orange') deviceLayer = l;
    if (l.name === 'PASTE YOUR DESIGN') designLayer = l;
  }
}
walk(psd.children);
if (!deviceLayer || !designLayer) throw new Error('layers not found');

// --- 1. Detect screen quad from design layer alpha (full-canvas coords) ---
const dW = designLayer.right - designLayer.left;
const dH = designLayer.bottom - designLayer.top;
const dData = designLayer.imageData.data;
let best = {
  tl: { x: 0, y: 0, s: Infinity },   // min(x+y)
  tr: { x: 0, y: 0, s: -Infinity },  // max(x-y)
  br: { x: 0, y: 0, s: -Infinity },  // max(x+y)
  bl: { x: 0, y: 0, s: Infinity },   // min(x-y)
};
for (let y = 0; y < dH; y++) {
  for (let x = 0; x < dW; x++) {
    const a = dData[(y * dW + x) * 4 + 3];
    if (a < 160) continue;
    const gx = x + designLayer.left;
    const gy = y + designLayer.top;
    const sum = gx + gy;
    const diff = gx - gy;
    if (sum < best.tl.s) best.tl = { x: gx, y: gy, s: sum };
    if (sum > best.br.s) best.br = { x: gx, y: gy, s: sum };
    if (diff > best.tr.s) best.tr = { x: gx, y: gy, s: diff };
    if (diff < best.bl.s) best.bl = { x: gx, y: gy, s: diff };
  }
}

// --- 2. Save device PNG at full res ---
const devW = deviceLayer.right - deviceLayer.left;
const devH = deviceLayer.bottom - deviceLayer.top;
const devData = Buffer.from(
  deviceLayer.imageData.data.buffer,
  deviceLayer.imageData.data.byteOffset,
  deviceLayer.imageData.data.byteLength,
);
const devicePngPath = `${assetDir}/${slug}.png`;
await sharp(devData, { raw: { width: devW, height: devH, channels: 4 } })
  .png()
  .toFile(devicePngPath);

// quad relative to device PNG top-left
const rel = (p) => ({ x: p.x - deviceLayer.left, y: p.y - deviceLayer.top });
const quadRel = { tl: rel(best.tl), tr: rel(best.tr), br: rel(best.br), bl: rel(best.bl) };
const quadNorm = {
  tl: { x: quadRel.tl.x / devW, y: quadRel.tl.y / devH },
  tr: { x: quadRel.tr.x / devW, y: quadRel.tr.y / devH },
  br: { x: quadRel.br.x / devW, y: quadRel.br.y / devH },
  bl: { x: quadRel.bl.x / devW, y: quadRel.bl.y / devH },
};

const meta = {
  slug,
  device: 'iPhone 17 Pro',
  color: 'Cosmic Orange',
  source: 'Creatoom PSD',
  png: `${slug}.png`,
  width: devW,
  height: devH,
  screenQuad: quadRel,
  screenQuadNorm: quadNorm,
};
writeFileSync(`${assetDir}/${slug}.json`, JSON.stringify(meta, null, 2));
console.log('device', devW, 'x', devH);
console.log('quad rel', JSON.stringify(quadRel));
console.log('quad norm', JSON.stringify(quadNorm, (k, v) => typeof v === 'number' ? +v.toFixed(4) : v));

// --- 3. Proof composite ---
// minimal homography warp (unit square -> quad) inverse mapping
function solve(A, b, n) {
  for (let i = 0; i < n; i++) {
    let p = i;
    for (let r = i + 1; r < n; r++) if (Math.abs(A[r][i]) > Math.abs(A[p][i])) p = r;
    [A[i], A[p]] = [A[p], A[i]]; [b[i], b[p]] = [b[p], b[i]];
    for (let r = 0; r < n; r++) {
      if (r === i) continue;
      const f = A[r][i] / A[i][i];
      for (let c = i; c < n; c++) A[r][c] -= f * A[i][c];
      b[r] -= f * b[i];
    }
  }
  return b.map((v, i) => v / A[i][i]);
}
function homography(q) {
  const X = [q.tl, q.tr, q.br, q.bl];
  const U = [[0,0],[1,0],[1,1],[0,1]];
  const A = [], B = [];
  for (let i = 0; i < 4; i++) {
    const [u, v] = U[i]; const { x, y } = X[i];
    A.push([u, v, 1, 0, 0, 0, -u*x, -v*x]); B.push(x);
    A.push([0, 0, 0, u, v, 1, -u*y, -v*y]); B.push(y);
  }
  const h = solve(A, B, 8);
  return [h[0],h[1],h[2], h[3],h[4],h[5], h[6],h[7],1];
}
function invert3(m) {
  const [a,b,c,d,e,f,g,h,i] = m;
  const A=e*i-f*h, B=-(d*i-f*g), C=d*h-e*g, D=-(b*i-c*h), E=a*i-c*g, F=-(a*h-b*g), G=b*f-c*e, H=-(a*f-c*d), I=a*e-b*d;
  const det = a*A + b*B + c*C;
  return [A/det,D/det,G/det, B/det,E/det,H/det, C/det,F/det,I/det];
}
async function warpToQuad(src, quad, outW, outH) {
  const { data, info } = await sharp(src).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const sw = info.width, sh = info.height;
  const H = homography(quad);
  const inv = invert3(H);
  const out = Buffer.alloc(outW * outH * 4, 0);
  for (let y = 0; y < outH; y++) {
    for (let x = 0; x < outW; x++) {
      const dx = x + 0.5, dy = y + 0.5;
      const w = inv[6]*dx + inv[7]*dy + inv[8];
      const u = (inv[0]*dx + inv[1]*dy + inv[2]) / w;
      const v = (inv[3]*dx + inv[4]*dy + inv[5]) / w;
      if (u < 0 || u > 1 || v < 0 || v > 1) continue;
      const sx = Math.min(sw - 1, Math.max(0, Math.round(u * sw)));
      const sy = Math.min(sh - 1, Math.max(0, Math.round(v * sh)));
      const si = (sy * sw + sx) * 4, oi = (y * outW + x) * 4;
      out[oi] = data[si]; out[oi+1] = data[si+1]; out[oi+2] = data[si+2]; out[oi+3] = data[si+3];
    }
  }
  return sharp(out, { raw: { width: outW, height: outH, channels: 4 } }).png().toBuffer();
}

const testShot = process.argv[5] || 'C:/Users/Alperen/Downloads/Simulator Screenshot - iPhone 16 Pro - 2025-11-13 at 23.02.08.png';
const warpedScreen = await warpToQuad(testShot, quadRel, devW, devH);

// screen mask: where device frame layer is near-black opaque (the glass region)
const maskRGBA = Buffer.alloc(devW * devH * 4, 0);
for (let i = 0; i < devW * devH; i++) {
  const r = devData[i * 4], g = devData[i * 4 + 1], b = devData[i * 4 + 2], a = devData[i * 4 + 3];
  if (a > 200 && r < 48 && g < 48 && b < 48) maskRGBA[i * 4 + 3] = 255;
}
const maskPng = await sharp(maskRGBA, { raw: { width: devW, height: devH, channels: 4 } }).png().toBuffer();
const screenFill = await sharp(warpedScreen)
  .composite([{ input: maskPng, blend: 'dest-in' }])
  .png()
  .toBuffer();

// teal gradient background sized to device
const bgW = Math.round(devW * 1.5), bgH = Math.round(devH * 1.25);
const bg = await sharp({
  create: { width: bgW, height: bgH, channels: 4, background: { r: 10, g: 28, b: 32, alpha: 1 } },
}).composite([{
  input: Buffer.from(`<svg width="${bgW}" height="${bgH}"><defs><radialGradient id="g" cx="50%" cy="45%" r="70%"><stop offset="0%" stop-color="#0e5e57"/><stop offset="55%" stop-color="#0a2a2e"/><stop offset="100%" stop-color="#05151a"/></radialGradient></defs><rect width="100%" height="100%" fill="url(#g)"/></svg>`),
  top: 0, left: 0,
}]).png().toBuffer();

const devX = Math.round((bgW - devW) / 2);
const devY = Math.round((bgH - devH) / 2);
const bgMeta = await sharp(bg).metadata();
const wsMeta = await sharp(warpedScreen).metadata();
console.log('bg', bgMeta.width, bgMeta.height, 'warpedScreen', wsMeta.width, wsMeta.height, 'devX', devX, 'devY', devY);
const composited = await sharp(bg).composite([
  { input: devicePngPath, top: devY, left: devX },
  { input: screenFill, top: devY, left: devX },
]).png().toBuffer();
const proof = await sharp(composited).resize({ width: 700 }).png().toBuffer();
writeFileSync(`${proofDir}/_proof_composite.png`, proof);
console.log('proof written', `${proofDir}/_proof_composite.png`);
