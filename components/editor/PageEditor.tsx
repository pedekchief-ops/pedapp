"use client";

import { useEffect, useState, useTransition } from "react";
import { Save, TriangleAlert } from "lucide-react";
import { publishPage } from "@/lib/actions/admin";
import { countIncompleteFileBlocks } from "@/lib/blocks";
import { useConfirmDialog } from "@/components/ConfirmDialog";
import { BlockList } from "./BlockList";
import type { BlockDraft } from "@/lib/supabase/types";

export function PageEditor({
  pageId,
  sectionSlug,
  sectionNameHe,
  initialTitleHe,
  initialTitleEn,
  initialSlug,
  initialBlocks,
}: {
  pageId: string;
  sectionSlug: string;
  sectionNameHe: string;
  initialTitleHe: string;
  initialTitleEn: string | null;
  initialSlug: string;
  initialBlocks: BlockDraft[];
}) {
  const [titleHe, setTitleHe] = useState(initialTitleHe);
  const [titleEn, setTitleEn] = useState(initialTitleEn ?? "");
  const [slug, setSlug] = useState(initialSlug);
  const [blocks, setBlocks] = useState<BlockDraft[]>(initialBlocks);
  const [pending, startTransition] = useTransition();
  const [status, setStatus] = useState<"idle" | "saved" | "error">("idle");
  const { confirm, dialog } = useConfirmDialog();

  // Recomputed on every render (cheap -- editor pages aren't huge) rather
  // than memoized against a dependency list, so it can't ever drift from
  // what's actually about to be published.
  const isDirty =
    titleHe !== initialTitleHe ||
    (titleEn || "") !== (initialTitleEn ?? "") ||
    slug !== initialSlug ||
    JSON.stringify(blocks) !== JSON.stringify(initialBlocks);

  // Warns on tab close/refresh with unpublished edits -- exactly what
  // silently lost the image/PDF blocks that prompted this: an admin
  // uploads a file, then navigates away before clicking "פרסום", and the
  // upload (which already happened) never gets attached to the page.
  useEffect(() => {
    if (!isDirty) return;
    function handleBeforeUnload(e: BeforeUnloadEvent) {
      e.preventDefault();
    }
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isDirty]);

  async function handlePublish() {
    const incomplete = countIncompleteFileBlocks(blocks);
    if (incomplete > 0) {
      const ok = await confirm({
        title: `יש ${incomplete} בלוקים בלי קובץ שהועלה`,
        description: "בלוקים כאלה לא יוצגו באפליקציה. לפרסם בכל זאת?",
        confirmLabel: "פרסום בכל זאת",
        danger: true,
      });
      if (!ok) return;
    }

    setStatus("idle");
    startTransition(async () => {
      try {
        await publishPage({
          pageId,
          sectionSlug,
          sectionNameHe,
          slug,
          titleHe,
          titleEn: titleEn || null,
          blocks,
        });
        setStatus("saved");
      } catch {
        setStatus("error");
      }
    });
  }

  return (
    <div className="flex flex-col gap-4 pb-24">
      <div className="rounded-xl border border-neutral-200 bg-white p-3 dark:border-neutral-800 dark:bg-neutral-900">
        <label className="mb-1 block text-xs text-neutral-500 dark:text-neutral-400">
          כותרת (עברית)
        </label>
        <input
          value={titleHe}
          onChange={(e) => setTitleHe(e.target.value)}
          className="mb-3 w-full rounded-lg border border-neutral-300 px-2 py-1.5 text-sm dark:border-neutral-700 dark:bg-neutral-950"
        />
        <label className="mb-1 block text-xs text-neutral-500 dark:text-neutral-400">
          כותרת (אנגלית, אופציונלי)
        </label>
        <input
          value={titleEn}
          onChange={(e) => setTitleEn(e.target.value)}
          dir="ltr"
          className="mb-3 w-full rounded-lg border border-neutral-300 px-2 py-1.5 text-sm dark:border-neutral-700 dark:bg-neutral-950"
        />
        <label className="mb-1 block text-xs text-neutral-500 dark:text-neutral-400">
          כתובת (slug)
        </label>
        <input
          value={slug}
          onChange={(e) => setSlug(e.target.value)}
          dir="ltr"
          className="w-full rounded-lg border border-neutral-300 px-2 py-1.5 text-sm dark:border-neutral-700 dark:bg-neutral-950"
        />
      </div>

      <BlockList blocks={blocks} onChange={setBlocks} />

      <div className="fixed inset-x-0 bottom-0 z-30 flex items-center justify-between border-t border-neutral-200 bg-white/95 px-4 py-3 backdrop-blur dark:border-neutral-800 dark:bg-neutral-950/95">
        <span className="flex items-center gap-1.5 text-xs text-neutral-500 dark:text-neutral-400">
          {status === "saved" && !isDirty && "פורסם בהצלחה"}
          {status === "error" && <span className="text-red-600 dark:text-red-400">שגיאה בפרסום</span>}
          {isDirty && status !== "error" && (
            <span className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
              <TriangleAlert size={14} />
              יש שינויים שלא פורסמו
            </span>
          )}
        </span>
        <button
          type="button"
          disabled={pending}
          onClick={handlePublish}
          className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
        >
          <Save size={16} />
          {pending ? "מפרסם..." : "פרסום"}
        </button>
      </div>
      {dialog}
    </div>
  );
}
