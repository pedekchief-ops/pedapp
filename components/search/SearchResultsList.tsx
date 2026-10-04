"use client";

import { MapPin, ArrowLeft } from "lucide-react";
import { BlockRenderer } from "@/components/blocks/BlockRenderer";
import { formatMedicationFieldValue } from "@/lib/medications";
import type { BlockNode } from "@/lib/supabase/types";
import type { SearchHit } from "@/lib/search";
import { hitKey, type MedicationPreview } from "./useSearchPreview";

// The results <ul> shared by SearchOverlay and HomeSearchBar -- see
// useSearchPreview.ts for why expansion/preview state lives in a shared
// hook instead of here: this component is purely presentational.
export function SearchResultsList({
  results,
  expandedKey,
  previewLoading,
  blockPreview,
  medicationPreview,
  onResultClick,
  onGoTo,
}: {
  results: SearchHit[];
  expandedKey: string | null;
  previewLoading: boolean;
  blockPreview: BlockNode | null;
  medicationPreview: MedicationPreview | null;
  onResultClick: (hit: SearchHit) => void;
  onGoTo: (hit: SearchHit) => void;
}) {
  return (
    <ul className="flex flex-col gap-1">
      {results.map((hit) => {
        const key = hitKey(hit);
        const isExpanded = expandedKey === key;
        return (
          <li key={key} className="rounded-lg">
            <button
              type="button"
              onClick={() => onResultClick(hit)}
              className="flex w-full flex-col items-start gap-0.5 rounded-lg px-3 py-2 text-start hover:bg-neutral-50 dark:hover:bg-neutral-800"
            >
              <span className="text-sm font-medium text-neutral-900 dark:text-neutral-50">
                {hit.pageTitleHe}
              </span>
              <span className="flex items-center gap-1 text-xs text-neutral-500 dark:text-neutral-400">
                <MapPin size={11} />
                {hit.sectionNameHe}
                {hit.subLabel && <span> · {hit.subLabel}</span>}
              </span>
              {hit.snippet && (
                <span className="mt-0.5 line-clamp-1 text-xs text-neutral-400">{hit.snippet}</span>
              )}
            </button>

            {isExpanded && (
              <div className="mb-1 rounded-xl border border-neutral-200 bg-neutral-50 p-3 dark:border-neutral-800 dark:bg-neutral-950">
                {previewLoading ? (
                  <p className="text-xs text-neutral-400">טוען תצוגה מקדימה...</p>
                ) : (
                  <>
                    {blockPreview && (
                      <div className="mb-3 max-h-80 overflow-y-auto">
                        <BlockRenderer block={blockPreview} />
                      </div>
                    )}
                    {medicationPreview && (
                      <dl className="mb-3 flex flex-col gap-1.5">
                        {medicationPreview.fields
                          .filter((f) => !f.is_title)
                          .map((field) => {
                            const text = formatMedicationFieldValue(field, medicationPreview.values);
                            if (!text) return null;
                            return (
                              <div
                                key={field.id}
                                className="flex flex-col gap-0.5 text-sm sm:flex-row sm:gap-2"
                              >
                                <dt className="min-w-24 font-medium text-neutral-600 dark:text-neutral-300">
                                  {field.label_he}
                                </dt>
                                <dd className="text-neutral-800 dark:text-neutral-100">{text}</dd>
                              </div>
                            );
                          })}
                      </dl>
                    )}
                    {!blockPreview && !medicationPreview && (
                      <p className="mb-3 text-xs text-neutral-400">לא ניתן לטעון תצוגה מקדימה.</p>
                    )}
                    <button
                      type="button"
                      onClick={() => onGoTo(hit)}
                      className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:opacity-90"
                    >
                      <ArrowLeft size={14} />
                      מעבר לעמוד
                    </button>
                  </>
                )}
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
