"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { BlockRenderer } from "@/components/blocks/BlockRenderer";
import type { PageWithBlocks } from "@/lib/supabase/types";

type FetchStatus = "loading" | "ready" | "error";
type LoadedPage = PageWithBlocks & { editorName: string | null };

// A Client Component that fetches its content from /api/pages/[..]/[..]
// (JSON) rather than being server-rendered. This is deliberate: it's what
// lets the Serwist service worker intercept the fetch() call and serve a
// cached response when offline (see app/sw.ts's runtime caching rule for
// "/api/pages/"). A server-rendered page's HTML/RSC payload is much harder
// to reliably replay offline.
export default function PageView() {
  const params = useParams<{ sectionSlug: string; pageSlug: string }>();
  // Keying by the route params forces React to remount PageViewContent
  // (and re-run its effect from a fresh "loading" state) whenever the
  // resident navigates to a different page, without needing to reset state
  // imperatively inside the effect itself.
  return <PageViewContent key={`${params.sectionSlug}/${params.pageSlug}`} {...params} />;
}

function PageViewContent({
  sectionSlug,
  pageSlug,
}: {
  sectionSlug: string;
  pageSlug: string;
}) {
  const [page, setPage] = useState<LoadedPage | null>(null);
  const [status, setStatus] = useState<FetchStatus>("loading");

  useEffect(() => {
    let cancelled = false;

    fetch(`/api/pages/${sectionSlug}/${pageSlug}`)
      .then((res) => {
        if (!res.ok) throw new Error("failed to load page");
        return res.json();
      })
      .then((data: LoadedPage) => {
        if (!cancelled) {
          setPage(data);
          setStatus("ready");
          // Content mounts asynchronously (see the file header comment),
          // so the browser's native "scroll to #fragment on load" never
          // fires for a search result deep-link -- do it manually once the
          // matching block actually exists in the DOM.
          if (window.location.hash) {
            requestAnimationFrame(() => {
              const target = document.getElementById(window.location.hash.slice(1));
              if (!target) return;
              // A collapsible block (see BlockRenderer.tsx) that defaults
              // closed would otherwise scroll into view still collapsed --
              // a search result landing on it must actually show the match,
              // not just the closed toggle it's hiding behind. Opens both
              // ways: descendants (the block itself is collapsible) and
              // ancestors (it's nested inside some other collapsible
              // container, e.g. a collapsible tabs_container -- see
              // TabsBlock.tsx for the separate "pick the right tab" half of
              // making nested content reachable).
              target.querySelectorAll("details").forEach((details) => {
                details.open = true;
              });
              for (let el = target.parentElement; el; el = el.parentElement) {
                if (el instanceof HTMLDetailsElement) el.open = true;
              }
              target.scrollIntoView({ behavior: "smooth", block: "center" });
            });
          }
        }
      })
      .catch(() => {
        if (!cancelled) setStatus("error");
      });

    return () => {
      cancelled = true;
    };
  }, [sectionSlug, pageSlug]);

  if (status === "loading") {
    return <p className="p-4 text-sm text-neutral-500 dark:text-neutral-400">טוען...</p>;
  }

  if (status === "error" || !page) {
    return (
      <p className="p-4 text-sm text-red-600 dark:text-red-400">
        לא ניתן לטעון את העמוד. אם אתם במצב לא מקוון, ודאו שביקרתם בעמוד זה בעבר.
      </p>
    );
  }

  return (
    <article className="mx-auto max-w-4xl p-4">
      <div className="mx-auto max-w-2xl">
        <h1 className="mb-1 text-xl font-semibold text-neutral-900 dark:text-neutral-50">
          {page.title_he}
        </h1>
        <p className="mb-6 text-xs text-neutral-500 dark:text-neutral-400">
          עודכן לאחרונה {new Date(page.updated_at).toLocaleDateString("he-IL")}
          {page.editorName && ` על ידי ${page.editorName}`}
        </p>
      </div>
      <div className="flex flex-col gap-6">
        {page.blocks.map((block) => {
          // Rich text/images/links/tabs stay at reading width (max-w-2xl,
          // matching the header above) since a wide line of prose is hard
          // to read -- but a PDF viewer or a data table benefits from real
          // width instead, so those two block types get the full width of
          // this wider article instead of the narrower reading column.
          const isWide = block.type === "pdf" || block.type === "data_table";
          // The id="block-<id>" target for search-result deep links (see
          // the scrollIntoView effect above) is BlockRenderer's own outer
          // div now, not this one -- it has to be, so a block nested
          // inside a tabs_container gets one too, not just top-level
          // blocks. This div is purely the reading-width constraint.
          return (
            <div key={block.id} className={isWide ? "" : "mx-auto w-full max-w-2xl"}>
              <BlockRenderer block={block} />
            </div>
          );
        })}
      </div>
    </article>
  );
}
