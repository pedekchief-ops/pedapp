import { ExternalLink } from "lucide-react";
import type { LinkButtonContent } from "@/lib/supabase/types";

// A button linking out to an external site. Opens in a new tab with
// rel="noopener noreferrer" so the external page can't reach back into
// this app's window (standard practice for any target="_blank" link).
export function LinkButtonBlock({ content }: { content: LinkButtonContent }) {
  if (!content.url) return null;

  return (
    <a
      href={content.url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-medium text-primary-foreground transition hover:opacity-90"
    >
      {content.label_he || content.url}
      <ExternalLink size={16} />
    </a>
  );
}
