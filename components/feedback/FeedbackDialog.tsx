"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { submitFeedback } from "@/lib/actions/feedback";

export function FeedbackDialog({ onClose }: { onClose: () => void }) {
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState(false);

  async function handleSubmit() {
    if (!message.trim()) return;
    setSending(true);
    setError(false);
    try {
      await submitFeedback({ name, message });
      setDone(true);
    } catch {
      setError(true);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <button aria-label="סגירה" className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl dark:bg-neutral-900">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-semibold text-neutral-900 dark:text-neutral-50">
            משוב / הצעות / הערות
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="סגירה"
            className="rounded-lg p-1 text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800"
          >
            <X size={18} />
          </button>
        </div>

        {done ? (
          <>
            <p className="mb-4 text-sm text-neutral-600 dark:text-neutral-300">
              תודה! המשוב נשלח בהצלחה.
            </p>
            <div className="flex justify-end">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:opacity-90"
              >
                סגירה
              </button>
            </div>
          </>
        ) : (
          <>
            <label className="mb-1 block text-xs text-neutral-500 dark:text-neutral-400">
              שם (אופציונלי)
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="השם שלך"
              className="mb-3 w-full rounded-lg border border-neutral-300 px-2 py-1.5 text-sm outline-none focus:border-primary dark:border-neutral-700 dark:bg-neutral-950"
            />
            <label className="mb-1 block text-xs text-neutral-500 dark:text-neutral-400">
              המשוב שלך
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={5}
              placeholder="כתבו כאן משוב, הצעה או הערה..."
              className="mb-3 w-full rounded-lg border border-neutral-300 px-2 py-1.5 text-sm outline-none focus:border-primary dark:border-neutral-700 dark:bg-neutral-950"
            />
            {error && (
              <p className="mb-3 text-xs text-red-600 dark:text-red-400">שגיאה בשליחה, נסו שוב.</p>
            )}
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg px-3 py-1.5 text-sm text-neutral-600 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800"
              >
                ביטול
              </button>
              <button
                type="button"
                disabled={!message.trim() || sending}
                onClick={handleSubmit}
                className="rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
              >
                {sending ? "שולח..." : "שליחה"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
