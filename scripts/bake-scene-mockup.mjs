/**
 * Bake a lifestyle/scene PSD mockup for App Store composite.
 *
 *   node --max-old-space-size=8192 scripts/bake-scene-mockup.mjs <psd> <slug> [designLayerPattern]
 *
 * Outputs public/mockups/<slug>.png (portrait 1280×2784 cover crop) + <slug>.json
 */
import { readPsd, initializeCanvas } from "ag-psd";
import { createCanvas } from "@napi-rs/canvas";
import { readFileSync, writeFileSync, mkdirSync } from "fs";
import sharp from "sharp";

initializeCanvas(createCanvas);

const psdPath = process.argv[2];
const slug = process.argv[3];
const designPattern =
  process.argv[4] || "REPLACE THIS SCREEN|YOUR DESIGN HERE|PASTE YOUR DESIGN|Design";
const assetDir = "public/mockups";
const OUT_W = 1280;
const OUT_H = 2784;

if (!psdPath || !slug) {
  console.error(
    "Usage: node scripts/bake-scene-mockup.mjs <psd> <slug> [designLayerPattern]",
  );
  process.exit(1);
}

mkdirSync(assetDir, { recursive: true });

const patterns = designPattern.split("|").map((s) => s.trim().toLowerCase());

function shouldSkipLayer(layer, path = []) {
  if (layer.hidden) return true;
  const name = (layer.name || "").toLowerCase();
  if (name.includes("delete this layer")) return true;
  // Screen placeholder — screenshot is warped in at composite time.
  if (name === "design" && path.some((segment) => segment.toLowerCase() === "mockup")) return true;
  // These rely on PSD blend modes; flat compositing crushes the scene to black/white.
  if (name === "highlights" || name === "noise" || name.startsWith("noise ")) return true;
  return false;
}

function flattenPaintLayers(layers, out = [], path = []) {
  for (const layer of layers || []) {
    const nextPath = [...path, layer.name || ""];
    if (shouldSkipLayer(layer, nextPath)) continue;
    if (layer.children?.length) {
      flattenPaintLayers(layer.children, out, nextPath);
      continue;
    }
    if (layer.imageData) out.push({ layer, path: nextPath });
  }
  return out;
}

function isMockupDeviceLayer(path, layerName) {
  const pathLower = path.map((segment) => segment.toLowerCase());
  const inMockup = pathLower.includes("mockup");
  const name = (layerName || "").toLowerCase();
  if (!inMockup) return false;
  if (name === "design") return false;
  return true;
}

function findLayerByName(layers, targetName, path = []) {
  for (const layer of layers || []) {
    const nextPath = [...path, layer.name || ""];
    if (layer.children?.length) {
      const nested = findLayerByName(layer.children, targetName, nextPath);
      if (nested) return nested;
      continue;
    }
    if ((layer.name || "").toLowerCase() === targetName.toLowerCase() && layer.imageData) {
      return layer;
    }
  }
  return null;
}

function cropCenterForPortrait(srcW, srcH, focusLayer, designLayer) {
  const focus = focusLayer ?? designLayer;
  const scale = Math.max(OUT_W / srcW, OUT_H / srcH);
  const scaledW = srcW * scale;
  const scaledH = srcH * scale;

  const focusCx = ((focus.left + focus.right) / 2) * scale;
  const focusCy = ((focus.top + focus.bottom) / 2) * scale;

  let cropLeft = focusCx - OUT_W / 2;
  let cropTop = focusCy - OUT_H / 2;
  cropLeft = Math.max(0, Math.min(cropLeft, scaledW - OUT_W));
  cropTop = Math.max(0, Math.min(cropTop, scaledH - OUT_H));

  return { scale, cropLeft, cropTop };
}
function findDesignLayer(layers) {
  let best = null;
  let bestScore = -1;

  function walk(nodes, path = []) {
    for (const layer of nodes || []) {
      const nextPath = [...path, layer.name || ""];
      if (layer.children?.length) {
        walk(layer.children, nextPath);
        continue;
      }
      if (layer.hidden || !layer.imageData) continue;
      const name = (layer.name || "").toLowerCase();
      if (!patterns.some((pattern) => name.includes(pattern))) continue;

      const area = Math.max(0, layer.right - layer.left) * Math.max(0, layer.bottom - layer.top);
      const inMockupGroup = nextPath.some((segment) => segment.toLowerCase() === "mockup") ? 1 : 0;
      const score = inMockupGroup * 1e12 + area;
      if (score > bestScore) {
        bestScore = score;
        best = layer;
      }
    }
  }

  walk(layers);
  return best;
}

async function layerToPng(layer) {
  const { imageData } = layer;
  const raw = Buffer.from(
    imageData.data.buffer,
    imageData.data.byteOffset,
    imageData.data.byteLength,
  );
  return sharp(raw, {
    raw: { width: imageData.width, height: imageData.height, channels: 4 },
  }).png().toBuffer();
}

/** Clip layer bitmap to canvas bounds (handles noise layers that extend past edges). */
async function clippedComposite(layer, canvasW, canvasH) {
  const left = layer.left ?? 0;
  const top = layer.top ?? 0;
  const srcW = layer.imageData.width;
  const srcH = layer.imageData.height;

  const srcLeft = Math.max(0, -left);
  const srcTop = Math.max(0, -top);
  const destLeft = Math.max(0, left);
  const destTop = Math.max(0, top);
  const visibleW = Math.min(srcW - srcLeft, canvasW - destLeft);
  const visibleH = Math.min(srcH - srcTop, canvasH - destTop);

  if (visibleW <= 0 || visibleH <= 0) return null;

  const full = await layerToPng(layer);
  const clipped = await sharp(full)
    .extract({ left: srcLeft, top: srcTop, width: visibleW, height: visibleH })
    .png()
    .toBuffer();

  return { input: clipped, left: destLeft, top: destTop };
}

async function compositeScenePsd(psd) {
  const paintLayers = flattenPaintLayers(psd.children);
  const composites = [];

  for (const { layer } of paintLayers) {
    const entry = await clippedComposite(layer, psd.width, psd.height);
    if (entry) composites.push(entry);
  }

  if (!composites.length) {
    throw new Error("No paint layers found after excluding watermark layers.");
  }

  return sharp({
    create: {
      width: psd.width,
      height: psd.height,
      channels: 4,
      background: { r: 232, g: 232, b: 232, alpha: 255 },
    },
  })
    .composite(composites)
    .png()
    .toBuffer();
}

/** White screen placeholder baked into PSD Design layer — punched at composite time. */
function isWhiteScreenPlaceholder(r, g, b, a) {
  return a > 200 && Math.min(r, g, b) >= 248;
}

/** Design layer hardware (Dynamic Island, cameras) — keep opaque, exclude white placeholder. */
async function designHardwareComposite(designLayer, canvasW, canvasH) {
  const left = designLayer.left ?? 0;
  const top = designLayer.top ?? 0;
  const srcW = designLayer.imageData.width;
  const srcH = designLayer.imageData.height;
  const raw = Buffer.from(
    designLayer.imageData.data.buffer,
    designLayer.imageData.data.byteOffset,
    designLayer.imageData.data.byteLength,
  );
  const { data, info } = await sharp(raw, {
    raw: { width: srcW, height: srcH, channels: 4 },
  })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const a = data[i + 3];
    if (a < 8) continue;
    if (isWhiteScreenPlaceholder(r, g, b, a)) {
      data[i + 3] = 0;
      continue;
    }
    data[i + 3] = 255;
  }

  const png = await sharp(data, {
    raw: { width: info.width, height: info.height, channels: info.channels },
  })
    .png()
    .toBuffer();

  const srcLeft = Math.max(0, -left);
  const srcTop = Math.max(0, -top);
  const destLeft = Math.max(0, left);
  const destTop = Math.max(0, top);
  const visibleW = Math.min(info.width - srcLeft, canvasW - destLeft);
  const visibleH = Math.min(info.height - srcTop, canvasH - destTop);
  if (visibleW <= 0 || visibleH <= 0) return null;

  const clipped = await sharp(png)
    .extract({ left: srcLeft, top: srcTop, width: visibleW, height: visibleH })
    .png()
    .toBuffer();

  return { input: clipped, left: destLeft, top: destTop };
}

function softenExteriorShadow(data, width, height, screenLeft, screenTop, screenRight, screenBottom) {
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const i = (y * width + x) * 4;
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const a = data[i + 3];
      if (a < 8) continue;
      if (x >= screenLeft && x < screenRight && y >= screenTop && y < screenBottom) continue;
      const lum = (r + g + b) / 3;
      if (lum >= 22) continue;
      data[i + 3] = Math.round(a * Math.max(0.04, lum / 22) * 0.55);
    }
  }
}

function isSceneWhiteGlass(r, g, b, a) {
  return a > 200 && Math.min(r, g, b) >= 248;
}

function finishDeviceOverlayData(data, width, height, screenQuadOut, scenePlateData) {
  const screenLeft = Math.max(
    0,
    Math.floor(Math.min(screenQuadOut.tl.x, screenQuadOut.tr.x, screenQuadOut.br.x, screenQuadOut.bl.x)),
  );
  const screenTop = Math.max(
    0,
    Math.floor(Math.min(screenQuadOut.tl.y, screenQuadOut.tr.y, screenQuadOut.br.y, screenQuadOut.bl.y)),
  );
  const screenRight = Math.min(
    width,
    Math.ceil(Math.max(screenQuadOut.tl.x, screenQuadOut.tr.x, screenQuadOut.br.x, screenQuadOut.bl.x)),
  );
  const screenBottom = Math.min(
    height,
    Math.ceil(Math.max(screenQuadOut.tl.y, screenQuadOut.tr.y, screenQuadOut.br.y, screenQuadOut.bl.y)),
  );

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const i = (y * width + x) * 4;
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const a = data[i + 3];
      const inScreen =
        x >= screenLeft && x < screenRight && y >= screenTop && y < screenBottom;

      if (scenePlateData && inScreen) {
        if (
          isSceneWhiteGlass(
            scenePlateData[i],
            scenePlateData[i + 1],
            scenePlateData[i + 2],
            scenePlateData[i + 3],
          )
        ) {
          data[i + 3] = 0;
        }
        continue;
      }

      if (inScreen && isWhiteScreenPlaceholder(r, g, b, a)) {
        data[i + 3] = 0;
        continue;
      }

      if (inScreen && a > 0) {
        if (Math.min(r, g, b) >= 248) {
          data[i + 3] = 0;
          continue;
        }
        if (Math.max(r, g, b) < 240) {
          data[i + 3] = 255;
          continue;
        }
        if (a < 255 && Math.min(r, g, b) > 180) {
          data[i + 3] = 0;
          continue;
        }
      }
    }
  }

  softenExteriorShadow(data, width, height, screenLeft, screenTop, screenRight, screenBottom);
}

/** Mockup group + Design hardware (DI, cameras) — transparent screen hole for compositing. */
async function compositeMockupDevicePsd(psd, designLayer) {
  const paintLayers = flattenPaintLayers(psd.children).filter(({ layer, path }) =>
    isMockupDeviceLayer(path, layer.name),
  );
  const composites = [];

  for (const { layer } of paintLayers) {
    const entry = await clippedComposite(layer, psd.width, psd.height);
    if (entry) composites.push(entry);
  }

  const hardware = await designHardwareComposite(designLayer, psd.width, psd.height);
  if (hardware) composites.push(hardware);

  if (!composites.length) {
    throw new Error("No mockup device layers found under Mockup group.");
  }

  return sharp({
    create: {
      width: psd.width,
      height: psd.height,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite(composites)
    .png()
    .toBuffer();
}

function isScreenGlass(r, g, b, a) {
  return a > 200 && Math.min(r, g, b) >= 248 && Math.max(r, g, b) - Math.min(r, g, b) <= 6;
}

function collectScreenGlassPoints(data, w, h) {
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
        if (mask[n] && !visited[n]) {
          visited[n] = 1;
          queue[tail++] = n;
        }
      }
      if (x - 1 >= 0) {
        const n = idx - 1;
        if (mask[n] && !visited[n]) {
          visited[n] = 1;
          queue[tail++] = n;
        }
      }
      if (y + 1 < h) {
        const n = idx + w;
        if (mask[n] && !visited[n]) {
          visited[n] = 1;
          queue[tail++] = n;
        }
      }
      if (y - 1 >= 0) {
        const n = idx - w;
        if (mask[n] && !visited[n]) {
          visited[n] = 1;
          queue[tail++] = n;
        }
      }
    }
    if (comp.length > best.length) best = comp;
  }

  const step = best.length > 80_000 ? Math.ceil(best.length / 80_000) : 1;
  const points = [];
  for (let i = 0; i < best.length; i += step) points.push(best[i]);
  return points;
}

function cornersFromPCA(points) {
  const n = points.length;
  if (n < 4) return null;
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

  const us = new Float64Array(n);
  const vs = new Float64Array(n);
  for (let i = 0; i < n; i += 1) {
    us[i] = points[i][0] * ux + points[i][1] * uy;
    vs[i] = points[i][0] * vx + points[i][1] * vy;
  }
  us.sort();
  vs.sort();
  const lo = Math.floor(n * 0.004);
  const hi = Math.ceil(n * 0.996) - 1;
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

  const corner = (u, v) => ({ x: u * ux + v * vx, y: u * uy + v * vy });
  const c = {
    a: corner(minU, minV),
    b: corner(minU, maxV),
    cc: corner(maxU, maxV),
    d: corner(maxU, minV),
  };
  const all = [c.a, c.b, c.cc, c.d];
  all.sort((p, q) => p.y - q.y);
  const [t1, t2] = [all[0], all[1]].sort((p, q) => p.x - q.x);
  const [b1, b2] = [all[2], all[3]].sort((p, q) => p.x - q.x);
  return { tl: t1, tr: t2, br: b2, bl: b1 };
}

function detectScreenQuadFromWhiteGlass(data, width, height, fallback) {
  const points = collectScreenGlassPoints(data, width, height);
  if (points.length < 2000) return fallback;
  const ordered = cornersFromPCA(points);
  if (!ordered) return fallback;
  const round = (p) => ({ x: Math.round(p.x), y: Math.round(p.y) });
  const screenQuad = {
    tl: round(ordered.tl),
    tr: round(ordered.tr),
    br: round(ordered.br),
    bl: round(ordered.bl),
  };
  const quadH =
    Math.max(screenQuad.br.y, screenQuad.bl.y) - Math.min(screenQuad.tl.y, screenQuad.tr.y);
  const quadW =
    Math.max(screenQuad.tr.x, screenQuad.br.x) - Math.min(screenQuad.tl.x, screenQuad.bl.x);
  if (quadH < height * 0.25 || quadW < width * 0.12) return fallback;

  const screenQuadNorm = {
    tl: { x: screenQuad.tl.x / width, y: screenQuad.tl.y / height },
    tr: { x: screenQuad.tr.x / width, y: screenQuad.tr.y / height },
    br: { x: screenQuad.br.x / width, y: screenQuad.br.y / height },
    bl: { x: screenQuad.bl.x / width, y: screenQuad.bl.y / height },
  };
  return { screenQuad, screenQuadNorm };
}

const buf = readFileSync(psdPath);
const psd = readPsd(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength), {
  useImageData: true,
  skipCompositeImageData: false,
  skipThumbnail: true,
});

const designLayer = findDesignLayer(psd.children);
if (!designLayer) throw new Error(`Design layer not found (patterns: ${patterns.join(", ")})`);

if (designLayer.imageData && designLayer.imageData.data) {
  const dData = designLayer.imageData.data;
  for (let i = 0; i < dData.length; i += 4) {
    const a = dData[i + 3];
    if (a >= 8) {
      dData[i] = 255;
      dData[i + 1] = 255;
      dData[i + 2] = 255;
      dData[i + 3] = 255;
    }
  }
}


const iphoneLayer = findLayerByName(psd.children, "iPhone");

const srcW = psd.width;
const srcH = psd.height;
const srcData = await compositeScenePsd(psd);
const deviceData = await compositeMockupDevicePsd(psd, designLayer);

const screenQuadSrc = {
  tl: { x: designLayer.left, y: designLayer.top },
  tr: { x: designLayer.right, y: designLayer.top },
  br: { x: designLayer.right, y: designLayer.bottom },
  bl: { x: designLayer.left, y: designLayer.bottom },
};

const { scale, cropLeft, cropTop } = cropCenterForPortrait(srcW, srcH, iphoneLayer, designLayer);

function mapPoint(p) {
  return {
    x: p.x * scale - cropLeft,
    y: p.y * scale - cropTop,
  };
}

let screenQuadOut = {
  tl: mapPoint(screenQuadSrc.tl),
  tr: mapPoint(screenQuadSrc.tr),
  br: mapPoint(screenQuadSrc.br),
  bl: mapPoint(screenQuadSrc.bl),
};

let screenQuadNorm = {
  tl: { x: screenQuadOut.tl.x / OUT_W, y: screenQuadOut.tl.y / OUT_H },
  tr: { x: screenQuadOut.tr.x / OUT_W, y: screenQuadOut.tr.y / OUT_H },
  br: { x: screenQuadOut.br.x / OUT_W, y: screenQuadOut.br.y / OUT_H },
  bl: { x: screenQuadOut.bl.x / OUT_W, y: screenQuadOut.bl.y / OUT_H },
};

const scenePngPath = `${assetDir}/${slug}.png`;
const devicePngPath = `${assetDir}/${slug}-device.png`;
const scaledW = srcW * scale;
const scaledH = srcH * scale;
const cropExtract = {
  left: Math.round(cropLeft),
  top: Math.round(cropTop),
  width: OUT_W,
  height: OUT_H,
};

await sharp(srcData)
  .resize(Math.round(scaledW), Math.round(scaledH), { fit: "fill" })
  .extract(cropExtract)
  .png()
  .toFile(scenePngPath);

const scenePlateRaw = await sharp(scenePngPath).ensureAlpha().raw().toBuffer();

await sharp(deviceData)
  .resize(Math.round(scaledW), Math.round(scaledH), { fit: "fill" })
  .extract(cropExtract)
  .png()
  .toBuffer()
  .then(async (devicePng) => {
    const { data, info } = await sharp(devicePng).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    const fallback = { screenQuad: screenQuadOut, screenQuadNorm };
    const detected = detectScreenQuadFromWhiteGlass(data, info.width, info.height, fallback);
    screenQuadOut = detected.screenQuad;
    screenQuadNorm = detected.screenQuadNorm;
    finishDeviceOverlayData(data, info.width, info.height, screenQuadOut, scenePlateRaw);
    await sharp(data, { raw: { width: info.width, height: info.height, channels: info.channels } })
      .png()
      .toFile(devicePngPath);
  });

const meta = {
  slug,
  kind: "scene",
  label: slug.replace(/-/g, " "),
  src: `/mockups/${slug}.png`,
  deviceOverlaySrc: `/mockups/${slug}-device.png`,
  fsPath: ["public", "mockups", `${slug}.png`],
  deviceOverlayFsPath: ["public", "mockups", `${slug}-device.png`],
  width: OUT_W,
  height: OUT_H,
  sourcePsd: psdPath,
  designLayer: designLayer.name,
  screenQuad: screenQuadOut,
  screenQuadNorm,
  nativeSize: { width: srcW, height: srcH },
};

writeFileSync(`${assetDir}/${slug}.json`, JSON.stringify(meta, null, 2));

console.log("scene", OUT_W, "x", OUT_H, "->", scenePngPath);
console.log("device overlay (transparent)", OUT_W, "x", OUT_H, "->", devicePngPath);
console.log(
  "design layer:",
  designLayer.name,
  `[${designLayer.left},${designLayer.top}-${designLayer.right},${designLayer.bottom}]`,
);
console.log(
  "screenQuadNorm",
  JSON.stringify(screenQuadNorm, (k, v) => (typeof v === "number" ? +v.toFixed(4) : v)),
);
