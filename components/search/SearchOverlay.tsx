"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Search, X } from "lucide-react";
import { useSearchPreview } from "./useSearchPreview";
import { SearchResultsList } from "./SearchResultsList";
import { useUnsavedChangesGuard } from "@/components/nav/UnsavedChangesGuard";
import type { Section } from "@/lib/supabase/types";
import type { SearchHit } from "@/lib/search";

type Scope = "all" | "section" | "page";

// Search accessible from anywhere in the app (opened from AppChrome's
// header icon -- the home page has its own always-visible inline search,
// see HomeSearchBar.tsx), scoped by default to wherever the resident
// currently is: inside a page it defaults to "this page only" (block-level
// results with snippets), inside a section it defaults to that category.
// The resident can always widen or narrow the scope via the chips.
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
  const { confirmNavigation } = useUnsavedChangesGuard();
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

  const { expandedKey, previewLoading, blockPreview, medicationPreview, togglePreview, resetPreview } =
    useSearchPreview();

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (trimmedQuery.length < 2) return;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      setLoading(true);
      resetPreview();
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trimmedQuery, scope, sectionFilter, currentSectionSlug, currentPageSlug]);

  async function goTo(hit: SearchHit) {
    if (!(await confirmNavigation())) return;
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

  function handleResultClick(hit: SearchHit) {
    if (!hit.blockId && !hit.medicationId) {
      // Nothing more specific than the page itself matched -- go straight
      // there, same as before this feature existed.
      goTo(hit);
      return;
    }
    togglePreview(hit);
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
            <SearchResultsList
              results={results}
              expandedKey={expandedKey}
              previewLoading={previewLoading}
              blockPreview={blockPreview}
              medicationPreview={medicationPreview}
              onResultClick={handleResultClick}
              onGoTo={goTo}
            />
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
