"use client";

import { useState } from "react";
import { Download } from "lucide-react";
import { getPublicUrl } from "@/lib/supabase/storage";
import { downloadFile } from "@/lib/download";
import type { ImageContent } from "@/lib/supabase/types";

// Plain <img> rather than next/image: next/image proxies through an
// on-demand optimization endpoint, which the offline service worker can't
// usefully cache (it's a different URL every time and requires the
// optimizer to be reachable). A same-origin-cacheable Storage URL matters
// more here than automatic resizing.
export function ImageBlock({ content }: { content: ImageContent }) {
  const url = getPublicUrl("images", content.storage_path);
  // Storage paths are "<uuid>-<original filename>" (see
  // components/editor/FileUploader.tsx) -- strip the uuid prefix back off
  // for a sensible downloaded filename.
  const filename = content.storage_path.split("-").slice(1).join("-") || "image";
  const [downloading, setDownloading] = useState(false);

  return (
    <div className="relative">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={url}
        alt={content.alt_he || content.alt_en || ""}
        loading="lazy"
        className="h-auto w-full rounded-xl border border-neutral-200 dark:border-neutral-800"
      />
      <button
        type="button"
        aria-label="הורדת התמונה"
        disabled={downloading}
        onClick={async () => {
          setDownloading(true);
          try {
            await downloadFile(url, filename);
          } finally {
            setDownloading(false);
          }
        }}
        className="absolute bottom-2 start-2 flex items-center justify-center rounded-full bg-black/60 p-2 text-white backdrop-blur hover:bg-black/75 disabled:opacity-50"
      >
        <Download size={16} />
      </button>
    </div>
  );
}
