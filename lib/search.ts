import type { SupabaseClient } from "@supabase/supabase-js";

export interface SearchHit {
  sectionSlug: string;
  sectionNameHe: string;
  pageSlug: string;
  pageTitleHe: string;
  // Set only for page-scoped search (see searchContent below) -- lets the
  // UI list/jump to each individual matching block rather than just the
  // page as a whole.
  blockId: string | null;
  snippet: string | null;
}

interface PageRow {
  id: string;
  slug: string;
  title_he: string;
  section_id: string;
}

interface SectionRow {
  id: string;
  slug: string;
  name_he: string;
}

interface BlockRow {
  id: string;
  page_id: string;
  content: unknown;
}

// Crude but effective: rich_text/data_table/link_button content is stored
// as JSON whose actual words appear as literal substrings in its
// serialized text (e.g. {"type":"text","text":"פרצטמול"} contains
// "פרצטמול" as plain text), so ILIKE against the JSON's text form finds
// real content matches without needing a separate extracted-plaintext
// column to maintain. The only false positives would come from searching
// for JSON syntax itself ("type", "text"), which isn't a realistic query.
function snippetFromContent(content: unknown, query: string): string | null {
  const raw = JSON.stringify(content);
  const idx = raw.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return null;
  const around = raw.slice(Math.max(0, idx - 30), idx + query.length + 30);
  return around
    .replace(/[{}"[\]:,\\]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// Searches page titles and block content, optionally scoped to one
// section (category) and/or one specific page. Page-scoped search returns
// one hit per matching block (with a snippet) so the caller can list every
// match within that page; broader searches collapse to one hit per page.
export async function searchContent(
  supabase: SupabaseClient,
  params: { query: string; sectionSlug?: string; pageSlug?: string }
): Promise<SearchHit[]> {
  const query = params.query.trim();
  if (query.length < 2) return [];

  let sectionId: string | undefined;
  if (params.sectionSlug) {
    const { data } = await supabase.from("sections").select("id").eq("slug", params.sectionSlug).single();
    if (!data) return [];
    sectionId = data.id;
  }

  let pageId: string | undefined;
  if (params.pageSlug && sectionId) {
    const { data } = await supabase
      .from("pages")
      .select("id")
      .eq("section_id", sectionId)
      .eq("slug", params.pageSlug)
      .single();
    if (!data) return [];
    pageId = data.id;
  }

  let candidatePageIds: string[] | undefined;
  if (sectionId && !pageId) {
    const { data } = await supabase.from("pages").select("id").eq("section_id", sectionId);
    candidatePageIds = ((data ?? []) as Pick<PageRow, "id">[]).map((p) => p.id);
    if (candidatePageIds.length === 0) return [];
  }

  let titleQuery = supabase
    .from("pages")
    .select("id, slug, title_he, section_id")
    .or(`title_he.ilike.%${query}%,title_en.ilike.%${query}%`);
  if (pageId) titleQuery = titleQuery.eq("id", pageId);
  else if (candidatePageIds) titleQuery = titleQuery.in("id", candidatePageIds);
  const { data: titleMatchesData } = await titleQuery.limit(30);
  const titleMatches = (titleMatchesData ?? []) as PageRow[];

  // PostgREST's filter syntax can't cast a jsonb column to text inline
  // (confirmed: `content::text=ilike.*x*` errors with "operator does not
  // exist: jsonb ~~* unknown"), so block-content search goes through the
  // search_blocks() SQL function instead -- see
  // supabase/migrations/0007_search_function.sql.
  const { data: blockMatchesData } = await supabase.rpc("search_blocks", {
    search_query: query,
    filter_page_id: pageId ?? null,
    filter_page_ids: candidatePageIds ?? null,
  });
  const blockMatches = (blockMatchesData ?? []) as BlockRow[];

  const pageIdsNeeded = new Set<string>();
  titleMatches.forEach((p) => pageIdsNeeded.add(p.id));
  blockMatches.forEach((b) => pageIdsNeeded.add(b.page_id));
  if (pageIdsNeeded.size === 0) return [];

  const { data: pagesData } = await supabase
    .from("pages")
    .select("id, slug, title_he, section_id")
    .in("id", Array.from(pageIdsNeeded));
  const pagesById = new Map<string, PageRow>(
    ((pagesData ?? []) as PageRow[]).map((p) => [p.id, p])
  );

  const sectionIdsNeeded = new Set(Array.from(pagesById.values()).map((p) => p.section_id));
  const { data: sectionsData } = await supabase
    .from("sections")
    .select("id, slug, name_he")
    .in("id", Array.from(sectionIdsNeeded));
  const sectionsById = new Map<string, SectionRow>(
    ((sectionsData ?? []) as SectionRow[]).map((s) => [s.id, s])
  );

  const hits = new Map<string, SearchHit>();

  function addHit(pageIdKey: string, blockId: string | null, snippet: string | null) {
    const page = pagesById.get(pageIdKey);
    if (!page) return;
    const section = sectionsById.get(page.section_id);
    if (!section) return;
    const key = blockId ? `${pageIdKey}:${blockId}` : pageIdKey;
    if (hits.has(key)) return;
    hits.set(key, {
      sectionSlug: section.slug,
      sectionNameHe: section.name_he,
      pageSlug: page.slug,
      pageTitleHe: page.title_he,
      blockId,
      snippet,
    });
  }

  for (const p of titleMatches) {
    addHit(p.id, null, null);
  }
  for (const b of blockMatches) {
    addHit(b.page_id, pageId ? b.id : null, snippetFromContent(b.content, query));
  }

  return Array.from(hits.values());
}
