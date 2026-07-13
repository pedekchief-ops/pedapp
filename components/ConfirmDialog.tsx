"use client";

import { useCallback, useState } from "react";

interface ConfirmOptions {
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
}

// Imperative confirm-dialog hook: `await confirm({...})` resolves to
// true/false once the admin picks a button, instead of every delete
// button having to manage its own open/close state. Used by
// DeletePageButton, BlockList's per-block delete, TabsBlockEditor's tab
// removal, and the bulk-actions bar -- see each call site for "why
// delete" copy specific to what's being removed.
export function useConfirmDialog() {
  const [state, setState] = useState<{
    options: ConfirmOptions;
    resolve: (value: boolean) => void;
  } | null>(null);

  const confirm = useCallback((options: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      setState({ options, resolve });
    });
  }, []);

  function handle(result: boolean) {
    state?.resolve(result);
    setState(null);
  }

  const dialog = state ? (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <button
        aria-label="ביטול"
        className="absolute inset-0 bg-black/50"
        onClick={() => handle(false)}
      />
      <div className="relative w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl dark:bg-neutral-900">
        <h2 className="mb-2 text-base font-semibold text-neutral-900 dark:text-neutral-50">
          {state.options.title}
        </h2>
        {state.options.description && (
          <p className="mb-4 text-sm text-neutral-600 dark:text-neutral-300">
            {state.options.description}
          </p>
        )}
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={() => handle(false)}
            className="rounded-lg px-3 py-1.5 text-sm text-neutral-600 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800"
          >
            {state.options.cancelLabel ?? "ביטול"}
          </button>
          <button
            type="button"
            onClick={() => handle(true)}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium text-white hover:opacity-90 ${
              state.options.danger ? "bg-red-600" : "bg-primary text-primary-foreground"
            }`}
          >
            {state.options.confirmLabel ?? "אישור"}
          </button>
        </div>
      </div>
    </div>
  ) : null;

  return { confirm, dialog };
}
