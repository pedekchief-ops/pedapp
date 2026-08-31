"use client";

import { useTransition, useState } from "react";
import Link from "next/link";
import { ArrowDown, ArrowUp, Pencil, FolderInput } from "lucide-react";
import { bulkDeletePages, movePage, movePagesToSection } from "@/lib/actions/admin";
import { useConfirmDialog } from "@/components/ConfirmDialog";
import { useToast } from "@/components/Toast";
import { DeletePageButton } from "@/components/admin/DeletePageButton";
import type { Page, Section } from "@/lib/supabase/types";

// Pages list for one section's admin screen, with checkbox multi-select
// and a bulk action bar (delete selected / move selected to another
// section) that appears once at least one page is checked.
export function PagesListWithSelection({
  pages,
  section,
  otherSections,
}: {
  pages: Page[];
  section: Section;
  otherSections: Section[];
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [moveTarget, setMoveTarget] = useState("");
  const [pending, startTransition] = useTransition();
  const { confirm, dialog } = useConfirmDialog();
  const { showToast } = useToast();

  function toggle(pageId: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(pageId)) next.delete(pageId);
      else next.add(pageId);
      return next;
    });
  }

  async function handleBulkDelete() {
    const ok = await confirm({
      title: `למחוק ${selected.size} עמודים?`,
      description: "לא ניתן לשחזר פעולה זו.",
      confirmLabel: "מחיקה",
      danger: true,
    });
    if (!ok) return;
    const ids = Array.from(selected);
    startTransition(async () => {
      await bulkDeletePages(ids, section.slug);
      setSelected(new Set());
      showToast(`${ids.length} עמודים נמחקו`);
    });
  }

  function handleReorder(pageId: string, direction: -1 | 1) {
    startTransition(async () => {
      await movePage(pageId, section.id, section.slug, direction);
    });
  }

  async function handleMove() {
    if (!moveTarget) return;
    const target = otherSections.find((s) => s.id === moveTarget);
    if (!target) return;
    const ok = await confirm({
      title: `להעביר ${selected.size} עמודים אל "${target.name_he}"?`,
    });
    if (!ok) return;
    const ids = Array.from(selected);
    startTransition(async () => {
      await movePagesToSection(ids, target.id, section.slug, target.slug);
      setSelected(new Set());
      setMoveTarget("");
      showToast(`${ids.length} עמודים הועברו אל "${target.name_he}"`);
    });
  }

  return (
    <div>
      {selected.size > 0 && (
        <div className="mb-3 flex flex-wrap items-center gap-2 rounded-xl border border-primary/30 bg-primary/5 px-3 py-2">
          <span className="text-sm font-medium text-neutral-700 dark:text-neutral-200">
            נבחרו {selected.size}
          </span>
          <select
            value={moveTarget}
            onChange={(e) => setMoveTarget(e.target.value)}
            className="rounded-lg border border-neutral-300 px-2 py-1 text-sm dark:border-neutral-700 dark:bg-neutral-950"
          >
            <option value="">העברה לקטגוריה...</option>
            {otherSections.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name_he}
              </option>
            ))}
          </select>
          <button
            type="button"
            disabled={!moveTarget || pending}
            onClick={handleMove}
            className="flex items-center gap-1 rounded-lg border border-neutral-300 px-2 py-1 text-sm text-neutral-700 hover:bg-neutral-50 disabled:opacity-50 dark:border-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-800"
          >
            <FolderInput size={14} />
            העברה
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={handleBulkDelete}
            className="rounded-lg bg-red-600 px-2 py-1 text-sm text-white hover:bg-red-700 disabled:opacity-50"
          >
            מחיקת הנבחרים
          </button>
        </div>
      )}

      {pages.length === 0 ? (
        <p className="text-sm text-neutral-500 dark:text-neutral-400">אין עדיין עמודים.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {pages.map((page, index) => (
            <li
              key={page.id}
              className="flex items-center gap-2 rounded-xl border border-neutral-200 bg-white px-4 py-3 dark:border-neutral-800 dark:bg-neutral-900"
            >
              <input
                type="checkbox"
                checked={selected.has(page.id)}
                onChange={() => toggle(page.id)}
                aria-label={`בחירת ${page.title_he}`}
                className="h-4 w-4"
              />
              <Link
                href={`/admin/${section.slug}/${page.slug}/edit`}
                className="flex flex-1 items-center gap-2 text-sm font-medium text-neutral-900 dark:text-neutral-50"
              >
                <Pencil size={14} className="text-neutral-400" />
                {page.title_he}
              </Link>
              <button
                type="button"
                disabled={pending || index === 0}
                onClick={() => handleReorder(page.id, -1)}
                aria-label={`הזזת "${page.title_he}" למעלה`}
                className="rounded-md p-1 text-neutral-400 hover:bg-neutral-100 disabled:opacity-30 dark:hover:bg-neutral-800"
              >
                <ArrowUp size={14} />
              </button>
              <button
                type="button"
                disabled={pending || index === pages.length - 1}
                onClick={() => handleReorder(page.id, 1)}
                aria-label={`הזזת "${page.title_he}" למטה`}
                className="rounded-md p-1 text-neutral-400 hover:bg-neutral-100 disabled:opacity-30 dark:hover:bg-neutral-800"
              >
                <ArrowDown size={14} />
              </button>
              <DeletePageButton pageId={page.id} sectionSlug={section.slug} pageTitle={page.title_he} />
            </li>
          ))}
        </ul>
      )}
      {dialog}
    </div>
  );
}
