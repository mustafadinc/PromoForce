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
const designPattern = process.argv[4] || "REPLACE THIS SCREEN|YOUR DESIGN HERE|PASTE YOUR DESIGN";
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

function findDesignLayer(layers) {
  let best = null;
  function walk(nodes) {
    for (const l of nodes || []) {
      if (l.children) {
        walk(l.children);
        continue;
      }
      if (l.hidden) continue;
      const name = (l.name || "").toLowerCase();
      if (patterns.some((p) => name.includes(p))) {
        if (!best || (l.right - l.left) * (l.bottom - l.top) > (best.right - best.left) * (best.bottom - best.top)) {
          best = l;
        }
      }
    }
  }
  walk(layers);
  return best;
}

const buf = readFileSync(psdPath);
const psd = readPsd(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength), {
  useImageData: true,
  skipCompositeImageData: false,
  skipThumbnail: true,
});

if (!psd.imageData) throw new Error("PSD composite imageData missing");

const srcW = psd.width;
const srcH = psd.height;
const srcData = Buffer.from(
  psd.imageData.data.buffer,
  psd.imageData.data.byteOffset,
  psd.imageData.data.byteLength,
);

const designLayer = findDesignLayer(psd.children);
if (!designLayer) throw new Error(`Design layer not found (patterns: ${patterns.join(", ")})`);

// Screen quad from design layer bounds (axis-aligned; perspective handled via homography warp).
const screenQuadSrc = {
  tl: { x: designLayer.left, y: designLayer.top },
  tr: { x: designLayer.right, y: designLayer.top },
  br: { x: designLayer.right, y: designLayer.bottom },
  bl: { x: designLayer.left, y: designLayer.bottom },
};

// Cover-crop landscape → portrait, centered on the design layer (not canvas center).
const scale = Math.max(OUT_W / srcW, OUT_H / srcH);
const scaledW = srcW * scale;
const scaledH = srcH * scale;

const screenCx = ((designLayer.left + designLayer.right) / 2) * scale;
const screenCy = ((designLayer.top + designLayer.bottom) / 2) * scale;

let cropLeft = screenCx - OUT_W / 2;
let cropTop = screenCy - OUT_H / 2;
cropLeft = Math.max(0, Math.min(cropLeft, scaledW - OUT_W));
cropTop = Math.max(0, Math.min(cropTop, scaledH - OUT_H));

function mapPoint(p) {
  return {
    x: p.x * scale - cropLeft,
    y: p.y * scale - cropTop,
  };
}

const screenQuadOut = {
  tl: mapPoint(screenQuadSrc.tl),
  tr: mapPoint(screenQuadSrc.tr),
  br: mapPoint(screenQuadSrc.br),
  bl: mapPoint(screenQuadSrc.bl),
};

const screenQuadNorm = {
  tl: { x: screenQuadOut.tl.x / OUT_W, y: screenQuadOut.tl.y / OUT_H },
  tr: { x: screenQuadOut.tr.x / OUT_W, y: screenQuadOut.tr.y / OUT_H },
  br: { x: screenQuadOut.br.x / OUT_W, y: screenQuadOut.br.y / OUT_H },
  bl: { x: screenQuadOut.bl.x / OUT_W, y: screenQuadOut.bl.y / OUT_H },
};

const scenePngPath = `${assetDir}/${slug}.png`;
await sharp(srcData, { raw: { width: srcW, height: srcH, channels: 4 } })
  .resize(Math.round(scaledW), Math.round(scaledH), { fit: "fill" })
  .extract({
    left: Math.round(cropLeft),
    top: Math.round(cropTop),
    width: OUT_W,
    height: OUT_H,
  })
  .png()
  .toFile(scenePngPath);

const meta = {
  slug,
  kind: "scene",
  label: slug.replace(/-/g, " "),
  src: `/mockups/${slug}.png`,
  fsPath: ["public", "mockups", `${slug}.png`],
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
console.log("design layer:", designLayer.name, `[${designLayer.left},${designLayer.top}-${designLayer.right},${designLayer.bottom}]`);
console.log("screenQuadNorm", JSON.stringify(screenQuadNorm, (k, v) => (typeof v === "number" ? +v.toFixed(4) : v)));
