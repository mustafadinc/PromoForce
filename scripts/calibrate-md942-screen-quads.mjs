/**
 * Calibrate MD942 screen quads from the white screen glass baked into `-device.png`.
 * Uses the minimum-area oriented rectangle of the screen-glass pixels, so it works
 * for both axis-aligned and rotated (floating / dual-depth) phones.
 *
 *   node scripts/calibrate-md942-screen-quads.mjs
 */
import { readFileSync, writeFileSync } from "fs";
import sharp from "sharp";

const SLUGS = [
  "iphone-16-md942-01",
  "iphone-16-md942-02",
  "iphone-16-md942-03",
  "iphone-16-md942-04",
  "iphone-16-md942-05",
];

/** Strict screen-glass test: the baked screen is pure neutral white (~250+). */
function isScreenGlass(r, g, b, a) {
  return a > 200 && Math.min(r, g, b) >= 248 && Math.max(r, g, b) - Math.min(r, g, b) <= 6;
}

/**
 * Largest connected screen-glass component. The strict white threshold isolates the
 * lit front screen; taking the biggest 4-connected blob drops stray highlight specks
 * (reflections, dust) that would otherwise distort the oriented bounding rectangle.
 */
function collectScreenPixels(data, w, h) {
  const mask = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i += 1) {
    const o = i * 4;
    if (isScreenGlass(data[o], data[o + 1], data[o + 2], data[o + 3])) mask[i] = 1;
  }

  const visited = new Uint8Array(w * h);
  let best = [];
  const queue = new Int32Array(w * h);

  for (let start = 0; start < w * h; start += 1) {
    if (!mask[start] || visited[start]) continue;
    let head = 0;
    let tail = 0;
    queue[tail++] = start;
    visited[start] = 1;
    const comp = [];
    while (head < tail) {
      const idx = queue[head++];
      const x = idx % w;
      const y = (idx - x) / w;
      comp.push([x, y]);
      if (x + 1 < w) {
        const n = idx + 1;
        if (mask[n] && !visited[n]) { visited[n] = 1; queue[tail++] = n; }
      }
      if (x - 1 >= 0) {
        const n = idx - 1;
        if (mask[n] && !visited[n]) { visited[n] = 1; queue[tail++] = n; }
      }
      if (y + 1 < h) {
        const n = idx + w;
        if (mask[n] && !visited[n]) { visited[n] = 1; queue[tail++] = n; }
      }
      if (y - 1 >= 0) {
        const n = idx - w;
        if (mask[n] && !visited[n]) { visited[n] = 1; queue[tail++] = n; }
      }
    }
    if (comp.length > best.length) best = comp;
  }

  return best;
}

/**
 * Tight oriented rectangle via PCA. The screen is a long rectangle, so the dominant
 * eigenvector of the pixel cloud is its long axis. Projecting onto that axis (and its
 * normal) yields a snug rectangle aligned to the real screen edges — robust to rounded
 * corners, the dynamic-island notch, and any rotation (unlike axis/diagonal extremes).
 */
function cornersFromPCA(points) {
  const n = points.length;
  let mx = 0;
  let my = 0;
  for (const p of points) {
    mx += p[0];
    my += p[1];
  }
  mx /= n;
  my /= n;

  let cxx = 0;
  let cyy = 0;
  let cxy = 0;
  for (const p of points) {
    const dx = p[0] - mx;
    const dy = p[1] - my;
    cxx += dx * dx;
    cyy += dy * dy;
    cxy += dx * dy;
  }

  const theta = 0.5 * Math.atan2(2 * cxy, cxx - cyy);
  let ux = Math.cos(theta);
  let uy = Math.sin(theta);
  let vx = -uy;
  let vy = ux;

  // Percentile-clamped extents: drop the brightest stray halo / anti-alias pixels just
  // outside the glass that would otherwise inflate the rectangle and bleed onto the bezel.
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

  // Make the U axis the LONG axis (screen height), V the short axis (screen width).
  if (maxU - minU < maxV - minV) {
    [ux, vx] = [vx, ux];
    [uy, vy] = [vy, uy];
    [minU, minV] = [minV, minU];
    [maxU, maxV] = [maxV, maxU];
  }

  const corner = (u, v) => ({ x: u * ux + v * vx, y: u * uy + v * vy });
  // U = long axis (top→bottom), V = short axis (left→right).
  const c = {
    a: corner(minU, minV),
    b: corner(minU, maxV),
    cc: corner(maxU, maxV),
    d: corner(maxU, minV),
  };
  const all = [c.a, c.b, c.cc, c.d];

  // Label by geometry: top two = smaller y; of those, left = smaller x.
  all.sort((p, q) => p.y - q.y);
  const [t1, t2] = [all[0], all[1]].sort((p, q) => p.x - q.x);
  const [b1, b2] = [all[2], all[3]].sort((p, q) => p.x - q.x);
  return { tl: t1, tr: t2, br: b2, bl: b1 };
}

const results = {};

for (const slug of SLUGS) {
  const jsonPath = `public/mockups/${slug}.json`;
  const meta = JSON.parse(readFileSync(jsonPath, "utf8"));
  const { data, info } = await sharp(`public/mockups/${slug}.png`)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const pts = collectScreenPixels(data, info.width, info.height);
  if (pts.length < 2000) {
    console.warn(slug, "weak screen detection:", pts.length, "px — skipping");
    continue;
  }
  const ordered = cornersFromPCA(pts);

  const round = (p) => ({ x: Math.round(p.x), y: Math.round(p.y) });
  const screenQuad = {
    tl: round(ordered.tl),
    tr: round(ordered.tr),
    br: round(ordered.br),
    bl: round(ordered.bl),
  };
  const screenQuadNorm = {
    tl: { x: screenQuad.tl.x / meta.width, y: screenQuad.tl.y / meta.height },
    tr: { x: screenQuad.tr.x / meta.width, y: screenQuad.tr.y / meta.height },
    br: { x: screenQuad.br.x / meta.width, y: screenQuad.br.y / meta.height },
    bl: { x: screenQuad.bl.x / meta.width, y: screenQuad.bl.y / meta.height },
  };

  meta.screenQuad = screenQuad;
  meta.screenQuadNorm = screenQuadNorm;
  writeFileSync(jsonPath, JSON.stringify(meta, null, 2));
  results[slug] = screenQuadNorm;

  console.log(slug, "quad", JSON.stringify(screenQuad));
}

// Emit ready-to-paste TS blocks. The assetMockup.ts screenQuadNorm values must be synced
// manually from these (regex auto-patching proved too fragile and corrupted the file).
console.log("\nSync these screenQuadNorm blocks into lib/assetMockup.ts:\n");
for (const [slug, q] of Object.entries(results)) {
  console.log(`  // ${slug}`);
  console.log(`    screenQuadNorm: {`);
  console.log(`      tl: { x: ${q.tl.x}, y: ${q.tl.y} },`);
  console.log(`      tr: { x: ${q.tr.x}, y: ${q.tr.y} },`);
  console.log(`      br: { x: ${q.br.x}, y: ${q.br.y} },`);
  console.log(`      bl: { x: ${q.bl.x}, y: ${q.bl.y} },`);
  console.log(`    },`);
}
console.log("\nUpdated JSON files. Sync assetMockup.ts manually from the blocks above.");
