"use client";

import { createContext, useCallback, useContext, useRef, useState } from "react";
import { CheckCircle2, XCircle } from "lucide-react";

interface ToastMessage {
  id: number;
  text: string;
  variant: "success" | "error";
}

interface ToastContextValue {
  showToast: (text: string, variant?: "success" | "error") => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

// App-wide "action completed" confirmations (e.g. "נמחק בהצלחה" after a
// delete, or a bulk action finishing) -- deliberately separate from the
// ConfirmDialog "are you sure?" step in components/ConfirmDialog.tsx,
// which asks *before* an action; this reports back *after* one.
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const nextId = useRef(0);

  const showToast = useCallback((text: string, variant: "success" | "error" = "success") => {
    const id = nextId.current++;
    setToasts((prev) => [...prev, { id, text, variant }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-4 z-[70] flex flex-col items-center gap-2 px-4">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm text-white shadow-lg ${
              toast.variant === "success" ? "bg-neutral-900 dark:bg-neutral-100 dark:text-neutral-900" : "bg-red-600"
            }`}
          >
            {toast.variant === "success" ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
            {toast.text}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within a ToastProvider");
  return ctx;
}
