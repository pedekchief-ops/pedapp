"use client";

import { useState, useTransition } from "react";
import { Save } from "lucide-react";
import { publishPage } from "@/lib/actions/admin";
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

  function handlePublish() {
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
        <span className="text-xs text-neutral-500 dark:text-neutral-400">
          {status === "saved" && "פורסם בהצלחה"}
          {status === "error" && <span className="text-red-600 dark:text-red-400">שגיאה בפרסום</span>}
        </span>
        <button
          type="button"
          disabled={pending}
          onClick={handlePublish}
          className="flex items-center gap-2 rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-700 disabled:opacity-50 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-neutral-300"
        >
          <Save size={16} />
          {pending ? "מפרסם..." : "פרסום"}
        </button>
      </div>
    </div>
  );
}
