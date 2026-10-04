import { Link2 } from "lucide-react";

const TYPE_LABELS: Record<string, string> = {
  rich_text: "טקסט",
  image: "תמונה",
  pdf: "PDF",
  link_button: "כפתור קישור",
  data_table: "טבלה",
  tabs_container: "טאבים",
};

// Shown in BlockList.tsx instead of the normal type-specific BlockEditor
// when a block is a linked copy (source_stable_id set -- see
// supabase/migrations/0014_linked_block_copies.sql). Deliberately
// read-only: the content lives on the original block, so editing it here
// would just be silently discarded the moment the overlay in
// lib/blocks.ts's resolveLinkedBlocks runs on the resident-facing view.
export function LinkedBlockNotice({ type }: { type: string }) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-dashed border-neutral-300 bg-neutral-50 px-3 py-3 text-sm text-neutral-500 dark:border-neutral-700 dark:bg-neutral-950 dark:text-neutral-400">
      <Link2 size={15} className="shrink-0" />
      <span>
        בלוק {TYPE_LABELS[type] ?? type} מקושר (קישור חי) -- התוכן מוצג מהעמוד המקורי. לעריכת התוכן יש
        לערוך אותו שם; השינוי יופיע כאן אוטומטית.
      </span>
    </div>
  );
}
