"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import { buildEditorExtensions } from "@/lib/editor/extensions";
import type { RichTextContent } from "@/lib/supabase/types";

// Read-only render of a TipTap document. Reuses the exact same extension
// set as the admin's editable instance (lib/editor/extensions.ts) so
// content authored with tables/lists/etc always renders correctly here.
export function RichTextBlock({ content }: { content: RichTextContent }) {
  const editor = useEditor({
    extensions: buildEditorExtensions(),
    content: content.doc,
    editable: false,
    // Required with React 19 / Next SSR: TipTap otherwise renders once on
    // the server and once on the client, producing a hydration mismatch.
    immediatelyRender: false,
  });

  return <EditorContent editor={editor} className="tiptap-content" />;
}
