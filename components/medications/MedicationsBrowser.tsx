"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ChevronDown } from "lucide-react";
import { formatMedicationFieldValue, getMedicationTitle } from "@/lib/medications";
import type { MedicationCategory, MedicationField, MedicationWithCategories } from "@/lib/supabase/types";

// The resident-facing medications view: a horizontally-scrolling row of
// category tabs (never wraps to multiple lines, same pattern as
// components/blocks/TabsBlock.tsx) and, below it, drugs in the active
// category as collapsed rows that expand inline into an accordion --
// deliberately not a separate page/modal, so residents can compare
// several drugs without losing their place.
//
// Reads ?open=<medicationId> (set by a search result deep link, see
// components/search/SearchOverlay.tsx) to decide the initial category/
// expanded state, keyed by that id so navigating to a *different* search
// result (without leaving /medications) remounts fresh with the new
// initial state -- same pattern as the [pageSlug] route keys PageViewContent
// by its route params.
export function MedicationsBrowser(props: {
  fields: MedicationField[];
  categories: MedicationCategory[];
  medications: MedicationWithCategories[];
}) {
  const searchParams = useSearchParams();
  const openId = searchParams.get("open");
  return <MedicationsBrowserView key={openId ?? "default"} openId={openId} {...props} />;
}

function MedicationsBrowserView({
  fields,
  categories,
  medications,
  openId,
}: {
  fields: MedicationField[];
  categories: MedicationCategory[];
  medications: MedicationWithCategories[];
  openId: string | null;
}) {
  const openMedication = openId ? medications.find((m) => m.id === openId) : undefined;

  const [activeCategory, setActiveCategory] = useState<string | undefined>(
    openMedication?.categoryIds[0] ?? categories[0]?.id
  );
  const [expandedId, setExpandedId] = useState<string | null>(openMedication ? openId : null);

  const summaryFields = fields.filter((f) => f.show_in_summary);
  const detailFields = fields.filter((f) => !f.is_title);

  useEffect(() => {
    if (!openMedication) return;
    requestAnimationFrame(() => {
      document.getElementById(`medication-${openMedication.id}`)?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    });
    // Only re-run if we're jumping to a different drug -- openMedication is
    // recomputed every render but only its id should retrigger the scroll.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openMedication?.id]);

  const filtered = useMemo(() => {
    const list = medications.filter((m) => m.categoryIds.includes(activeCategory ?? ""));
    return list.sort((a, b) =>
      getMedicationTitle(fields, a.values).localeCompare(getMedicationTitle(fields, b.values), "he")
    );
  }, [medications, activeCategory, fields]);

  if (categories.length === 0) {
    return (
      <p className="p-4 text-sm text-neutral-500 dark:text-neutral-400">
        טרם הוגדרו קטגוריות תרופות. ניתן להוסיף דרך ניהול תוכן.
      </p>
    );
  }

  return (
    <div className="mx-auto max-w-2xl p-4">
      <div className="mb-4 flex overflow-x-auto border-b border-neutral-200 dark:border-neutral-800">
        {categories.map((category) => (
          <button
            key={category.id}
            type="button"
            onClick={() => {
              setActiveCategory(category.id);
              setExpandedId(null);
            }}
            className={`whitespace-nowrap border-b-2 px-4 py-2 text-sm font-medium transition ${
              activeCategory === category.id
                ? "border-primary text-primary"
                : "border-transparent text-neutral-500 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-200"
            }`}
          >
            {category.name_he}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-neutral-500 dark:text-neutral-400">אין תרופות בקטגוריה זו.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {filtered.map((medication) => {
            const isExpanded = expandedId === medication.id;
            const title = getMedicationTitle(fields, medication.values);

            return (
              <li
                key={medication.id}
                id={`medication-${medication.id}`}
                className="overflow-hidden rounded-xl border border-neutral-200 dark:border-neutral-800"
              >
                <button
                  type="button"
                  onClick={() => setExpandedId(isExpanded ? null : medication.id)}
                  aria-expanded={isExpanded}
                  className="flex w-full items-center justify-between gap-3 px-4 py-3 text-start hover:bg-neutral-50 dark:hover:bg-neutral-900"
                >
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-50">{title}</p>
                    <p className="mt-0.5 flex flex-wrap gap-x-3 text-xs text-neutral-500 dark:text-neutral-400">
                      {summaryFields.map((field) => {
                        const text = formatMedicationFieldValue(field, medication.values);
                        if (!text) return null;
                        return (
                          <span key={field.id}>
                            {field.label_he}: {text}
                          </span>
                        );
                      })}
                    </p>
                  </div>
                  <ChevronDown
                    size={18}
                    className={`shrink-0 text-neutral-400 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                  />
                </button>
                {isExpanded && (
                  <div className="border-t border-neutral-100 px-4 py-3 dark:border-neutral-900">
                    <dl className="flex flex-col gap-2">
                      {detailFields.map((field) => {
                        const text = formatMedicationFieldValue(field, medication.values);
                        if (!text) return null;
                        return (
                          <div key={field.id} className="flex flex-col gap-0.5 text-sm sm:flex-row sm:gap-2">
                            <dt className="min-w-24 font-medium text-neutral-600 dark:text-neutral-300">
                              {field.label_he}
                            </dt>
                            <dd className="text-neutral-800 dark:text-neutral-100">{text}</dd>
                          </div>
                        );
                      })}
                    </dl>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
