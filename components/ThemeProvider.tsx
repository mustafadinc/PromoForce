"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { AccentTheme } from "@/lib/designAssets";

type ThemeContextValue = {
  theme: AccentTheme;
  setTheme: (theme: AccentTheme) => void;
};

const ThemeContext = createContext<ThemeContextValue>({
  theme: "teal",
  setTheme: () => {},
});

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<AccentTheme>("teal");

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  return <ThemeContext.Provider value={{ theme, setTheme }}>{children}</ThemeContext.Provider>;
}

export function useAccentTheme() {
  return useContext(ThemeContext);
}
