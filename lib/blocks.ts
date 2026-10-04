import type { SupabaseClient } from "@supabase/supabase-js";
import type { Block, BlockDraft, BlockNode, ImageContent, PdfContent } from "@/lib/supabase/types";

// Overlays each linked-copy row (source_stable_id set -- see
// supabase/migrations/0014_linked_block_copies.sql) with the *live*
// content of the block it points at, so an edit to the original shows up
// everywhere it's been copied without the admin touching the copy itself.
// A row whose source can't be found (not published yet, or since deleted)
// keeps its own frozen snapshot instead of disappearing.
//
// Deliberately NOT used by the admin editor's own page load (see
// app/admin/[sectionSlug]/[pageSlug]/edit/page.tsx) -- the editor needs the
// raw, unresolved row (source_stable_id intact) to know a block is a link
// at all and render it as a read-only, edit-at-the-source card instead of
// the normal type-specific editor.
export async function resolveLinkedBlocks(
  supabase: SupabaseClient,
  flatBlocks: Block[]
): Promise<Block[]> {
  const sourceIds = Array.from(
    new Set(flatBlocks.map((b) => b.source_stable_id).filter((id): id is string => !!id))
  );
  if (sourceIds.length === 0) return flatBlocks;

  const { data: sources, error } = await supabase
    .from("blocks")
    .select("stable_id, type, content, collapsible, default_collapsed, collapsible_label")
    .in("stable_id", sourceIds);
  if (error) throw error;

  const bySourceId = new Map((sources ?? []).map((s) => [s.stable_id as string, s]));

  return flatBlocks.map((block) => {
    if (!block.source_stable_id) return block;
    const source = bySourceId.get(block.source_stable_id);
    if (!source) return block;
    return {
      ...block,
      type: source.type,
      content: source.content,
      collapsible: source.collapsible,
      default_collapsed: source.default_collapsed,
      collapsible_label: source.collapsible_label,
    };
  });
}

// Turns the flat `blocks` table rows for a page into the nested tree the
// renderer and editor actually want to work with: top-level blocks in
// order, each carrying its own `children` (used by 'tabs_container' blocks
// to hold their per-tab content). See supabase/migrations/0001_init_schema.sql
// for why blocks are stored flat with parent_block_id rather than as one
// big nested JSON document.
export function buildBlockTree(flatBlocks: Block[]): BlockNode[] {
  const byParent = new Map<string | null, Block[]>();

  for (const block of flatBlocks) {
    const key = block.parent_block_id;
    const siblings = byParent.get(key) ?? [];
    siblings.push(block);
    byParent.set(key, siblings);
  }

  function attachChildren(block: Block): BlockNode {
    const children = (byParent.get(block.id) ?? [])
      .slice()
      .sort((a, b) => a.order_index - b.order_index)
      .map(attachChildren);
    return { ...block, children };
  }

  return (byParent.get(null) ?? [])
    .slice()
    .sort((a, b) => a.order_index - b.order_index)
    .map(attachChildren);
}

// Inverse of buildBlockTree -- flattens back to rows for persistence
// (e.g. writing a page_versions.content_snapshot). Keeps the same fields a
// plain Block has (drops `children`).
export function flattenBlockTree(nodes: BlockNode[]): Block[] {
  const result: Block[] = [];
  function visit(node: BlockNode) {
    const { children, ...block } = node;
    result.push(block);
    children.forEach(visit);
  }
  nodes.forEach(visit);
  return result;
}

// Counts image/pdf blocks (anywhere in the tree, including inside tabs)
// that were added but never had a file actually uploaded -- an empty
// storage_path renders as nothing to residents (see
// components/blocks/ImageBlock.tsx / PdfBlock.tsx), so PageEditor warns
// before publishing one rather than silently shipping a blank block.
export function countIncompleteFileBlocks(drafts: BlockDraft[]): number {
  let count = 0;
  for (const draft of drafts) {
    if (draft.type === "image" || draft.type === "pdf") {
      const content = draft.content as ImageContent | PdfContent;
      if (!content.storage_path) count++;
    }
    count += countIncompleteFileBlocks(draft.children);
  }
  return count;
}
