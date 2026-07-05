import { useEffect, useState } from "react";

export const ACCENT_PRESETS = [
  { name: "זהב", value: "#8a6d3b" },
  { name: "כחול", value: "#2c5f8a" },
  { name: "ירוק", value: "#2f6b3f" },
  { name: "בורדו", value: "#7a2e3a" },
  { name: "סגול", value: "#5b4b8a" },
] as const;

const ACCENT_STORAGE_KEY = "legal_platform_accent";
const DEFAULT_ACCENT = ACCENT_PRESETS[0].value;

export function useAccentColor() {
  const [accent, setAccentState] = useState<string>(
    () => localStorage.getItem(ACCENT_STORAGE_KEY) || DEFAULT_ACCENT
  );

  useEffect(() => {
    document.documentElement.style.setProperty("--accent", accent);
  }, [accent]);

  function setAccent(value: string) {
    localStorage.setItem(ACCENT_STORAGE_KEY, value);
    setAccentState(value);
  }

  return { accent, setAccent };
}

// --- Dark mode -------------------------------------------------------------
//
// Same localStorage-persisted pattern as useAccentColor above. The active
// theme is reflected as a `data-theme="dark" | "light"` attribute on
// <html>, and `frontend/src/index.css` defines dark equivalents for the
// core CSS custom properties (--bg, --surface, --ink, --border, etc.) under
// a `[data-theme="dark"]` selector. Any component that only reads those
// custom properties (which is effectively everything already, since colors
// are themed via CSS vars) gets dark mode "for free" without further code
// changes.

export type ThemeMode = "light" | "dark";

const THEME_STORAGE_KEY = "legal_platform_theme";
const DEFAULT_THEME: ThemeMode = "light";

function isThemeMode(value: string | null): value is ThemeMode {
  return value === "light" || value === "dark";
}

export function useTheme() {
  const [theme, setThemeState] = useState<ThemeMode>(() => {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    return isThemeMode(stored) ? stored : DEFAULT_THEME;
  });

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  function setTheme(value: ThemeMode) {
    localStorage.setItem(THEME_STORAGE_KEY, value);
    setThemeState(value);
  }

  function toggleTheme() {
    setTheme(theme === "light" ? "dark" : "light");
  }

  return { theme, setTheme, toggleTheme };
}
