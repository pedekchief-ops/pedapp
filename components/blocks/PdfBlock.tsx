"use client";

import { useState } from "react";
import { Download } from "lucide-react";
import { getPublicUrl } from "@/lib/supabase/storage";
import { downloadFile } from "@/lib/download";
import type { PdfContent } from "@/lib/supabase/types";

// Renders the PDF via the browser's own native viewer in an <iframe>,
// rather than pdf.js/react-pdf drawing to a <canvas>. That earlier
// approach kept crashing ("Object.defineProperty called on non-object")
// from a pdfjs-dist/webpack bundling incompatibility that resisted several
// fix attempts (ssr:false, etc.) -- an iframe sidesteps the whole class of
// problem, and picks up zoom/pinch/page navigation/print for free from
// whatever PDF viewer the browser already has, rather than reimplementing
// them. The iframe's request to the Storage URL still goes through the
// service worker's existing runtime-caching rule (app/sw.ts), so offline
// behavior is unchanged.
export function PdfBlock({ content }: { content: PdfContent }) {
  const [downloading, setDownloading] = useState(false);

  // A block published without ever completing a file upload (see
  // components/editor/FileUploader.tsx) has an empty storage_path --
  // there's nothing to render.
  if (!content.storage_path) return null;

  const url = getPublicUrl("pdfs", content.storage_path);
  const filename = content.original_filename || content.storage_path;
  const title = content.title || filename;

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
        src={url}
        title={title}
        className="h-[75vh] w-full bg-neutral-50 dark:bg-neutral-950"
      />
    </div>
  );
}
