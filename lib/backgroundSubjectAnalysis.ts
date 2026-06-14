import sharp from "sharp";

export type SubjectBoundingBox = {
  x: number;
  y: number;
  width: number;
  height: number;
  energy: number;
};

export type BackgroundSubjectAnalysis = {
  subjectBox: SubjectBoundingBox | null;
  columnEnergy: number[];
  openSide: "left" | "right" | "center";
};

const ANALYSIS_WIDTH = 160;

export async function analyzeBackgroundSubject(
  background: Buffer,
  canvasW: number,
  canvasH: number,
): Promise<BackgroundSubjectAnalysis> {
  const analysisH = Math.max(1, Math.round((canvasH / canvasW) * ANALYSIS_WIDTH));

  const { data, info } = await sharp(background)
    .resize(ANALYSIS_WIDTH, analysisH, { fit: "cover", position: "centre" })
    .greyscale()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const w = info.width;
  const h = info.height;
  const columnEnergy = new Array<number>(w).fill(0);
  const rowEnergy = new Array<number>(h).fill(0);

  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      const idx = y * w + x;
      const lum = data[idx] ?? 0;
      let edge = lum;
      if (x > 0) edge += Math.abs(lum - (data[idx - 1] ?? lum));
      if (y > 0) edge += Math.abs(lum - (data[idx - w] ?? lum));
      columnEnergy[x] += edge;
      rowEnergy[y] += edge;
    }
  }

  const scaleX = canvasW / w;
  const scaleY = canvasH / h;

  let maxEnergy = 0;
  let bestX = 0;
  let bestY = 0;
  let bestW = Math.max(2, Math.floor(w * 0.35));
  let bestH = Math.max(2, Math.floor(h * 0.45));

  const windowW = Math.max(2, Math.floor(w * 0.35));
  const windowH = Math.max(2, Math.floor(h * 0.5));

  for (let y = 0; y <= h - windowH; y += 2) {
    for (let x = 0; x <= w - windowW; x += 2) {
      let energy = 0;
      for (let dy = 0; dy < windowH; dy += 1) {
        for (let dx = 0; dx < windowW; dx += 1) {
          energy += columnEnergy[x + dx] ?? 0;
        }
      }
      if (energy > maxEnergy) {
        maxEnergy = energy;
        bestX = x;
        bestY = y;
        bestW = windowW;
        bestH = windowH;
      }
    }
  }

  const leftThird = columnEnergy.slice(0, Math.floor(w / 3)).reduce((a, b) => a + b, 0);
  const rightThird = columnEnergy.slice(Math.floor((2 * w) / 3)).reduce((a, b) => a + b, 0);
  const openSide: BackgroundSubjectAnalysis["openSide"] =
    leftThird > rightThird * 1.15 ? "right" : rightThird > leftThird * 1.15 ? "left" : "center";

  const subjectBox: SubjectBoundingBox | null =
    maxEnergy > 0
      ? {
          x: Math.round(bestX * scaleX),
          y: Math.round(bestY * scaleY),
          width: Math.round(bestW * scaleX),
          height: Math.round(bestH * scaleY),
          energy: maxEnergy,
        }
      : null;

  return { subjectBox, columnEnergy, openSide };
}

export function rectsOverlap(
  a: { x: number; y: number; width: number; height: number },
  b: { x: number; y: number; width: number; height: number },
  padding = 0,
): boolean {
  return !(
    a.x + a.width + padding < b.x ||
    b.x + b.width + padding < a.x ||
    a.y + a.height + padding < b.y ||
    b.y + b.height + padding < a.y
  );
}

export function overlapArea(
  a: { x: number; y: number; width: number; height: number },
  b: { x: number; y: number; width: number; height: number },
): number {
  const xOverlap = Math.max(0, Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x));
  const yOverlap = Math.max(0, Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y));
  return xOverlap * yOverlap;
}
