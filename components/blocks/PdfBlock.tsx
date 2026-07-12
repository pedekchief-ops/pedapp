"use client";

import { useEffect, useRef, useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import { ChevronRight, ChevronLeft } from "lucide-react";
import { getPublicUrl } from "@/lib/supabase/storage";
import type { PdfContent } from "@/lib/supabase/types";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

// Served from /public (see scripts/copy-pdf-worker.mjs) rather than a CDN,
// so it works offline once cached and doesn't depend on an external host.
pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

// Inline PDF viewer -- renders pages onto <canvas> via pdf.js rather than
// linking out to a native/browser PDF viewer, which is what makes it work
// the same way inside the installed PWA and offline once the file is cached.
export function PdfBlock({ content }: { content: PdfContent }) {
  const url = getPublicUrl("pdfs", content.storage_path);
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState<number>(0);
  const [numPages, setNumPages] = useState<number | null>(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div className="overflow-hidden rounded-xl border border-neutral-200 dark:border-neutral-800">
      {content.title && (
        <div className="border-b border-neutral-200 px-4 py-2 text-sm font-medium text-neutral-700 dark:border-neutral-800 dark:text-neutral-200">
          {content.title}
        </div>
      )}
      <div ref={containerRef} className="flex justify-center bg-neutral-50 p-2 dark:bg-neutral-950">
        {error ? (
          <p className="p-4 text-sm text-red-600 dark:text-red-400">{error}</p>
        ) : (
          <Document
            file={url}
            onLoadSuccess={({ numPages }) => setNumPages(numPages)}
            onLoadError={() => setError("לא ניתן לטעון את קובץ ה-PDF")}
            loading={<p className="p-4 text-sm text-neutral-500">טוען PDF...</p>}
          >
            {width > 0 && <Page pageNumber={pageNumber} width={Math.min(width, 800)} />}
          </Document>
        )}
      </div>
      {numPages && numPages > 1 && (
        <div className="flex items-center justify-center gap-4 border-t border-neutral-200 py-2 text-sm dark:border-neutral-800">
          {/* RTL reading order: the "start" (right) side is the beginning
              of the document, so it holds the previous-page control; the
              "end" (left) side moves forward toward later pages. */}
          <button
            type="button"
            onClick={() => setPageNumber((p) => Math.max(p - 1, 1))}
            disabled={pageNumber <= 1}
            aria-label="עמוד קודם"
            className="rounded-lg p-1.5 hover:bg-neutral-100 disabled:opacity-30 dark:hover:bg-neutral-800"
          >
            <ChevronRight size={18} />
          </button>
          <span className="text-neutral-600 dark:text-neutral-300">
            {pageNumber} מתוך {numPages}
          </span>
          <button
            type="button"
            onClick={() => setPageNumber((p) => Math.min(p + 1, numPages))}
            disabled={pageNumber >= numPages}
            aria-label="עמוד הבא"
            className="rounded-lg p-1.5 hover:bg-neutral-100 disabled:opacity-30 dark:hover:bg-neutral-800"
          >
            <ChevronLeft size={18} />
          </button>
        </div>
      )}
    </div>
  );
}
