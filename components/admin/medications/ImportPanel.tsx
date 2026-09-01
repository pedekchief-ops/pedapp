"use client";

import { useState, useTransition } from "react";
import { FileText, Image as ImageIcon, Sparkles } from "lucide-react";
import { FileUploader } from "@/components/editor/FileUploader";
import { extractMedicationsFromFile, type ExtractionResult } from "@/lib/actions/medication-import";
import { useToast } from "@/components/Toast";
import { ImportReview } from "./ImportReview";
import type { MedicationCategory, MedicationField } from "@/lib/supabase/types";

type SourceKind = "pdf" | "image";

// Entry point for the "ייבוא מ-PDF" tab: upload a dosing-table PDF or photo,
// send it for AI extraction (lib/actions/medication-import.ts), then hand
// the result to ImportReview for the admin to edit/approve before anything
// is written to the database. See the delivery plan for why extraction
// never writes directly -- this is clinical dosing data and needs a human
// check.
export function ImportPanel({
  sectionSlug,
  fields,
  categories,
}: {
  sectionSlug: string;
  fields: MedicationField[];
  categories: MedicationCategory[];
}) {
  const [sourceKind, setSourceKind] = useState<SourceKind>("pdf");
  const [uploaded, setUploaded] = useState<{ storagePath: string; filename: string } | null>(null);
  const [result, setResult] = useState<ExtractionResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [extracting, startExtracting] = useTransition();
  const { showToast } = useToast();

  function reset() {
    setUploaded(null);
    setResult(null);
    setError(null);
  }

  function handleExtract() {
    if (!uploaded) return;
    setError(null);
    startExtracting(async () => {
      try {
        const extraction = await extractMedicationsFromFile(
          sectionSlug,
          uploaded.storagePath,
          sourceKind === "pdf" ? "pdfs" : "images"
        );
        setResult(extraction);
      } catch (err) {
        setError(err instanceof Error ? err.message : "החילוץ נכשל");
      }
    });
  }

  if (result) {
    return (
      <ImportReview
        sectionSlug={sectionSlug}
        fields={fields}
        categories={categories}
        result={result}
        sourceFilename={uploaded?.filename ?? ""}
        onDone={(count) => {
          showToast(`יובאו ${count} תרופות`);
          reset();
        }}
        onCancel={reset}
      />
    );
  }

  return (
    <div className="flex max-w-lg flex-col gap-3">
      <p className="text-sm text-neutral-500 dark:text-neutral-400">
        העלאת קובץ PDF או תמונה (צילום/סריקה) עם טבלת מינונים -- המערכת תנתח
        אותו ותציע שורות תרופה למיפוי לשדות הקיימים (ותציע שדות חדשים במידת
        הצורך), לפני שתבחר לשמור בפועל.
      </p>

      {!uploaded && (
        <div className="flex gap-1 rounded-lg border border-neutral-200 p-1 dark:border-neutral-800">
          <SourceKindButton
            active={sourceKind === "pdf"}
            icon={<FileText size={14} />}
            label="PDF"
            onClick={() => setSourceKind("pdf")}
          />
          <SourceKindButton
            active={sourceKind === "image"}
            icon={<ImageIcon size={14} />}
            label="תמונה"
            onClick={() => setSourceKind("image")}
          />
        </div>
      )}

      {!uploaded ? (
        sourceKind === "pdf" ? (
          <FileUploader
            bucket="pdfs"
            accept="application/pdf"
            onUploaded={(f) => setUploaded({ storagePath: f.storagePath, filename: f.filename })}
          />
        ) : (
          <FileUploader
            bucket="images"
            accept="image/jpeg,image/png,image/gif,image/webp"
            onUploaded={(f) => setUploaded({ storagePath: f.storagePath, filename: f.filename })}
          />
        )
      ) : (
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2 rounded-lg border border-neutral-200 p-2 text-sm text-neutral-700 dark:border-neutral-800 dark:text-neutral-200">
            {sourceKind === "pdf" ? (
              <FileText size={16} className="shrink-0 text-neutral-400" />
            ) : (
              <ImageIcon size={16} className="shrink-0 text-neutral-400" />
            )}
            <span className="truncate" dir="ltr">
              {uploaded.filename}
            </span>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={extracting}
              onClick={handleExtract}
              className="flex items-center justify-center gap-2 rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
            >
              <Sparkles size={16} />
              {extracting ? "מנתח... (יכול לקחת עד דקה)" : "ניתוח קובץ"}
            </button>
            <button
              type="button"
              disabled={extracting}
              onClick={reset}
              className="rounded-lg px-3 py-1.5 text-sm text-neutral-600 hover:bg-neutral-100 disabled:opacity-50 dark:text-neutral-300 dark:hover:bg-neutral-800"
            >
              קובץ אחר
            </button>
          </div>
        </div>
      )}

      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
}

function SourceKindButton({
  active,
  icon,
  label,
  onClick,
}: {
  active: boolean;
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition ${
        active
          ? "bg-primary text-primary-foreground"
          : "text-neutral-600 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}
