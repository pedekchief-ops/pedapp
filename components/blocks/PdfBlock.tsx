"use client";

import { useState } from "react";
import { Download } from "lucide-react";
import { getPublicUrl } from "@/lib/supabase/storage";
import { downloadFile } from "@/lib/download";
import type { PdfContent } from "@/lib/supabase/types";

// Renders the PDF using Mozilla's own prebuilt pdf.js viewer app
// (self-hosted as static files under public/pdfjs-viewer/, see the repo
// root README for where it came from), loaded in an <iframe> pointed at
// viewer.html?file=<url> -- not the browser's native/plugin PDF viewer.
// That native-viewer-via-iframe approach looked fine in automated Chromium
// testing but was unreliable in real-world Safari/iOS (blank pages,
// silently falling back to a download instead of rendering), which is
// exactly why pdf.js ships this standalone viewer: it renders every page
// itself via canvas, identically on every browser, and gets a full
// toolbar (zoom, page nav, search, print, its own download) for free.
// Because it's static files rather than something our own webpack build
// processes, it also sidesteps the pdfjs-dist/webpack bundling crash that
// broke the earlier react-pdf-based attempt.
export function PdfBlock({ content }: { content: PdfContent }) {
  const [downloading, setDownloading] = useState(false);

  // A block published without ever completing a file upload (see
  // components/editor/FileUploader.tsx) has an empty storage_path --
  // there's nothing to render.
  if (!content.storage_path) return null;

  const url = getPublicUrl("pdfs", content.storage_path);
  const filename = content.original_filename || content.storage_path;
  const title = content.title || filename;
  // pdf.js's viewer refuses to load a `file` whose origin doesn't match
  // its own (a built-in anti-proxy-abuse check) -- Supabase Storage is a
  // different origin, so the viewer is pointed at our own same-origin
  // proxy (app/api/files/pdfs/[...path]/route.ts) instead of the direct
  // Storage URL. The download button below still uses the direct URL --
  // that's a plain fetch(), not subject to the viewer's check.
  const viewerUrl = `/pdfjs-viewer/web/viewer.html?file=${encodeURIComponent(
    `/api/files/pdfs/${content.storage_path}`
  )}`;

  return (
    <div className="overflow-hidden rounded-xl border border-neutral-200 dark:border-neutral-800">
      <div className="flex items-center justify-between gap-2 border-b border-neutral-200 px-4 py-2 dark:border-neutral-800">
        <span className="truncate text-sm font-medium text-neutral-700 dark:text-neutral-200">{title}</span>
        <button
          type="button"
          aria-label="הורדת הקובץ"
          disabled={downloading}
          onClick={async () => {
            setDownloading(true);
            try {
              await downloadFile(url, filename);
            } finally {
              setDownloading(false);
            }
          }}
          className="rounded-lg p-1.5 text-neutral-500 hover:bg-neutral-100 disabled:opacity-50 dark:text-neutral-400 dark:hover:bg-neutral-800"
        >
          <Download size={16} />
        </button>
      </div>
      <iframe
        src={viewerUrl}
        title={title}
        className="h-[75vh] w-full bg-neutral-100 dark:bg-neutral-950"
      />
    </div>
  );
}
