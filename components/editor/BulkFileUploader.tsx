"use client";

import { useRef, useState } from "react";
import { UploadCloud } from "lucide-react";
import { uploadFileToStorage } from "@/lib/editor/uploadFile";
import { createEmptyBlock } from "@/lib/editor/blockDraft";
import type { BlockDraft, ImageContent, PdfContent } from "@/lib/supabase/types";

// Upload several files at once (e.g. 4 images and 2 PDFs together) and get
// one block per file appended to the page -- instead of the one-at-a-time
// "add block" -> "upload" -> "add block" -> "upload" loop that building a
// page like "הנחיות קליניות" (a dozen-plus separate PDFs) meant before
// this. Each block starts pre-filled with the uploaded file and a
// collapsible_label guessed from its filename; the admin still edits
// collapsible/default_collapsed/label/order afterward through the same
// per-block controls every other block already has (see BlockList.tsx) --
// this only saves the repetitive upload step, not the review step.
export function BulkFileUploader({
  tabKey,
  onBlocksReady,
}: {
  tabKey: string | null;
  onBlocksReady: (drafts: BlockDraft[]) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleFiles(fileList: FileList) {
    const files = Array.from(fileList);
    setError(null);
    setProgress({ done: 0, total: files.length });

    const drafts: BlockDraft[] = [];
    const failed: string[] = [];

    for (const file of files) {
      const isPdf = file.type === "application/pdf";
      const isImage = file.type.startsWith("image/");
      if (!isPdf && !isImage) {
        failed.push(`${file.name} (סוג קובץ לא נתמך -- רק PDF ותמונות)`);
        setProgress((p) => (p ? { ...p, done: p.done + 1 } : p));
        continue;
      }

      try {
        const uploaded = await uploadFileToStorage(isPdf ? "pdfs" : "images", file);
        const titleGuess = uploaded.filename.replace(/\.[^.]+$/, "");
        const draft = createEmptyBlock(isPdf ? "pdf" : "image", tabKey);
        draft.collapsible_label = titleGuess;
        draft.content = isPdf
          ? ({
              file_id: uploaded.fileId,
              storage_path: uploaded.storagePath,
              original_filename: uploaded.filename,
              title: titleGuess,
            } satisfies PdfContent)
          : ({
              file_id: uploaded.fileId,
              storage_path: uploaded.storagePath,
              original_filename: uploaded.filename,
              alt_he: titleGuess,
            } satisfies ImageContent);
        drafts.push(draft);
      } catch (err) {
        failed.push(`${file.name} (${err instanceof Error ? err.message : "שגיאה"})`);
      }
      setProgress((p) => (p ? { ...p, done: p.done + 1 } : p));
    }

    if (drafts.length > 0) onBlocksReady(drafts);
    setProgress(null);
    if (failed.length > 0) {
      setError(
        drafts.length > 0
          ? `${drafts.length} קבצים הועלו בהצלחה. נכשלו: ${failed.join(", ")}`
          : `כל הקבצים נכשלו: ${failed.join(", ")}`
      );
    }
  }

  return (
    <div className="flex flex-col gap-1">
      <input
        ref={inputRef}
        type="file"
        multiple
        accept="application/pdf,image/*"
        hidden
        onChange={(e) => {
          if (e.target.files?.length) handleFiles(e.target.files);
          e.target.value = "";
        }}
      />
      <button
        type="button"
        disabled={progress !== null}
        onClick={() => inputRef.current?.click()}
        className="flex items-center gap-1.5 rounded-lg border border-dashed border-neutral-300 px-3 py-1.5 text-xs text-neutral-600 hover:bg-neutral-50 disabled:opacity-50 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-900"
      >
        <UploadCloud size={14} />
        {progress ? `מעלה... (${progress.done}/${progress.total})` : "העלאת כמה קבצים בבת אחת"}
      </button>
      {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
}
