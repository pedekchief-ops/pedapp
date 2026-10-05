import { MessageSquare } from "lucide-react";
import type { FeedbackSubmission } from "@/lib/supabase/types";

// Purely presentational -- app/admin/page.tsx fetches via
// lib/data.ts's getFeedbackSubmissions and passes the result straight
// through. No read/unread tracking or delete in v1: this is meant to be
// skimmed, not managed, so the simplest "just show them all, newest
// first" covers it until that stops being true.
export function FeedbackInbox({
  submissions,
}: {
  submissions: (FeedbackSubmission & { submitterName: string | null })[];
}) {
  return (
    <div className="mb-6 rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
      <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-neutral-900 dark:text-neutral-50">
        <MessageSquare size={16} />
        תיבת משובים ({submissions.length})
      </h2>

      {submissions.length === 0 ? (
        <p className="text-sm text-neutral-500 dark:text-neutral-400">עדיין לא התקבלו משובים.</p>
      ) : (
        <ul className="flex max-h-96 flex-col gap-2 overflow-y-auto">
          {submissions.map((s) => (
            <li
              key={s.id}
              className="rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 dark:border-neutral-800 dark:bg-neutral-950"
            >
              <div className="mb-1 flex items-center justify-between gap-2 text-xs text-neutral-500 dark:text-neutral-400">
                <span className="font-medium text-neutral-700 dark:text-neutral-300">
                  {s.name || (s.submitterName ? `ללא שם (${s.submitterName})` : "ללא שם")}
                </span>
                <span>{new Date(s.created_at).toLocaleString("he-IL")}</span>
              </div>
              <p className="whitespace-pre-wrap text-sm text-neutral-800 dark:text-neutral-100">
                {s.message}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
