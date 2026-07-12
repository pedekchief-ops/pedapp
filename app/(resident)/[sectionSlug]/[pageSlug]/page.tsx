"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { BlockRenderer } from "@/components/blocks/BlockRenderer";
import type { PageWithBlocks } from "@/lib/supabase/types";

type FetchStatus = "loading" | "ready" | "error";

// A Client Component that fetches its content from /api/pages/[..]/[..]
// (JSON) rather than being server-rendered. This is deliberate: it's what
// lets the Serwist service worker intercept the fetch() call and serve a
// cached response when offline (see app/sw.ts's runtime caching rule for
// "/api/pages/"). A server-rendered page's HTML/RSC payload is much harder
// to reliably replay offline.
export default function PageView() {
  const params = useParams<{ sectionSlug: string; pageSlug: string }>();
  const [page, setPage] = useState<(PageWithBlocks & { editorName: string | null }) | null>(null);
  const [status, setStatus] = useState<FetchStatus>("loading");

  useEffect(() => {
    let cancelled = false;
    setStatus("loading");

    fetch(`/api/pages/${params.sectionSlug}/${params.pageSlug}`)
      .then((res) => {
        if (!res.ok) throw new Error("failed to load page");
        return res.json();
      })
      .then((data) => {
        if (!cancelled) {
          setPage(data);
          setStatus("ready");
        }
      })
      .catch(() => {
        if (!cancelled) setStatus("error");
      });

    return () => {
      cancelled = true;
    };
  }, [params.sectionSlug, params.pageSlug]);

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
    <article className="mx-auto max-w-2xl p-4">
      <h1 className="mb-1 text-xl font-semibold text-neutral-900 dark:text-neutral-50">
        {page.title_he}
      </h1>
      <p className="mb-6 text-xs text-neutral-500 dark:text-neutral-400">
        עודכן לאחרונה {new Date(page.updated_at).toLocaleDateString("he-IL")}
        {page.editorName && ` על ידי ${page.editorName}`}
      </p>
      <div className="flex flex-col gap-6">
        {page.blocks.map((block) => (
          <BlockRenderer key={block.id} block={block} />
        ))}
      </div>
    </article>
  );
}
