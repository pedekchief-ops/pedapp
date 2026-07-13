"use client";

import {
  ArrowUp,
  ArrowDown,
  Trash2,
  Type,
  Image as ImageIcon,
  FileText,
  Columns,
  Link as LinkIcon,
  Table,
} from "lucide-react";
import { createEmptyBlock } from "@/lib/editor/blockDraft";
import type { BlockDraft, BlockType } from "@/lib/supabase/types";
import { BlockEditor } from "./BlockEditor";
import { useConfirmDialog } from "@/components/ConfirmDialog";

// Renders an ordered, editable list of blocks with add/reorder/delete
// controls. Used both for a page's top-level blocks and, recursively, for
// the blocks inside a single tab of a tabs_container (see
// TabsBlockEditor.tsx) -- `tabKey` tags any block newly added from this
// instance so it lands in the right tab.
export function BlockList({
  blocks,
  onChange,
  tabKey = null,
}: {
  blocks: BlockDraft[];
  onChange: (blocks: BlockDraft[]) => void;
  tabKey?: string | null;
}) {
  const { confirm, dialog } = useConfirmDialog();

  function updateAt(index: number, block: BlockDraft) {
    const next = blocks.slice();
    next[index] = block;
    onChange(next);
  }

  async function removeAt(index: number) {
    const ok = await confirm({
      title: "למחוק את הבלוק?",
      description: "התוכן שבתוכו יימחק גם הוא. השינוי ייכנס לתוקף רק לאחר לחיצה על פרסום.",
      confirmLabel: "מחיקה",
      danger: true,
    });
    if (!ok) return;
    onChange(blocks.filter((_, i) => i !== index));
  }

  function move(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= blocks.length) return;
    const next = blocks.slice();
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  }

  function addBlock(type: BlockType) {
    onChange([...blocks, createEmptyBlock(type, tabKey)]);
  }

  return (
    <div className="flex flex-col gap-3">
      {blocks.map((block, index) => (
        <div
          key={block.clientId}
          className="rounded-xl border border-neutral-200 bg-white p-3 dark:border-neutral-800 dark:bg-neutral-900"
        >
          <div className="mb-2 flex items-center justify-end gap-1">
            <button
              type="button"
              disabled={index === 0}
              onClick={() => move(index, -1)}
              aria-label="הזזה למעלה"
              className="rounded-md p-1 text-neutral-400 hover:bg-neutral-100 disabled:opacity-30 dark:hover:bg-neutral-800"
            >
              <ArrowUp size={14} />
            </button>
            <button
              type="button"
              disabled={index === blocks.length - 1}
              onClick={() => move(index, 1)}
              aria-label="הזזה למטה"
              className="rounded-md p-1 text-neutral-400 hover:bg-neutral-100 disabled:opacity-30 dark:hover:bg-neutral-800"
            >
              <ArrowDown size={14} />
            </button>
            <button
              type="button"
              onClick={() => removeAt(index)}
              aria-label="מחיקת בלוק"
              className="rounded-md p-1 text-neutral-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40"
            >
              <Trash2 size={14} />
            </button>
          </div>
          <BlockEditor block={block} onChange={(updated) => updateAt(index, updated)} />
        </div>
      ))}

      <div className="flex flex-wrap gap-2">
        <AddButton icon={<Type size={14} />} label="טקסט" onClick={() => addBlock("rich_text")} />
        <AddButton icon={<ImageIcon size={14} />} label="תמונה" onClick={() => addBlock("image")} />
        <AddButton icon={<FileText size={14} />} label="PDF" onClick={() => addBlock("pdf")} />
        <AddButton icon={<Columns size={14} />} label="טאבים" onClick={() => addBlock("tabs_container")} />
        <AddButton icon={<LinkIcon size={14} />} label="כפתור קישור" onClick={() => addBlock("link_button")} />
        <AddButton icon={<Table size={14} />} label="טבלה" onClick={() => addBlock("data_table")} />
      </div>
      {dialog}
    </div>
  );
}

function AddButton({
  icon,
  label,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-1.5 rounded-lg border border-dashed border-neutral-300 px-3 py-1.5 text-xs text-neutral-600 hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-900"
    >
      {icon}
      הוספת {label}
    </button>
  );
}
