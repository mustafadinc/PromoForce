import { readFile } from "node:fs/promises";
import path from "node:path";

const INTER_BLACK_PATH = path.join(process.cwd(), "public", "fonts", "Inter-Black.woff2");

let cachedFontFaceDef: string | null = null;

/** Base64 @font-face for Sharp/librsvg SVG text (Inter Black 900). */
export async function getAsoFontFaceSvgDef(): Promise<string> {
  if (cachedFontFaceDef) return cachedFontFaceDef;

  try {
    const fontBuffer = await readFile(INTER_BLACK_PATH);
    const base64 = fontBuffer.toString("base64");
    cachedFontFaceDef = `<style type="text/css"><![CDATA[
      @font-face {
        font-family: "Inter Black";
        font-style: normal;
        font-weight: 900;
        src: url("data:font/woff2;base64,${base64}") format("woff2");
      }
    ]]></style>`;
    return cachedFontFaceDef;
  } catch {
    cachedFontFaceDef = "";
    return "";
  }
}

export function hasBundledInterBlack() {
  return cachedFontFaceDef !== null && cachedFontFaceDef.length > 0;
}
