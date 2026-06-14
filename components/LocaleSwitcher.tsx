"use client";

import type { LocaleCode } from "@/lib/locales";
import { SUPPORTED_LOCALES } from "@/lib/locales";

type LocaleSwitcherProps = {
  locales: LocaleCode[];
  activeLocale: LocaleCode;
  onChange: (locale: LocaleCode) => void;
  disabled?: boolean;
};

export function LocaleSwitcher({ locales, activeLocale, onChange, disabled }: LocaleSwitcherProps) {
  if (locales.length <= 1) return null;

  return (
    <div className="locale-switcher" role="tablist" aria-label="Screenshot locale">
      {locales.map((code) => {
        const meta = SUPPORTED_LOCALES.find((l) => l.code === code);
        const label = meta?.label || code.toUpperCase();
        return (
          <button
            key={code}
            type="button"
            role="tab"
            aria-selected={activeLocale === code}
            className={activeLocale === code ? "is-active" : ""}
            disabled={disabled}
            onClick={() => onChange(code)}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
