"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Search, X, MapPin, ArrowLeft } from "lucide-react";
import { BlockRenderer } from "@/components/blocks/BlockRenderer";
import { formatMedicationFieldValue } from "@/lib/medications";
import type { Block, BlockNode, MedicationField, MedicationFieldValue, Section } from "@/lib/supabase/types";
import type { SearchHit } from "@/lib/search";

type Scope = "all" | "section" | "page";

function hitKey(hit: SearchHit): string {
  return `${hit.medicationId ?? hit.pageSlug}-${hit.blockId ?? "page"}`;
}

// Search accessible from anywhere in the app (opened from AppChrome's
// header icon, or the home page's HomeSearchBar), scoped by default to
// wherever the resident currently is: inside a page it defaults to "this
// page only" (block-level results with snippets), inside a section it
// defaults to that category, and from the home grid it defaults to
// everything. The resident can always widen or narrow the scope via the
// chips.
//
// AppChrome only renders this component while open (`{searchOpen && ...}`)
// rather than passing an `open` prop -- that mount/unmount is what gives
// every opening a fresh initial state for free, without an effect that
// resets state in response to an `open` flag changing.
export function SearchOverlay({
  onClose,
  sections,
}: {
  onClose: () => void;
  sections: Section[];
}) {
  const params = useParams<{ sectionSlug?: string; pageSlug?: string }>();
  const router = useRouter();
  const currentSectionSlug = typeof params.sectionSlug === "string" ? params.sectionSlug : undefined;
  const currentPageSlug = typeof params.pageSlug === "string" ? params.pageSlug : undefined;
  const currentSection = sections.find((s) => s.slug === currentSectionSlug);

  const [query, setQuery] = useState("");
  const [scope, setScope] = useState<Scope>(
    currentPageSlug ? "page" : currentSectionSlug ? "section" : "all"
  );
  const [sectionFilter, setSectionFilter] = useState<string>(currentSectionSlug ?? "");
  const [results, setResults] = useState<SearchHit[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const trimmedQuery = query.trim();

  // Clicking a result that has something specific to show (a matched
  // block, or a drug) expands it in place instead of navigating away
  // immediately -- "מעבר לעמוד" inside the preview is the actual
  // navigation. A title-only match (no block, no drug) has nothing to
  // preview, so it still navigates straight away.
  const [expandedKey, setExpandedKey] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [blockPreview, setBlockPreview] = useState<BlockNode | null>(null);
  const [medicationPreview, setMedicationPreview] = useState<{
    fields: MedicationField[];
    values: Record<string, MedicationFieldValue>;
  } | null>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (trimmedQuery.length < 2) return;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      setLoading(true);
      setExpandedKey(null);
      const search = new URLSearchParams({ q: trimmedQuery });
      if (scope === "section" && sectionFilter) search.set("section", sectionFilter);
      if (scope === "page" && currentSectionSlug && currentPageSlug) {
        search.set("section", currentSectionSlug);
        search.set("page", currentPageSlug);
      }
      fetch(`/api/search?${search.toString()}`, { signal: controller.signal })
        .then((res) => res.json())
        .then((data) => setResults(data.hits ?? []))
        .catch(() => {})
        .finally(() => setLoading(false));
    }, 300);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [trimmedQuery, scope, sectionFilter, currentSectionSlug, currentPageSlug]);

  function goTo(hit: SearchHit) {
    let url: string;
    if (hit.medicationId) {
      url = `/${hit.sectionSlug}?open=${hit.medicationId}`;
    } else if (hit.blockId) {
      url = `/${hit.sectionSlug}/${hit.pageSlug}#block-${hit.blockId}`;
    } else {
      url = `/${hit.sectionSlug}/${hit.pageSlug}`;
    }
    onClose();
    router.push(url);
  }

  async function handleResultClick(hit: SearchHit) {
    if (!hit.blockId && !hit.medicationId) {
      // Nothing more specific than the page itself matched -- go straight
      // there, same as before this feature existed.
      goTo(hit);
      return;
    }

    const key = hitKey(hit);
    if (expandedKey === key) {
      setExpandedKey(null);
      return;
    }
    setExpandedKey(key);
    setBlockPreview(null);
    setMedicationPreview(null);
    setPreviewLoading(true);
    try {
      if (hit.blockId) {
        const res = await fetch(`/api/blocks/${hit.blockId}`);
        if (res.ok) {
          const block = (await res.json()) as Block;
          // Force collapsible off for the preview -- whatever state the
          // page itself uses it in, the whole point here is to show the
          // match immediately, not behind a toggle.
          setBlockPreview({ ...block, collapsible: false, children: [] });
        }
      } else if (hit.medicationId) {
        const res = await fetch("/api/medications");
        if (res.ok) {
          const data = await res.json();
          const medication = (
            data.medications as { id: string; values: Record<string, MedicationFieldValue> }[]
          ).find((m) => m.id === hit.medicationId);
          if (medication) {
            setMedicationPreview({ fields: data.fields, values: medication.values });
          }
        }
      }
    } finally {
      setPreviewLoading(false);
    }
  }

  // Stale results from a previous, longer query are simply not shown once
  // the query shrinks below the 2-character minimum -- no need to clear
  // `results` state itself.
  const showResults = trimmedQuery.length >= 2 && !loading;

  return (
    <div className="fixed inset-0 z-[80] flex items-start justify-center bg-black/50 p-4 pt-16 sm:pt-24">
      <button aria-label="סגירת חיפוש" className="absolute inset-0" onClick={onClose} />
      <div className="relative w-full max-w-lg rounded-2xl bg-white shadow-xl dark:bg-neutral-900">
        <div className="flex items-center gap-2 border-b border-neutral-200 px-4 py-3 dark:border-neutral-800">
          <Search size={18} className="text-neutral-400" />
          <input
            ref={inputRef}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="חיפוש..."
            className="flex-1 bg-transparent text-sm outline-none"
          />
          <button
            type="button"
            onClick={onClose}
            aria-label="סגירה"
            className="rounded-lg p-1 text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2 border-b border-neutral-200 px-4 py-2 dark:border-neutral-800">
          <ScopeChip active={scope === "all"} onClick={() => setScope("all")} label="בכל האפליקציה" />
          {currentSectionSlug && (
            <ScopeChip
              active={scope === "section"}
              onClick={() => setScope("section")}
              label={`בקטגוריית "${currentSection?.name_he ?? currentSectionSlug}"`}
            />
          )}
          {currentPageSlug && (
            <ScopeChip active={scope === "page"} onClick={() => setScope("page")} label="בעמוד הזה בלבד" />
          )}
        </div>

        {scope === "section" && (
          <div className="border-b border-neutral-200 px-4 py-2 dark:border-neutral-800">
            <select
              value={sectionFilter}
              onChange={(e) => setSectionFilter(e.target.value)}
              className="w-full rounded-lg border border-neutral-300 px-2 py-1.5 text-sm dark:border-neutral-700 dark:bg-neutral-950"
            >
              {sections.map((s) => (
                <option key={s.id} value={s.slug}>
                  {s.name_he}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="max-h-[32rem] overflow-y-auto p-2">
          {loading && <p className="p-3 text-sm text-neutral-400">מחפש...</p>}
          {showResults && results.length === 0 && (
            <p className="p-3 text-sm text-neutral-400">לא נמצאו תוצאות.</p>
          )}
          {!loading && trimmedQuery.length < 2 && (
            <p className="p-3 text-sm text-neutral-400">הקלידו לפחות 2 תווים.</p>
          )}
          {showResults && (
            <ul className="flex flex-col gap-1">
              {results.map((hit) => {
                const key = hitKey(hit);
                const isExpanded = expandedKey === key;
                return (
                  <li key={key} className="rounded-lg">
                    <button
                      type="button"
                      onClick={() => handleResultClick(hit)}
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
                              onClick={() => goTo(hit)}
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
          )}
        </div>
      </div>
    </div>
  );
}

function ScopeChip({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-2.5 py-1 text-xs ${
        active
          ? "border-primary bg-primary/10 text-primary"
          : "border-neutral-200 text-neutral-500 dark:border-neutral-700 dark:text-neutral-400"
      }`}
    >
      {label}
    </button>
  );
}
