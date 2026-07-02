import { CheckCircle2, Info, X, XCircle } from "lucide-react";
import type { ToastItem } from "../hooks/useToast";

const ICONS = {
  success: CheckCircle2,
  error: XCircle,
  info: Info,
} as const;

export default function ToastContainer({
  toasts,
  onDismiss,
}: {
  toasts: ToastItem[];
  onDismiss: (id: number) => void;
}) {
  if (toasts.length === 0) return null;

  return (
    <div className="toast-container" role="status" aria-live="polite">
      {toasts.map((t) => {
        const Icon = ICONS[t.variant];
        return (
          <div key={t.id} className={`toast toast-${t.variant}`}>
            <Icon size={18} />
            <span className="toast-message">{t.message}</span>
            <button
              type="button"
              className="toast-close"
              aria-label="סגירת הודעה"
              onClick={() => onDismiss(t.id)}
            >
              <X size={14} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
