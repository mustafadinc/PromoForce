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

async function downloadGoogleFontWoff2(fontName: string): Promise<string | null> {
  try {
    const cssUrl = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(fontName)}:wght@900`;
    const cssResponse = await fetch(cssUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/100.0.0.0 Safari/537.36",
      },
    });
    if (!cssResponse.ok) return null;
    const cssText = await cssResponse.text();

    const urlMatch = cssText.match(/url\((https:\/\/fonts\.gstatic\.com\/[^\)]+)\)/);
    if (!urlMatch || !urlMatch[1]) return null;
    const woff2Url = urlMatch[1];

    const woff2Response = await fetch(woff2Url);
    if (!woff2Response.ok) return null;
    const woff2Buffer = Buffer.from(await woff2Response.arrayBuffer());

    return woff2Buffer.toString("base64");
  } catch (error) {
    console.error(`Failed to fetch font ${fontName} from Google Fonts`, error);
    return null;
  }
}

/** Base64 @font-face for Sharp/librsvg SVG text. */
export async function getAsoFontFaceSvgDef(locale?: LocaleCode, customFont?: string): Promise<string> {
  const def = getLocaleDefinition(locale);
  const family = customFont || def.fontFamily;
  const cacheKey = customFont ? `custom:${customFont}` : def.fontFileName;
  if (FONT_CACHE.has(cacheKey)) return FONT_CACHE.get(cacheKey)!;

  try {
    let base64: string | null = null;
    if (customFont && customFont !== "Inter") {
      base64 = await downloadGoogleFontWoff2(customFont);
    } else {
      base64 = await loadFontBase64(def.fontFileName);
    }

    if (!base64) {
      FONT_CACHE.set(cacheKey, "");
      return "";
    }

    const fontFaceDef = `<style type="text/css"><![CDATA[
      @font-face {
        font-family: "${family}";
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

export function getSvgFontFamily(locale?: LocaleCode, customFont?: string) {
  if (customFont) return `${customFont}, ${getLocaleDefinition(locale).svgFontFamily}`;
  return getLocaleDefinition(locale).svgFontFamily;
}
