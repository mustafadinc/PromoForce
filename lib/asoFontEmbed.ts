import { readFile } from "node:fs/promises";
import path from "node:path";
import type { LocaleCode } from "@/lib/locales";
import { getLocaleDefinition } from "@/lib/locales";

const FONT_CACHE = new Map<string, string>();

function fontCandidates(fileName: string) {
  return [
    path.join(process.cwd(), "public", "fonts", fileName),
    path.join(process.cwd(), "node_modules", "@fontsource", "inter", "files", "inter-latin-900-normal.woff2"),
    path.join(process.cwd(), "node_modules", "@fontsource", "noto-sans-jp", "files", "noto-sans-jp-latin-900-normal.woff2"),
    path.join(process.cwd(), "node_modules", "@fontsource", "noto-sans-sc", "files", "noto-sans-sc-latin-900-normal.woff2"),
  ];
}

async function loadFontBase64(fileName: string): Promise<string | null> {
  const primary = path.join(process.cwd(), "public", "fonts", fileName);
  const paths = [primary, ...fontCandidates(fileName).filter((p) => p !== primary)];

  for (const fontPath of paths) {
    try {
      const fontBuffer = await readFile(fontPath);
      return fontBuffer.toString("base64");
    } catch {
      continue;
    }
  }
  return null;
}

/** Base64 @font-face for Sharp/librsvg SVG text. */
export async function getAsoFontFaceSvgDef(locale?: LocaleCode): Promise<string> {
  const def = getLocaleDefinition(locale);
  const cacheKey = def.fontFileName;
  if (FONT_CACHE.has(cacheKey)) return FONT_CACHE.get(cacheKey)!;

  try {
    const base64 = await loadFontBase64(def.fontFileName);
    if (!base64) {
      FONT_CACHE.set(cacheKey, "");
      return "";
    }

    const fontFaceDef = `<style type="text/css"><![CDATA[
      @font-face {
        font-family: "${def.fontFamily}";
        font-style: normal;
        font-weight: 900;
        src: url("data:font/woff2;base64,${base64}") format("woff2");
      }
    ]]></style>`;
    FONT_CACHE.set(cacheKey, fontFaceDef);
    return fontFaceDef;
  } catch {
    FONT_CACHE.set(cacheKey, "");
    return "";
  }
}

export function getSvgFontFamily(locale?: LocaleCode) {
  return getLocaleDefinition(locale).svgFontFamily;
}
