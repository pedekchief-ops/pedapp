import type { SupabaseClient } from "@supabase/supabase-js";
import { buildBlockTree } from "@/lib/blocks";
import type { Block, Page, PageWithBlocks, Profile, Section } from "@/lib/supabase/types";

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
export async function getPageWithBlocks(
  supabase: SupabaseClient,
  sectionSlug: string,
  pageSlug: string
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

  return { ...page, blocks: buildBlockTree((blocks as Block[]) ?? []) };
}
