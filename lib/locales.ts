export type LocaleCode = "en" | "tr" | "de" | "ja" | "zh" | "pt" | "es" | "fr";

export type LocaleScript = "latin" | "cjk";

export type LocaleDefinition = {
  code: LocaleCode;
  label: string;
  nativeLabel: string;
  script: LocaleScript;
  fontFamily: string;
  svgFontFamily: string;
  fontFileName: string;
  uppercase: boolean;
  captionMaxChars: number;
  captionMaxWords: number;
  /** BCP 47 for casing helpers */
  bcp47: string;
};

export const SUPPORTED_LOCALES: LocaleDefinition[] = [
  {
    code: "en",
    label: "English",
    nativeLabel: "English",
    script: "latin",
    fontFamily: "Inter Black",
    svgFontFamily: "Inter Black, Arial Black, Helvetica, Arial, sans-serif",
    fontFileName: "Inter-Black.woff2",
    uppercase: true,
    captionMaxChars: 48,
    captionMaxWords: 8,
    bcp47: "en",
  },
  {
    code: "tr",
    label: "Turkish",
    nativeLabel: "Türkçe",
    script: "latin",
    fontFamily: "Inter Black",
    svgFontFamily: "Inter Black, Arial Black, Helvetica, Arial, sans-serif",
    fontFileName: "Inter-Black.woff2",
    uppercase: true,
    captionMaxChars: 52,
    captionMaxWords: 8,
    bcp47: "tr",
  },
  {
    code: "de",
    label: "German",
    nativeLabel: "Deutsch",
    script: "latin",
    fontFamily: "Inter Black",
    svgFontFamily: "Inter Black, Arial Black, Helvetica, Arial, sans-serif",
    fontFileName: "Inter-Black.woff2",
    uppercase: true,
    captionMaxChars: 52,
    captionMaxWords: 8,
    bcp47: "de",
  },
  {
    code: "pt",
    label: "Portuguese",
    nativeLabel: "Português",
    script: "latin",
    fontFamily: "Inter Black",
    svgFontFamily: "Inter Black, Arial Black, Helvetica, Arial, sans-serif",
    fontFileName: "Inter-Black.woff2",
    uppercase: true,
    captionMaxChars: 52,
    captionMaxWords: 8,
    bcp47: "pt",
  },
  {
    code: "es",
    label: "Spanish",
    nativeLabel: "Español",
    script: "latin",
    fontFamily: "Inter Black",
    svgFontFamily: "Inter Black, Arial Black, Helvetica, Arial, sans-serif",
    fontFileName: "Inter-Black.woff2",
    uppercase: true,
    captionMaxChars: 52,
    captionMaxWords: 8,
    bcp47: "es",
  },
  {
    code: "fr",
    label: "French",
    nativeLabel: "Français",
    script: "latin",
    fontFamily: "Inter Black",
    svgFontFamily: "Inter Black, Arial Black, Helvetica, Arial, sans-serif",
    fontFileName: "Inter-Black.woff2",
    uppercase: true,
    captionMaxChars: 52,
    captionMaxWords: 8,
    bcp47: "fr",
  },
  {
    code: "ja",
    label: "Japanese",
    nativeLabel: "日本語",
    script: "cjk",
    fontFamily: "Noto Sans JP Black",
    svgFontFamily: "Noto Sans JP Black, Hiragino Sans, Meiryo, sans-serif",
    fontFileName: "NotoSansJP-Black.woff2",
    uppercase: false,
    captionMaxChars: 24,
    captionMaxWords: 12,
    bcp47: "ja",
  },
  {
    code: "zh",
    label: "Chinese",
    nativeLabel: "中文",
    script: "cjk",
    fontFamily: "Noto Sans SC Black",
    svgFontFamily: "Noto Sans SC Black, PingFang SC, Microsoft YaHei, sans-serif",
    fontFileName: "NotoSansSC-Black.woff2",
    uppercase: false,
    captionMaxChars: 20,
    captionMaxWords: 10,
    bcp47: "zh",
  },
];

export const DEFAULT_LOCALE: LocaleCode = "en";

const localeByCode = new Map(SUPPORTED_LOCALES.map((l) => [l.code, l]));

export function getLocaleDefinition(code?: string | null): LocaleDefinition {
  const normalized = String(code || DEFAULT_LOCALE).toLowerCase() as LocaleCode;
  return localeByCode.get(normalized) ?? localeByCode.get(DEFAULT_LOCALE)!;
}

export function parseLocalesInput(raw: unknown): LocaleCode[] {
  if (Array.isArray(raw)) {
    const codes = raw
      .map((v) => String(v).toLowerCase())
      .filter((v): v is LocaleCode => localeByCode.has(v as LocaleCode));
    return codes.length ? [...new Set(codes)] : [DEFAULT_LOCALE];
  }

  if (typeof raw === "string" && raw.trim()) {
    try {
      const parsed = JSON.parse(raw) as unknown;
      if (Array.isArray(parsed)) return parseLocalesInput(parsed);
    } catch {
      const single = raw.trim().toLowerCase();
      if (localeByCode.has(single as LocaleCode)) return [single as LocaleCode];
    }
  }

  return [DEFAULT_LOCALE];
}

export function localeExpertPrompt(locale: LocaleDefinition): string {
  return [
    `You are a NATIVE ${locale.nativeLabel} (${locale.label}) App Store Optimization expert writing for the ${locale.label} market.`,
    "Write ALL copy natively in this language — do NOT translate from English.",
    "Choose hooks and phrasing that resonate locally; each locale's copy should feel written for that market, not like a translation.",
    locale.script === "cjk"
      ? "Headlines may be a single compelling phrase (no forced verb/descriptor split). Keep captions short and punchy."
      : "Split headlines into headlineVerb (action verb) + headlineDescriptor (benefit words).",
  ].join(" ");
}
