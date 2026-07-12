"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import {
  Bold,
  Underline as UnderlineIcon,
  List,
  ListOrdered,
  IndentIncrease,
  IndentDecrease,
  Table as TableIcon,
  Heading2,
} from "lucide-react";
import { buildEditorExtensions } from "@/lib/editor/extensions";
import type { RichTextContent } from "@/lib/supabase/types";

// Editable TipTap instance for the admin CMS. Uses the exact same
// extension set as the resident-facing read-only renderer
// (components/blocks/RichTextBlock.tsx via lib/editor/extensions.ts) so
// there's never a mismatch between what an admin authors and what
// residents see.
export function TipTapEditor({
  content,
  onChange,
}: {
  content: RichTextContent;
  onChange: (content: RichTextContent) => void;
}) {
  const editor = useEditor({
    extensions: buildEditorExtensions("התחילו לכתוב כאן..."),
    content: content.doc,
    immediatelyRender: false,
    onUpdate: ({ editor }) => {
      onChange({ doc: editor.getJSON() });
    },
  });

  if (!editor) return null;

  return (
    <div className="rounded-lg border border-neutral-300 dark:border-neutral-700">
      <div className="flex flex-wrap gap-1 border-b border-neutral-200 p-1.5 dark:border-neutral-800">
        <ToolbarButton
          active={editor.isActive("bold")}
          onClick={() => editor.chain().focus().toggleBold().run()}
          label="מודגש"
        >
          <Bold size={16} />
        </ToolbarButton>
        <ToolbarButton
          active={editor.isActive("underline")}
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          label="קו תחתון"
        >
          <UnderlineIcon size={16} />
        </ToolbarButton>
        <ToolbarButton
          active={editor.isActive("heading", { level: 2 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          label="כותרת"
        >
          <Heading2 size={16} />
        </ToolbarButton>
        <ToolbarButton
          active={editor.isActive("bulletList")}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          label="רשימת תבליטים"
        >
          <List size={16} />
        </ToolbarButton>
        <ToolbarButton
          active={editor.isActive("orderedList")}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          label="רשימה ממוספרת"
        >
          <ListOrdered size={16} />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().sinkListItem("listItem").run()}
          label="הגדלת הזחה"
        >
          <IndentIncrease size={16} />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().liftListItem("listItem").run()}
          label="הקטנת הזחה"
        >
          <IndentDecrease size={16} />
        </ToolbarButton>
        <ToolbarButton
          onClick={() =>
            editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()
          }
          label="הוספת טבלה"
        >
          <TableIcon size={16} />
        </ToolbarButton>
      </div>
      <div className="max-h-96 overflow-y-auto p-3">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}

function ToolbarButton({
  onClick,
  active,
  label,
  children,
}: {
  onClick: () => void;
  active?: boolean;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={`rounded-md p-1.5 ${
        active
          ? "bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900"
          : "text-neutral-600 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800"
      }`}
    >
      {children}
    </button>
  );
}
