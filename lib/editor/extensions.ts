import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Table from "@tiptap/extension-table";
import TableRow from "@tiptap/extension-table-row";
import TableCell from "@tiptap/extension-table-cell";
import TableHeader from "@tiptap/extension-table-header";
import Placeholder from "@tiptap/extension-placeholder";

// Shared between the admin's editable TipTap instance (components/editor/TipTapEditor.tsx)
// and the resident-facing read-only renderer (components/blocks/RichTextBlock.tsx).
// Using the exact same extension set in both places is what guarantees a
// document authored in the editor always renders identically for residents
// -- StarterKit alone covers bold/italic/lists/headings/etc; tables and
// underline need to be added explicitly since they aren't in StarterKit.
export function buildEditorExtensions(placeholder?: string) {
  return [
    StarterKit,
    Underline,
    Table.configure({ resizable: false }),
    TableRow,
    TableHeader,
    TableCell,
    ...(placeholder ? [Placeholder.configure({ placeholder })] : []),
  ];
}
