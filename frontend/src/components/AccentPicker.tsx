import { useState } from "react";
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

  return (
    <div className="accent-picker">
      <button
        type="button"
        className="link-button accent-picker-toggle"
        onClick={() => setOpen((v) => !v)}
        title="התאמת צבע המערכת"
        aria-label="התאמת צבע המערכת"
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
              onClick={() => {
                onChange(preset.value);
                setOpen(false);
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
