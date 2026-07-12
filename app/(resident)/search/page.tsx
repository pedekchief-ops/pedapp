import Link from "next/link";
import { Search as SearchIcon } from "lucide-react";
import { createClient } from "@/lib/supabase/server";

interface SearchResult {
  slug: string;
  title_he: string;
  sections: { slug: string; name_he: string } | null;
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const query = q?.trim() ?? "";
  const supabase = await createClient();

  let results: SearchResult[] = [];
  if (query.length > 0) {
    // Basic Postgres ILIKE search across page titles. Good enough for a
    // reference app of this size; worth swapping for full-text search or a
    // dedicated search service only if content volume or match quality
    // ever becomes a real complaint.
    const { data } = await supabase
      .from("pages")
      .select("slug, title_he, sections(slug, name_he)")
      .or(`title_he.ilike.%${query}%,title_en.ilike.%${query}%`)
      .limit(30);
    results = (data as unknown as SearchResult[]) ?? [];
  }

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
          הקלידו לפחות תו אחד כדי לחפש.
        </p>
      )}

      {query.length > 0 && results.length === 0 && (
        <p className="text-sm text-neutral-500 dark:text-neutral-400">
          לא נמצאו תוצאות עבור &quot;{query}&quot;.
        </p>
      )}

      <ul className="flex flex-col gap-2">
        {results.map((page) => (
          <li key={`${page.sections?.slug}-${page.slug}`}>
            <Link
              href={`/${page.sections?.slug}/${page.slug}`}
              className="block rounded-xl border border-neutral-200 px-4 py-3 hover:bg-neutral-50 dark:border-neutral-800 dark:hover:bg-neutral-900"
            >
              <span className="block text-sm font-medium text-neutral-900 dark:text-neutral-50">
                {page.title_he}
              </span>
              <span className="text-xs text-neutral-500 dark:text-neutral-400">
                {page.sections?.name_he}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
