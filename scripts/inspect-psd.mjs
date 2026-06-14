import { readPsd, initializeCanvas } from "ag-psd";
import { createCanvas } from "@napi-rs/canvas";
import { readFileSync } from "fs";

initializeCanvas(createCanvas);

const paths = process.argv.slice(2);

function walk(layers, depth = 0) {
  for (const l of layers || []) {
    const indent = "  ".repeat(depth);
    const box =
      l.left !== undefined ? ` [${l.left},${l.top}-${l.right},${l.bottom}]` : "";
    const flags = [
      l.children ? "group" : "leaf",
      l.hidden ? "hidden" : null,
      l.placedLayer ? "smart-object" : null,
    ]
      .filter(Boolean)
      .join(", ");
    console.log(`${indent}${l.name}${box}${flags ? ` (${flags})` : ""}`);
    if (l.children) walk(l.children, depth + 1);
  }
}

for (const p of paths) {
  console.log(`\n=== ${p} ===`);
  try {
    const buf = readFileSync(p);
    const psd = readPsd(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength), {
      skipCompositeImageData: true,
      skipThumbnail: true,
    });
    console.log("canvas:", psd.width, "x", psd.height);
    walk(psd.children);
  } catch (e) {
    console.log("ERROR:", e.message);
  }
}
