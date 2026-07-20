"use client";

import { useState } from "react";
import { Download, ImageOff } from "lucide-react";
import { getPublicUrl } from "@/lib/supabase/storage";
import { downloadFile } from "@/lib/download";
import type { ImageContent } from "@/lib/supabase/types";

// Plain <img> rather than next/image: next/image proxies through an
// on-demand optimization endpoint, which the offline service worker can't
// usefully cache (it's a different URL every time and requires the
// optimizer to be reachable). A same-origin-cacheable Storage URL matters
// more here than automatic resizing.
export function ImageBlock({ content }: { content: ImageContent }) {
  const [downloading, setDownloading] = useState(false);
  const [failed, setFailed] = useState(false);

  // A block published without ever completing a file upload (see
  // components/editor/FileUploader.tsx) has an empty storage_path --
  // there's nothing to render.
  if (!content.storage_path) return null;

  const url = getPublicUrl("images", content.storage_path);
  const filename = content.original_filename || content.storage_path;

  if (failed) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-dashed border-neutral-300 p-4 text-sm text-neutral-500 dark:border-neutral-700 dark:text-neutral-400">
        <ImageOff size={18} />
        לא ניתן לטעון את התמונה
      </div>
    );
  }

  return (
    <div className="relative">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={url}
        alt={content.alt_he || content.alt_en || ""}
        loading="lazy"
        onError={() => setFailed(true)}
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
