import { Moon, Sun } from "lucide-react";
import { useTheme } from "../theme";

/**
 * Self-contained dark-mode toggle: reads/writes its own state via useTheme()
 * (frontend/src/theme.ts), so it can be dropped anywhere with no props and
 * no parent wiring required - unlike AccentPicker, which expects the parent
 * to own the accent state. To add this to the top nav (Layout.tsx), a
 * different workstream just needs:
 *
 *   import ThemeToggle from "./ThemeToggle";
 *   ...
 *   <ThemeToggle />
 *
 * e.g. next to <AccentPicker /> inside the .user-box in Layout.tsx.
 */
export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <button
      type="button"
      className="link-button theme-toggle"
      onClick={toggleTheme}
      title={isDark ? "מעבר למצב בהיר" : "מעבר למצב כהה"}
      aria-label={isDark ? "מעבר למצב בהיר" : "מעבר למצב כהה"}
    >
      {isDark ? <Sun size={16} /> : <Moon size={16} />}
    </button>
  );
}
