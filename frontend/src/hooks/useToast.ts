import { useCallback, useRef, useState } from "react";

export type ToastVariant = "success" | "error" | "info";

export interface ToastItem {
  id: number;
  message: string;
  variant: ToastVariant;
}

const DEFAULT_DURATION_MS = 4500;

/**
 * Lightweight, page-local toast queue - no context/provider required.
 * Call useToast() inside a page, render <ToastContainer toasts={toasts}
 * onDismiss={dismiss} /> once somewhere in that page's JSX, and call
 * toast.success/error/info(message) from event handlers.
 *
 * Deliberately not a global app-wide context, since wiring one up would
 * mean editing App.tsx / Layout.tsx (owned by a different workstream).
 * Any page can adopt this independently.
 */
export function useToast() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const idRef = useRef(0);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const show = useCallback(
    (message: string, variant: ToastVariant = "info", duration = DEFAULT_DURATION_MS) => {
      const id = ++idRef.current;
      setToasts((prev) => [...prev, { id, message, variant }]);
      if (duration > 0) {
        window.setTimeout(() => dismiss(id), duration);
      }
      return id;
    },
    [dismiss]
  );

  const toast = {
    success: (message: string, duration?: number) => show(message, "success", duration),
    error: (message: string, duration?: number) => show(message, "error", duration),
    info: (message: string, duration?: number) => show(message, "info", duration),
  };

  return { toasts, toast, dismiss };
}
