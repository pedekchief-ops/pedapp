"use client";

import { useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";
import { formatMedicationFieldValue } from "@/lib/medications";
import type { MedicationCategory, MedicationField, MedicationWithCategories } from "@/lib/supabase/types";

// The resident-facing medications view: a horizontally-scrolling row of
// category tabs (never wraps to multiple lines, same pattern as
// components/blocks/TabsBlock.tsx) and, below it, drugs in the active
// category as collapsed rows that expand inline into an accordion --
// deliberately not a separate page/modal, so residents can compare
// several drugs without losing their place.
export function MedicationsBrowser({
  fields,
  categories,
  medications,
}: {
  fields: MedicationField[];
  categories: MedicationCategory[];
  medications: MedicationWithCategories[];
}) {
  const [activeCategory, setActiveCategory] = useState<string | undefined>(categories[0]?.id);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const titleField = fields.find((f) => f.is_title);
  const summaryFields = fields.filter((f) => f.show_in_summary);
  const detailFields = fields.filter((f) => !f.is_title);

  const filtered = useMemo(() => {
    const list = medications.filter((m) => m.categoryIds.includes(activeCategory ?? ""));
    return list.sort((a, b) => {
      const an = titleField ? String(a.values[titleField.key] ?? "") : "";
      const bn = titleField ? String(b.values[titleField.key] ?? "") : "";
      return an.localeCompare(bn, "he");
    });
  }, [medications, activeCategory, titleField]);

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
            const title = titleField ? String(medication.values[titleField.key] ?? "") : "";

            return (
              <li
                key={medication.id}
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
