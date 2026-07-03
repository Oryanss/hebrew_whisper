import { useEffect, useRef, useState } from "react";
import { Palette } from "lucide-react";
import { ACCENT_PRESETS } from "../theme";

export default function AccentPicker({
  accent,
  onChange,
}: {
  accent: string;
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);

  // Close on outside click, matching UserMenu's behavior.
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Escape closes the popover and returns focus to the toggle button.
  useEffect(() => {
    if (!open) return;
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        toggleRef.current?.focus();
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  return (
    <div className="accent-picker" ref={rootRef}>
      <button
        type="button"
        ref={toggleRef}
        className="link-button accent-picker-toggle"
        onClick={() => setOpen((v) => !v)}
        title="התאמת צבע המערכת"
        aria-label="התאמת צבע המערכת"
        aria-haspopup="true"
        aria-expanded={open}
      >
        <Palette size={16} />
      </button>
      {open && (
        <div className="accent-picker-popover">
          {ACCENT_PRESETS.map((preset) => (
            <button
              key={preset.value}
              type="button"
              className="accent-swatch"
              style={{ background: preset.value }}
              title={preset.name}
              aria-label={preset.name}
              aria-pressed={preset.value === accent}
              onClick={() => {
                onChange(preset.value);
                setOpen(false);
                toggleRef.current?.focus();
              }}
            >
              {preset.value === accent && <span className="accent-swatch-check">✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
