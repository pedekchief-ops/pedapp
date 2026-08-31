import type { BlockDraft, BlockNode, BlockType } from "@/lib/supabase/types";

// Factory for a brand-new, empty block in the admin editor's local state.
// `tabKey` is set when adding a block inside a specific tab of a
// tabs_container (see components/editor/TabsBlockEditor.tsx).
export function createEmptyBlock(type: BlockType, tabKey: string | null = null): BlockDraft {
  const clientId = crypto.randomUUID();
  const base = {
    clientId,
    tab_key: tabKey,
    collapsible: false,
    default_collapsed: false,
    collapsible_label: null,
    children: [] as BlockDraft[],
  };

  switch (type) {
    case "rich_text":
      return {
        ...base,
        type,
        content: { doc: { type: "doc", content: [{ type: "paragraph" }] } },
      };
    case "image":
      return { ...base, type, content: { file_id: "", storage_path: "" } };
    case "pdf":
      return { ...base, type, content: { file_id: "", storage_path: "" } };
    case "tabs_container":
      return {
        ...base,
        type,
        content: { tabs: [{ key: crypto.randomUUID(), label_he: "טאב 1" }] },
      };
    case "link_button":
      return { ...base, type, content: { label_he: "", url: "" } };
    case "data_table":
      return {
        ...base,
        type,
        content: {
          columns: [{ key: crypto.randomUUID(), label_he: "עמודה 1" }],
          categories: [{ key: crypto.randomUUID(), name_he: "קטגוריה 1", rows: [], subcategories: [] }],
        },
      };
  }
}

// Converts blocks loaded from the database (nested via lib/blocks.ts'
// buildBlockTree) into the editor's local draft shape. clientId just
// reuses the real id -- fine, since it never leaves the browser (see the
// BlockDraft doc comment in lib/supabase/types.ts).
export function blockNodeToDraft(node: BlockNode): BlockDraft {
  return {
    clientId: node.id,
    type: node.type,
    content: node.content,
    tab_key: node.tab_key,
    collapsible: node.collapsible,
    default_collapsed: node.default_collapsed,
    collapsible_label: node.collapsible_label,
    children: node.children.map(blockNodeToDraft),
  };
}

export function blockNodesToDrafts(nodes: BlockNode[]): BlockDraft[] {
  return nodes.map(blockNodeToDraft);
}
