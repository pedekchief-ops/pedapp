import Link from "next/link";
import { Search as SearchIcon } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { searchContent } from "@/lib/search";

// A plain, deep-linkable /search?q=... page (global scope) -- the primary
// search experience is SearchOverlay (opened from AppChrome's header icon
// on every page), which additionally supports category/current-page
// scoping. This page exists so a search URL can still be shared/bookmarked.
export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const query = q?.trim() ?? "";
  const supabase = await createClient();

  const results = query.length > 0 ? await searchContent(supabase, { query }) : [];

  return (
    <div className="mx-auto max-w-2xl p-4">
      <form className="mb-6 flex items-center gap-2 rounded-xl border border-neutral-200 px-3 py-2 dark:border-neutral-800">
        <SearchIcon size={18} className="text-neutral-400" />
        <input
          type="search"
          name="q"
          defaultValue={query}
          placeholder="חיפוש בכל התוכן..."
          autoFocus
          className="w-full bg-transparent text-sm outline-none"
        />
      </form>

      {query.length === 0 && (
        <p className="text-sm text-neutral-500 dark:text-neutral-400">
          הקלידו לפחות שני תווים כדי לחפש.
        </p>
      )}

      {query.length > 0 && results.length === 0 && (
        <p className="text-sm text-neutral-500 dark:text-neutral-400">
          לא נמצאו תוצאות עבור &quot;{query}&quot;.
        </p>
      )}

      <ul className="flex flex-col gap-2">
        {results.map((hit) => (
          <li key={`${hit.sectionSlug}-${hit.pageSlug}`}>
            <Link
              href={`/${hit.sectionSlug}/${hit.pageSlug}`}
              className="block rounded-xl border border-neutral-200 px-4 py-3 hover:bg-neutral-50 dark:border-neutral-800 dark:hover:bg-neutral-900"
            >
              <span className="block text-sm font-medium text-neutral-900 dark:text-neutral-50">
                {hit.pageTitleHe}
              </span>
              <span className="text-xs text-neutral-500 dark:text-neutral-400">
                {hit.sectionNameHe}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
