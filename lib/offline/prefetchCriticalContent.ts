import { createClient } from "@/lib/supabase/client";
import { getPublicUrl } from "@/lib/supabase/storage";
import type { BlockNode, ImageContent, PdfContent } from "@/lib/supabase/types";

function collectFileUrls(blocks: BlockNode[]): string[] {
  const urls: string[] = [];
  for (const block of blocks) {
    if (block.type === "image") {
      urls.push(getPublicUrl("images", (block.content as ImageContent).storage_path));
    }
    if (block.type === "pdf") {
      urls.push(getPublicUrl("pdfs", (block.content as PdfContent).storage_path));
    }
    urls.push(...collectFileUrls(block.children));
  }
  return urls;
}

// Warms the offline cache for every section flagged is_offline_critical
// (see sections.is_offline_critical in
// supabase/migrations/0001_init_schema.sql, defaulting to Medications)
// right after login, so that content is available offline even before a
// resident has manually opened each page once. Every fetch() call here is
// passively intercepted by the Serwist service worker's runtime caching
// rules (app/sw.ts) -- we never use the responses ourselves beyond walking
// the page JSON to discover which file URLs to warm too.
export async function prefetchCriticalContent() {
  if (typeof navigator === "undefined" || !navigator.onLine) return;
  if (!("serviceWorker" in navigator)) return;

  const supabase = createClient();
  const { data: sections } = await supabase
    .from("sections")
    .select("id, slug")
    .eq("is_offline_critical", true);
  if (!sections?.length) return;

  for (const section of sections) {
    const { data: pages } = await supabase
      .from("pages")
      .select("slug")
      .eq("section_id", section.id);

    for (const page of pages ?? []) {
      try {
        const res = await fetch(`/api/pages/${section.slug}/${page.slug}`);
        if (!res.ok) continue;
        const data = await res.json();
        await Promise.all(
          collectFileUrls(data.blocks ?? []).map((url) => fetch(url).catch(() => null))
        );
      } catch {
        // Best-effort: skip a page that fails to prefetch rather than
        // aborting the rest of the critical-content warm-up.
      }
    }
  }
}
