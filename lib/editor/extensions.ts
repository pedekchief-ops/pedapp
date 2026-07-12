import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import { TableKit } from "@tiptap/extension-table";
import Placeholder from "@tiptap/extension-placeholder";

// Shared between the admin's editable TipTap instance (components/editor/TipTapEditor.tsx)
// and the resident-facing read-only renderer (components/blocks/RichTextBlock.tsx).
// Using the exact same extension set in both places is what guarantees a
// document authored in the editor always renders identically for residents
// -- StarterKit alone covers bold/italic/lists/headings/etc; tables and
// underline need to be added explicitly since they aren't in StarterKit.
// TableKit bundles the table/row/cell/header node types as one extension.
export function buildEditorExtensions(placeholder?: string) {
  return [
    StarterKit,
    Underline,
    TableKit.configure({ table: { resizable: false } }),
    ...(placeholder ? [Placeholder.configure({ placeholder })] : []),
  ];
}
