import type { LocaleCode } from "@/lib/locales";
import { getLocaleDefinition } from "@/lib/locales";

const loadedLocales = new Set<string>();

function fontUrl(fileName: string) {
  return `/fonts/${fileName}`;
}

async function loadFontFace(family: string, fileName: string): Promise<void> {
  const key = `${family}:${fileName}`;
  if (loadedLocales.has(key)) return;

  try {
    const face = new FontFace(family, `url(${fontUrl(fileName)}) format("woff2")`, {
      weight: "900",
      style: "normal",
    });
    await face.load();
    document.fonts.add(face);
    loadedLocales.add(key);
  } catch {
    /* fallback to system stack in Konva */
  }
}

/** Ensure locale headline fonts are ready before canvas text render/export. */
export async function loadEditorFonts(locale?: LocaleCode): Promise<void> {
  const def = getLocaleDefinition(locale);
  await loadFontFace(def.fontFamily, def.fontFileName);
  await document.fonts.ready;
}

export function editorFontFamily(locale?: LocaleCode): string {
  return getLocaleDefinition(locale).fontFamily;
}
