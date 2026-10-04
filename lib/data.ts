import type { SupabaseClient } from "@supabase/supabase-js";
import { buildBlockTree, resolveLinkedBlocks } from "@/lib/blocks";
import type {
  AppSettings,
  Block,
  Page,
  PageWithBlocks,
  Profile,
  Section,
} from "@/lib/supabase/types";

// Falls back to sensible defaults if the settings row can't be read (e.g.
// migrations not yet applied) so a misconfigured DB never breaks the
// whole app's layout.
const DEFAULT_APP_SETTINGS: AppSettings = {
  id: true,
  logo_storage_path: null,
  primary_color: "#0d9488",
  default_theme: "system",
  updated_by: null,
  updated_at: new Date(0).toISOString(),
};

export async function getAppSettings(supabase: SupabaseClient): Promise<AppSettings> {
  const { data } = await supabase.from("app_settings").select("*").eq("id", true).single();
  return data ?? DEFAULT_APP_SETTINGS;
}

// Shared read helpers used by both the resident-facing pages and the admin
// CMS. Each takes a Supabase client instance rather than creating its own,
// so callers control whether it's the browser client, the per-request
// server client, or (for admin-only actions) the service-role client.

export async function getProfile(
  supabase: SupabaseClient,
  userId: string
): Promise<Profile | null> {
  const { data } = await supabase.from("profiles").select("*").eq("id", userId).single();
  return data;
}

export async function getSections(supabase: SupabaseClient): Promise<Section[]> {
  const { data, error } = await supabase
    .from("sections")
    .select("*")
    .order("order_index", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function getSectionBySlug(
  supabase: SupabaseClient,
  slug: string
): Promise<Section | null> {
  const { data } = await supabase.from("sections").select("*").eq("slug", slug).single();
  return data;
}

export async function getPagesForSection(
  supabase: SupabaseClient,
  sectionId: string
): Promise<Page[]> {
  const { data, error } = await supabase
    .from("pages")
    .select("*")
    .eq("section_id", sectionId)
    .order("order_index", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

// Fetches one page plus its full nested block tree, scoped by section slug
// so two different sections can reuse the same page slug.
//
// `resolveLinks` defaults to false (the raw rows, link copies included
// as-is) because this is shared by the admin editor loader, which needs
// to see a copy's source_stable_id to render it as a linked, read-only
// card -- resolving it away there would make a link look like (and get
// silently re-saved as) an ordinary independent block. Resident-facing
// callers pass `resolveLinks: true` to get the live overlay instead; see
// lib/blocks.ts's resolveLinkedBlocks.
export async function getPageWithBlocks(
  supabase: SupabaseClient,
  sectionSlug: string,
  pageSlug: string,
  opts: { resolveLinks?: boolean } = {}
): Promise<PageWithBlocks | null> {
  const section = await getSectionBySlug(supabase, sectionSlug);
  if (!section) return null;

  const { data: page } = await supabase
    .from("pages")
    .select("*")
    .eq("section_id", section.id)
    .eq("slug", pageSlug)
    .single();
  if (!page) return null;

  const { data: blocks, error: blocksError } = await supabase
    .from("blocks")
    .select("*")
    .eq("page_id", page.id);
  if (blocksError) throw blocksError;

  const resolved = opts.resolveLinks
    ? await resolveLinkedBlocks(supabase, (blocks as Block[]) ?? [])
    : ((blocks as Block[]) ?? []);

  return { ...page, blocks: buildBlockTree(resolved) };
}
