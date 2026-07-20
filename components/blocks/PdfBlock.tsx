"use client";

import { useEffect, useRef, useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import { ChevronRight, ChevronLeft, Download, ZoomIn, ZoomOut, RotateCcw } from "lucide-react";
import { getPublicUrl } from "@/lib/supabase/storage";
import { downloadFile } from "@/lib/download";
import type { PdfContent } from "@/lib/supabase/types";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

// Served from /public (see scripts/copy-pdf-worker.mjs) rather than a CDN,
// so it works offline once cached and doesn't depend on an external host.
pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

const MIN_SCALE = 0.5;
const MAX_SCALE = 3;
const SCALE_STEP = 0.25;

// Inline PDF viewer -- renders pages onto <canvas> via pdf.js rather than
// linking out to a native/browser PDF viewer, which is what makes it work
// the same way inside the installed PWA and offline once the file is cached.
export function PdfBlock({ content }: { content: PdfContent }) {
  // Storage paths are "<uuid>-<original filename>" (see
  // components/editor/FileUploader.tsx) -- strip the uuid prefix back off
  // for a sensible downloaded filename. Computed even when storage_path is
  // empty so hooks below stay unconditional (Rules of Hooks) -- the actual
  // "nothing to render" bailout happens after them, right before the JSX.
  const url = getPublicUrl("pdfs", content.storage_path);
  const filename = content.storage_path.split("-").slice(1).join("-") || "document.pdf";
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState<number>(0);
  const [numPages, setNumPages] = useState<number | null>(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [scale, setScale] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // A block published without ever completing a file upload (see
  // components/editor/FileUploader.tsx) has an empty storage_path -- render
  // nothing rather than pointing react-pdf at a URL that can't resolve.
  if (!content.storage_path) return null;

  const baseWidth = Math.min(width, 800);

  return (
    <div className="overflow-hidden rounded-xl border border-neutral-200 dark:border-neutral-800">
      <div className="flex items-center justify-between gap-2 border-b border-neutral-200 px-4 py-2 dark:border-neutral-800">
        <span className="truncate text-sm font-medium text-neutral-700 dark:text-neutral-200">
          {content.title || filename}
        </span>
        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            aria-label="הקטנה"
            disabled={scale <= MIN_SCALE}
            onClick={() => setScale((s) => Math.max(MIN_SCALE, +(s - SCALE_STEP).toFixed(2)))}
            className="rounded-lg p-1.5 text-neutral-500 hover:bg-neutral-100 disabled:opacity-30 dark:text-neutral-400 dark:hover:bg-neutral-800"
          >
            <ZoomOut size={16} />
          </button>
          <span className="min-w-10 text-center text-xs text-neutral-500 dark:text-neutral-400">
            {Math.round(scale * 100)}%
          </span>
          <button
            type="button"
            aria-label="הגדלה"
            disabled={scale >= MAX_SCALE}
            onClick={() => setScale((s) => Math.min(MAX_SCALE, +(s + SCALE_STEP).toFixed(2)))}
            className="rounded-lg p-1.5 text-neutral-500 hover:bg-neutral-100 disabled:opacity-30 dark:text-neutral-400 dark:hover:bg-neutral-800"
          >
            <ZoomIn size={16} />
          </button>
          {scale !== 1 && (
            <button
              type="button"
              aria-label="איפוס תצוגה"
              onClick={() => setScale(1)}
              className="rounded-lg p-1.5 text-neutral-500 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800"
            >
              <RotateCcw size={16} />
            </button>
          )}
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
      </div>
      <div
        ref={containerRef}
        className="flex max-h-[70vh] justify-center overflow-auto bg-neutral-50 p-2 dark:bg-neutral-950"
      >
        {error ? (
          <p className="p-4 text-sm text-red-600 dark:text-red-400">{error}</p>
        ) : (
          <Document
            file={url}
            onLoadSuccess={({ numPages }) => setNumPages(numPages)}
            onLoadError={() => setError("לא ניתן לטעון את קובץ ה-PDF")}
            loading={<p className="p-4 text-sm text-neutral-500">טוען PDF...</p>}
          >
            {baseWidth > 0 && <Page pageNumber={pageNumber} width={baseWidth * scale} />}
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
