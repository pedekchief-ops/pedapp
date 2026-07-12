import { getPublicUrl } from "@/lib/supabase/storage";
import type { ImageContent } from "@/lib/supabase/types";

// Plain <img> rather than next/image: next/image proxies through an
// on-demand optimization endpoint, which the offline service worker can't
// usefully cache (it's a different URL every time and requires the
// optimizer to be reachable). A same-origin-cacheable Storage URL matters
// more here than automatic resizing.
export function ImageBlock({ content }: { content: ImageContent }) {
  const url = getPublicUrl("images", content.storage_path);
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={url}
      alt={content.alt_he || content.alt_en || ""}
      loading="lazy"
      className="h-auto w-full rounded-xl border border-neutral-200 dark:border-neutral-800"
    />
  );
}
