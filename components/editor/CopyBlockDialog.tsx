"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { createLinkedBlockCopy, getPagesForLinkPicker } from "@/lib/actions/admin";
import type { BlockDraft } from "@/lib/supabase/types";

type PickerPage = {
  pageId: string;
  pageTitleHe: string;
  sectionNameHe: string;
  sectionSlug: string;
  pageSlug: string;
};

// "צור העתק": lets an admin pick another (or the same) page for a
// live-linked copy of `block` to appear on too -- see
// supabase/migrations/0014_linked_block_copies.sql. The copy is written
// immediately (createLinkedBlockCopy), independent of this page's own
// draft/publish cycle, since it only touches the *target* page's rows.
export function CopyBlockDialog({ block, onClose }: { block: BlockDraft; onClose: () => void }) {
  const [pages, setPages] = useState<PickerPage[] | null>(null);
  const [targetPageId, setTargetPageId] = useState("");
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    getPagesForLinkPicker()
      .then((data) => {
        setPages(data);
        if (data.length > 0) setTargetPageId(data[0].pageId);
      })
      .catch(() => setError(true));
  }, []);

  async function handleConfirm() {
    const target = pages?.find((p) => p.pageId === targetPageId);
    if (!target) return;
    setSaving(true);
    setError(false);
    try {
      await createLinkedBlockCopy({
        sourceStableId: block.stable_id,
        snapshot: {
          type: block.type,
          content: block.content,
          collapsible: block.collapsible,
          default_collapsed: block.default_collapsed,
          collapsible_label: block.collapsible_label,
        },
        targetPageId: target.pageId,
        targetSectionSlug: target.sectionSlug,
        targetPageSlug: target.pageSlug,
      });
      setDone(true);
    } catch {
      setError(true);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <button aria-label="סגירה" className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl dark:bg-neutral-900">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-semibold text-neutral-900 dark:text-neutral-50">
            יצירת העתק מקושר
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
              ההעתק נוצר ויופיע מיד בעמוד שנבחר. עריכת התוכן המקורי תעדכן גם אותו.
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
            <p className="mb-3 text-sm text-neutral-600 dark:text-neutral-300">
              בחרו עמוד שבו יוצג גם הבלוק הזה. זהו קישור חי -- עריכה בעמוד המקורי תתעדכן גם שם.
            </p>
            {!pages && !error && <p className="mb-4 text-xs text-neutral-400">טוען רשימת עמודים...</p>}
            {error && !pages && (
              <p className="mb-4 text-xs text-red-600 dark:text-red-400">שגיאה בטעינת רשימת העמודים.</p>
            )}
            {pages && pages.length === 0 && (
              <p className="mb-4 text-xs text-neutral-400">אין עמודים אחרים זמינים.</p>
            )}
            {pages && pages.length > 0 && (
              <select
                value={targetPageId}
                onChange={(e) => setTargetPageId(e.target.value)}
                className="mb-4 w-full rounded-lg border border-neutral-300 px-2 py-1.5 text-sm dark:border-neutral-700 dark:bg-neutral-950"
              >
                {pages.map((p) => (
                  <option key={p.pageId} value={p.pageId}>
                    {p.sectionNameHe} · {p.pageTitleHe}
                  </option>
                ))}
              </select>
            )}
            {error && pages && (
              <p className="mb-3 text-xs text-red-600 dark:text-red-400">שגיאה ביצירת ההעתק, נסו שוב.</p>
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
                disabled={!pages || pages.length === 0 || saving}
                onClick={handleConfirm}
                className="rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
              >
                {saving ? "יוצר..." : "יצירת העתק"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
