"use client";

import { TriangleAlert } from "lucide-react";
import { TipTapEditor } from "./TipTapEditor";
import { FileUploader } from "./FileUploader";
import { TabsBlockEditor } from "./TabsBlockEditor";
import { DataTableEditor } from "./DataTableEditor";
import type {
  BlockDraft,
  DataTableContent,
  ImageContent,
  LinkButtonContent,
  PdfContent,
  RichTextContent,
  TabsContainerContent,
} from "@/lib/supabase/types";

// Dispatches a single block draft to its type-specific inline editor.
// Counterpart to components/blocks/BlockRenderer.tsx on the read-only side.
export function BlockEditor({
  block,
  onChange,
}: {
  block: BlockDraft;
  onChange: (block: BlockDraft) => void;
}) {
  if (block.type === "rich_text") {
    return (
      <TipTapEditor
        content={block.content as RichTextContent}
        onChange={(content) => onChange({ ...block, content })}
      />
    );
  }

  if (block.type === "image") {
    const content = block.content as ImageContent;
    return (
      <div className="flex flex-col gap-2">
        {!content.storage_path && (
          <p className="flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400">
            <TriangleAlert size={14} />
            עדיין לא הועלה קובץ -- לא יוצג באפליקציה עד שתעלו תמונה
          </p>
        )}
        <FileUploader
          bucket="images"
          currentPath={content.storage_path || undefined}
          accept="image/*"
          onUploaded={({ fileId, storagePath }) =>
            onChange({
              ...block,
              content: { ...content, file_id: fileId, storage_path: storagePath },
            })
          }
        />
        <input
          type="text"
          placeholder="תיאור התמונה (עברית)"
          value={content.alt_he ?? ""}
          onChange={(e) => onChange({ ...block, content: { ...content, alt_he: e.target.value } })}
          className="rounded-lg border border-neutral-300 px-2 py-1.5 text-sm dark:border-neutral-700 dark:bg-neutral-900"
        />
      </div>
    );
  }

  if (block.type === "pdf") {
    const content = block.content as PdfContent;
    return (
      <div className="flex flex-col gap-2">
        {!content.storage_path && (
          <p className="flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400">
            <TriangleAlert size={14} />
            עדיין לא הועלה קובץ -- לא יוצג באפליקציה עד שתעלו PDF
          </p>
        )}
        <FileUploader
          bucket="pdfs"
          currentPath={content.storage_path || undefined}
          accept="application/pdf"
          onUploaded={({ fileId, storagePath }) =>
            onChange({
              ...block,
              content: { ...content, file_id: fileId, storage_path: storagePath },
            })
          }
        />
        <input
          type="text"
          placeholder="כותרת הקובץ (לתצוגה)"
          value={content.title ?? ""}
          onChange={(e) => onChange({ ...block, content: { ...content, title: e.target.value } })}
          className="rounded-lg border border-neutral-300 px-2 py-1.5 text-sm dark:border-neutral-700 dark:bg-neutral-900"
        />
      </div>
    );
  }

  if (block.type === "link_button") {
    const content = block.content as LinkButtonContent;
    return (
      <div className="flex flex-col gap-2">
        <input
          type="text"
          placeholder="טקסט הכפתור"
          value={content.label_he}
          onChange={(e) => onChange({ ...block, content: { ...content, label_he: e.target.value } })}
          className="rounded-lg border border-neutral-300 px-2 py-1.5 text-sm dark:border-neutral-700 dark:bg-neutral-900"
        />
        <input
          type="url"
          placeholder="https://..."
          value={content.url}
          onChange={(e) => onChange({ ...block, content: { ...content, url: e.target.value } })}
          dir="ltr"
          className="rounded-lg border border-neutral-300 px-2 py-1.5 text-sm dark:border-neutral-700 dark:bg-neutral-900"
        />
      </div>
    );
  }

  if (block.type === "data_table") {
    return (
      <DataTableEditor
        content={block.content as DataTableContent}
        onChange={(content) => onChange({ ...block, content })}
      />
    );
  }

  return (
    <TabsBlockEditor
      content={block.content as TabsContainerContent}
      childBlocks={block.children}
      onChange={(update) => onChange({ ...block, ...update })}
    />
  );
}
