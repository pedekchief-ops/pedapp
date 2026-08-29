import type { SupabaseClient } from "@supabase/supabase-js";
import type { DataTableContent } from "@/lib/supabase/types";

export interface SearchHit {
  sectionSlug: string;
  sectionNameHe: string;
  // null for a medication hit (medications aren't pages) -- see medicationId.
  pageSlug: string | null;
  // For a medication hit, this is the drug's display name instead of a page title.
  pageTitleHe: string;
  // Set only for page-scoped search -- lets the UI list/jump to each
  // individual matching block rather than just the page as a whole.
  blockId: string | null;
  // Set only for a medication hit -- lets the UI deep-link into the
  // medications browser (see components/medications/MedicationsBrowser.tsx's
  // `open` query param handling).
  medicationId: string | null;
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
  section_type: "generic" | "medications";
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

function isDataTableContent(content: unknown): content is DataTableContent {
  const c = content as DataTableContent | null;
  return !!c && Array.isArray(c.columns) && Array.isArray(c.categories);
}

// A data_table block (e.g. the lab-form index on "בדיקות חוץ") can pack
// dozens of rows and long cell text into one block, so the generic
// substring snippet above would show whatever unrelated text happens to
// sit 30 characters away in the serialized JSON rather than anything
// useful. Instead, find which row(s) actually contain the query and surface
// their first column -- by convention a short row identifier (a form
// number, a drug name, etc., see DataTableColumn order in
// components/editor/DataTableEditor.tsx) -- so a hit like searching
// "אלבומין" shows the matching form number (e.g. "T09") right in the
// result instead of a meaningless snippet.
function dataTableSnippet(content: DataTableContent, query: string): string | null {
  const idKey = content.columns[0]?.key;
  if (!idKey) return null;
  const labelKey = content.columns[1]?.key;
  const lowerQuery = query.toLowerCase();

  const allRows = content.categories.flatMap((category) => [
    ...category.rows,
    ...category.subcategories.flatMap((sub) => sub.rows),
  ]);

  const matches = allRows
    .filter((row) =>
      Object.values(row.values).some((value) => value?.toLowerCase().includes(lowerQuery))
    )
    .map((row) => [row.values[idKey], labelKey ? row.values[labelKey] : null].filter(Boolean).join(" – "));

  if (matches.length === 0) return null;
  const shown = matches.slice(0, 4).join(" · ");
  return matches.length > 4 ? `${shown} …` : shown;
}

// Matches drugs by their "searchable name" fields (generic name, trade
// name by default -- see medication_fields.is_searchable_name in
// supabase/migrations/0009_medication_search_and_multiselect.sql).
// Medications aren't scoped to a section in the schema (there's exactly
// one shared medication list), so `section` here is whichever
// medications-type section should be credited as the result's location.
async function searchMedications(
  supabase: SupabaseClient,
  query: string,
  section: SectionRow
): Promise<SearchHit[]> {
  const { data: fieldsData } = await supabase
    .from("medication_fields")
    .select("key")
    .eq("is_searchable_name", true);
  const searchableKeys = ((fieldsData ?? []) as { key: string }[]).map((f) => f.key);
  if (searchableKeys.length === 0) return [];

  const { data: medicationsData } = await supabase.from("medications").select("id, values");
  const lowerQuery = query.toLowerCase();

  const hits: SearchHit[] = [];
  for (const medication of (medicationsData ?? []) as { id: string; values: Record<string, unknown> }[]) {
    for (const key of searchableKeys) {
      const value = medication.values[key];
      if (typeof value === "string" && value.toLowerCase().includes(lowerQuery)) {
        hits.push({
          sectionSlug: section.slug,
          sectionNameHe: section.name_he,
          pageSlug: null,
          pageTitleHe: value,
          blockId: null,
          medicationId: medication.id,
          snippet: null,
        });
        break;
      }
    }
  }
  return hits;
}

// Searches page titles and block content, optionally scoped to one
// section (category) and/or one specific page. Page-scoped search returns
// one hit per matching block (with a snippet) so the caller can list every
// match within that page; broader searches collapse to one hit per page.
// Also searches medications by name, when the scope allows it (see the
// section_type check below -- a medications-type section's "category
// scope" naturally means searching drug names instead of pages/blocks,
// since that section doesn't use the page builder at all).
export async function searchContent(
  supabase: SupabaseClient,
  params: { query: string; sectionSlug?: string; pageSlug?: string }
): Promise<SearchHit[]> {
  const query = params.query.trim();
  if (query.length < 2) return [];

  let scopedSection: SectionRow | undefined;
  if (params.sectionSlug) {
    const { data } = await supabase
      .from("sections")
      .select("id, slug, name_he, section_type")
      .eq("slug", params.sectionSlug)
      .single();
    if (!data) return [];
    scopedSection = data as SectionRow;
  }

  const sectionId = scopedSection?.id;

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

  // Medication hits: included for a global search (using whichever
  // medications-type section exists) or when scoped to a medications-type
  // section specifically. Not included when scoped to a specific page
  // (page-scope only makes sense for the generic page builder).
  let medicationHits: SearchHit[] = [];
  if (!params.pageSlug) {
    let medicationSection = scopedSection;
    if (!medicationSection) {
      const { data } = await supabase
        .from("sections")
        .select("id, slug, name_he, section_type")
        .eq("section_type", "medications")
        .limit(1)
        .maybeSingle();
      medicationSection = (data as SectionRow | null) ?? undefined;
    }
    if (medicationSection && medicationSection.section_type === "medications") {
      medicationHits = await searchMedications(supabase, query, medicationSection);
    }
  }

  // A medications-type section has no pages/blocks to search -- stop here
  // rather than running pointless queries against an empty set.
  if (scopedSection?.section_type === "medications") {
    return medicationHits;
  }

  let candidatePageIds: string[] | undefined;
  if (sectionId && !pageId) {
    const { data } = await supabase.from("pages").select("id").eq("section_id", sectionId);
    candidatePageIds = ((data ?? []) as Pick<PageRow, "id">[]).map((p) => p.id);
    if (candidatePageIds.length === 0) return medicationHits;
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
  if (pageIdsNeeded.size === 0) return medicationHits;

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
  const sectionsById = new Map<string, { id: string; slug: string; name_he: string }>(
    ((sectionsData ?? []) as { id: string; slug: string; name_he: string }[]).map((s) => [s.id, s])
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
      medicationId: null,
      snippet,
    });
  }

  for (const p of titleMatches) {
    addHit(p.id, null, null);
  }
  for (const b of blockMatches) {
    const snippet = isDataTableContent(b.content)
      ? dataTableSnippet(b.content, query) ?? snippetFromContent(b.content, query)
      : snippetFromContent(b.content, query);
    addHit(b.page_id, pageId ? b.id : null, snippet);
  }

  return [...medicationHits, ...Array.from(hits.values())];
}
