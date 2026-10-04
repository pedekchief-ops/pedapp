"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, X } from "lucide-react";
import { useSearchPreview } from "./useSearchPreview";
import { SearchResultsList } from "./SearchResultsList";
import type { SearchHit } from "@/lib/search";

// A prominent, always-visible search bar on the home page, above the
// section-card grid. Search happens right here: typing opens an inline
// results dropdown anchored under the bar, instead of popping a
// full-screen modal (compare SearchOverlay.tsx, still used from the
// header icon on every other page, where there's no permanent on-page bar
// to search from). Always scoped to the whole app -- there's no current
// section/page on the home page for SearchOverlay's narrower defaults to
// make sense of.
export function HomeSearchBar() {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [results, setResults] = useState<SearchHit[]>([]);
  const [loading, setLoading] = useState(false);
  const trimmedQuery = query.trim();

  const { expandedKey, previewLoading, blockPreview, medicationPreview, togglePreview, resetPreview } =
    useSearchPreview();

  useEffect(() => {
    // Stale results from a previous, longer query are simply not shown
    // once the dropdown's own trimmedQuery.length >= 2 gate closes (see
    // showDropdown below) -- no need to clear `results` state itself.
    if (trimmedQuery.length < 2) return;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      setLoading(true);
      resetPreview();
      fetch(`/api/search?q=${encodeURIComponent(trimmedQuery)}`, { signal: controller.signal })
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
  }, [trimmedQuery]);

  // Clicking outside collapses the dropdown without clearing the typed
  // query, so refocusing the input brings the same results straight back
  // -- a plain onBlur would fire before a result's onClick and the click
  // would never register.
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function goTo(hit: SearchHit) {
    let url: string;
    if (hit.medicationId) {
      url = `/${hit.sectionSlug}?open=${hit.medicationId}`;
    } else if (hit.blockId) {
      url = `/${hit.sectionSlug}/${hit.pageSlug}#block-${hit.blockId}`;
    } else {
      url = `/${hit.sectionSlug}/${hit.pageSlug}`;
    }
    setOpen(false);
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

  function handleClear() {
    setQuery("");
    setResults([]);
    resetPreview();
  }

  const showDropdown = open && trimmedQuery.length >= 2;

  return (
    <div ref={containerRef} className="relative mb-4">
      <div className="flex w-full items-center gap-3 rounded-2xl border border-neutral-200 bg-white px-4 py-3.5 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
        <Search size={20} className="shrink-0 text-neutral-400" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              setOpen(false);
              (e.target as HTMLInputElement).blur();
            }
          }}
          placeholder="חיפוש בכל האפליקציה..."
          className="flex-1 bg-transparent text-sm outline-none placeholder:text-neutral-500 dark:placeholder:text-neutral-400"
        />
        {query && (
          <button
            type="button"
            onClick={handleClear}
            aria-label="ניקוי חיפוש"
            className="shrink-0 rounded-lg p-1 text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800"
          >
            <X size={16} />
          </button>
        )}
      </div>

      {showDropdown && (
        <div className="absolute inset-x-0 top-full z-20 mt-2 max-h-[28rem] overflow-y-auto rounded-2xl border border-neutral-200 bg-white p-2 shadow-xl dark:border-neutral-800 dark:bg-neutral-900">
          {loading && <p className="p-3 text-sm text-neutral-400">מחפש...</p>}
          {!loading && results.length === 0 && (
            <p className="p-3 text-sm text-neutral-400">לא נמצאו תוצאות.</p>
          )}
          {!loading && results.length > 0 && (
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
      )}
    </div>
  );
}
