import type { Block, BlockNode } from "@/lib/supabase/types";

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
