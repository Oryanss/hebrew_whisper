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
