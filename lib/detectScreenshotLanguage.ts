import type { LocaleCode } from "@/lib/locales";
import { getLocaleDefinition } from "@/lib/locales";

export type DetectedScreenshotLanguage = {
  detected: string;
  confidence: "high" | "medium" | "low";
  matchesLocale: boolean;
  locale: LocaleCode;
};

const LOCALE_UI_HINTS: Record<LocaleCode, RegExp[]> = {
  en: [/\b(home|settings|save|cancel|done|next|back|search|profile)\b/i],
  tr: [/\b(ana sayfa|ayarlar|kaydet|iptal|tamam|geri|ara|profil|rutin|odak)\b/i],
  de: [/\b(startseite|einstellungen|speichern|abbrechen|zurück|suchen)\b/i],
  pt: [/\b(início|configurações|salvar|cancelar|voltar|buscar)\b/i],
  es: [/\b(inicio|ajustes|guardar|cancelar|atrás|buscar)\b/i],
  fr: [/\b(accueil|paramètres|enregistrer|annuler|retour|rechercher)\b/i],
  ja: [/[\u3040-\u30ff\u4e00-\u9faf]/],
  zh: [/[\u4e00-\u9fff]/],
};

function scoreLocale(text: string, locale: LocaleCode): number {
  const hints = LOCALE_UI_HINTS[locale];
  let score = 0;
  for (const pattern of hints) {
    if (pattern.test(text)) score += 1;
  }
  return score;
}

/** Heuristic UI language detection from OCR-like text (vision API fills description). */
export function detectLanguageFromUiText(text: string, targetLocale: LocaleCode): DetectedScreenshotLanguage {
  const normalized = text.trim();
  if (!normalized) {
    return {
      detected: "unknown",
      confidence: "low",
      matchesLocale: true,
      locale: targetLocale,
    };
  }

  const scores = (Object.keys(LOCALE_UI_HINTS) as LocaleCode[]).map((code) => ({
    code,
    score: scoreLocale(normalized, code),
  }));
  scores.sort((a, b) => b.score - a.score);
  const best = scores[0];
  const detected = best && best.score > 0 ? best.code : "unknown";
  const confidence =
    best && best.score >= 2 ? "high" : best && best.score === 1 ? "medium" : "low";

  return {
    detected,
    confidence,
    matchesLocale: detected === "unknown" || detected === targetLocale,
    locale: targetLocale,
  };
}

export function formatLocaleMismatchMessage(
  targetLocale: LocaleCode,
  detected: string,
): string {
  const target = getLocaleDefinition(targetLocale).label;
  const detectedLabel =
    detected === "unknown" ? "an unrecognized language" : getLocaleDefinition(detected as LocaleCode).label;
  return `Screenshots appear to be in ${detectedLabel}, but ${target} is selected. Upload UI screens in ${target} for matching mockups.`;
}
