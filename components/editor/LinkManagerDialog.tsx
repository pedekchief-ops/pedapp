"use client";

import { useEffect, useState } from "react";
import { X, Trash2 } from "lucide-react";
import {
  createLinkedBlockCopy,
  deleteLinkedCopy,
  getLinkedCopies,
  getPagesForLinkPicker,
} from "@/lib/actions/admin";
import { useConfirmDialog } from "@/components/ConfirmDialog";
import type { BlockDraft } from "@/lib/supabase/types";

type PickerPage = {
  pageId: string;
  pageTitleHe: string;
  sectionNameHe: string;
  sectionSlug: string;
  pageSlug: string;
};

type LinkedCopy = {
  blockId: string;
  pageTitleHe: string;
  sectionNameHe: string;
  sectionSlug: string;
  pageSlug: string;
};

// Opened from BlockList.tsx's link icon -- shows every page this block is
// currently live-linked to (see supabase/migrations/0014_linked_block_copies.sql),
// lets the admin remove any of them, and add a new one. Both lists are
// refetched after every change instead of updated optimistically in place,
// since this is a low-frequency admin action where correctness matters
// more than snappiness.
export function LinkManagerDialog({ block, onClose }: { block: BlockDraft; onClose: () => void }) {
  const [copies, setCopies] = useState<LinkedCopy[] | null>(null);
  const [pages, setPages] = useState<PickerPage[] | null>(null);
  const [targetPageId, setTargetPageId] = useState("");
  const [adding, setAdding] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { confirm, dialog } = useConfirmDialog();

  function loadCopies() {
    getLinkedCopies(block.stable_id)
      .then(setCopies)
      .catch(() => setError("שגיאה בטעינת רשימת הקישורים."));
  }

  useEffect(() => {
    loadCopies();
    getPagesForLinkPicker()
      .then((data) => {
        setPages(data);
        if (data.length > 0) setTargetPageId(data[0].pageId);
      })
      .catch(() => setError("שגיאה בטעינת רשימת העמודים."));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleAdd() {
    const target = pages?.find((p) => p.pageId === targetPageId);
    if (!target) return;
    setAdding(true);
    setError(null);
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
      loadCopies();
    } catch {
      setError("שגיאה ביצירת הקישור, נסו שוב.");
    } finally {
      setAdding(false);
    }
  }

  async function handleRemove(copy: LinkedCopy) {
    const ok = await confirm({
      title: "להסיר את הקישור?",
      description: `התוכן יפסיק להופיע ב"${copy.pageTitleHe}" (${copy.sectionNameHe}). העמוד המקורי לא ייפגע.`,
      confirmLabel: "הסרה",
      danger: true,
    });
    if (!ok) return;

    setRemovingId(copy.blockId);
    setError(null);
    try {
      await deleteLinkedCopy({
        blockId: copy.blockId,
        targetSectionSlug: copy.sectionSlug,
        targetPageSlug: copy.pageSlug,
      });
      loadCopies();
    } catch {
      setError("שגיאה בהסרת הקישור, נסו שוב.");
    } finally {
      setRemovingId(null);
    }
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <button aria-label="סגירה" className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl dark:bg-neutral-900">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-semibold text-neutral-900 dark:text-neutral-50">ניהול קישורים</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="סגירה"
            className="rounded-lg p-1 text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800"
          >
            <X size={18} />
          </button>
        </div>

        <p className="mb-2 text-xs font-medium text-neutral-500 dark:text-neutral-400">
          הבלוק מוצג גם ב:
        </p>
        {!copies && <p className="mb-3 text-xs text-neutral-400">טוען...</p>}
        {copies && copies.length === 0 && (
          <p className="mb-3 text-xs text-neutral-400">אין עדיין העתקים של הבלוק הזה.</p>
        )}
        {copies && copies.length > 0 && (
          <ul className="mb-3 flex flex-col gap-1">
            {copies.map((copy) => (
              <li
                key={copy.blockId}
                className="flex items-center justify-between gap-2 rounded-lg border border-neutral-200 px-2.5 py-1.5 text-sm dark:border-neutral-800"
              >
                <span className="text-neutral-700 dark:text-neutral-200">
                  {copy.sectionNameHe} · {copy.pageTitleHe}
                </span>
                <button
                  type="button"
                  disabled={removingId === copy.blockId}
                  onClick={() => handleRemove(copy)}
                  aria-label="הסרת קישור"
                  className="shrink-0 rounded-md p-1 text-neutral-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-50 dark:hover:bg-red-950/40"
                >
                  <Trash2 size={13} />
                </button>
              </li>
            ))}
          </ul>
        )}

        <div className="mb-1 border-t border-neutral-200 pt-3 dark:border-neutral-800">
          <p className="mb-2 text-xs font-medium text-neutral-500 dark:text-neutral-400">הוספת קישור:</p>
          {!pages && <p className="mb-3 text-xs text-neutral-400">טוען רשימת עמודים...</p>}
          {pages && pages.length > 0 && (
            <div className="flex items-center gap-2">
              <select
                value={targetPageId}
                onChange={(e) => setTargetPageId(e.target.value)}
                className="flex-1 rounded-lg border border-neutral-300 px-2 py-1.5 text-sm dark:border-neutral-700 dark:bg-neutral-950"
              >
                {pages.map((p) => (
                  <option key={p.pageId} value={p.pageId}>
                    {p.sectionNameHe} · {p.pageTitleHe}
                  </option>
                ))}
              </select>
              <button
                type="button"
                disabled={adding}
                onClick={handleAdd}
                className="shrink-0 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
              >
                {adding ? "מוסיף..." : "הוספה"}
              </button>
            </div>
          )}
        </div>

        {error && <p className="mt-3 text-xs text-red-600 dark:text-red-400">{error}</p>}
      </div>
      {dialog}
    </div>
  );
}
