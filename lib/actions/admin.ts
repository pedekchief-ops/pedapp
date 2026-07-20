"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { notifyResidentsOfPageUpdate } from "@/lib/push/send";
import type { Block, BlockDraft } from "@/lib/supabase/types";

// All writes below go through the per-request client (createClient), which
// carries the calling admin's own session cookies. That's deliberate: Row
// Level Security's "admin write" policies (see 0001_init_schema.sql) are
// the actual authorization check, not application code -- if someone's
// session isn't an admin, these calls fail at the database regardless of
// what this file does.

export async function createPage(sectionId: string, sectionSlug: string) {
  const supabase = await createClient();
  const slug = `page-${Date.now().toString(36)}`;

  const { data: page, error } = await supabase
    .from("pages")
    .insert({ section_id: sectionId, slug, title_he: "עמוד חדש", title_en: null })
    .select()
    .single();
  if (error) throw error;

  revalidatePath(`/admin/${sectionSlug}`);
  redirect(`/admin/${sectionSlug}/${page.slug}/edit`);
}

export async function deletePage(pageId: string, sectionSlug: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("pages").delete().eq("id", pageId);
  if (error) throw error;
  revalidatePath(`/admin/${sectionSlug}`);
}

export async function bulkDeletePages(pageIds: string[], sectionSlug: string) {
  if (pageIds.length === 0) return;
  const supabase = await createClient();
  const { error } = await supabase.from("pages").delete().in("id", pageIds);
  if (error) throw error;
  revalidatePath(`/admin/${sectionSlug}`);
}

// Moves a batch of pages to a different section. Pages are unique on
// (section_id, slug) (see 0001_init_schema.sql), so a page whose slug
// already exists in the destination gets a short suffix appended rather
// than failing the whole batch over one collision.
export async function movePagesToSection(
  pageIds: string[],
  targetSectionId: string,
  currentSectionSlug: string,
  targetSectionSlug: string
) {
  if (pageIds.length === 0) return;
  const supabase = await createClient();

  const { data: existing, error: fetchError } = await supabase
    .from("pages")
    .select("id, slug")
    .in("id", pageIds);
  if (fetchError) throw fetchError;

  const { data: destinationPages, error: destError } = await supabase
    .from("pages")
    .select("slug")
    .eq("section_id", targetSectionId);
  if (destError) throw destError;
  const takenSlugs = new Set((destinationPages ?? []).map((p) => p.slug));

  for (const page of existing ?? []) {
    const slug = takenSlugs.has(page.slug) ? `${page.slug}-${Date.now().toString(36)}` : page.slug;
    takenSlugs.add(slug);
    const { error } = await supabase
      .from("pages")
      .update({ section_id: targetSectionId, slug })
      .eq("id", page.id);
    if (error) throw error;
  }

  revalidatePath(`/admin/${currentSectionSlug}`);
  revalidatePath(`/admin/${targetSectionSlug}`);
}

export async function toggleSectionOfflineCritical(sectionId: string, value: boolean) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("sections")
    .update({ is_offline_critical: value })
    .eq("id", sectionId);
  if (error) throw error;
  revalidatePath("/admin");
}

// Adding/removing/renaming/reordering top-level nav sections (e.g. "מח
// עצם" -> "בדיקות ומעבדות"). The slug is auto-generated (never shown to
// the admin at creation time, same as createPage's page slugs) since it's
// only a URL segment; SectionsManager.tsx still lets it be renamed
// afterward alongside the display name.
export async function createSection(params: {
  name_he: string;
  name_en: string;
  icon: string;
  section_type: "generic" | "medications";
}) {
  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("sections")
    .select("order_index")
    .order("order_index", { ascending: false })
    .limit(1);
  const nextOrder = (existing?.[0]?.order_index ?? 0) + 1;

  const { error } = await supabase.from("sections").insert({
    slug: `section-${Date.now().toString(36)}`,
    name_he: params.name_he,
    name_en: params.name_en,
    icon: params.icon,
    section_type: params.section_type,
    order_index: nextOrder,
  });
  if (error) throw error;
  revalidatePath("/admin");
  revalidatePath("/");
}

export async function updateSection(
  sectionId: string,
  params: Partial<{ slug: string; name_he: string; name_en: string; icon: string }>
) {
  const supabase = await createClient();
  const { error } = await supabase.from("sections").update(params).eq("id", sectionId);
  if (error) throw error;
  revalidatePath("/admin");
  revalidatePath("/");
}

export async function deleteSection(sectionId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("sections").delete().eq("id", sectionId);
  if (error) throw error;
  revalidatePath("/admin");
  revalidatePath("/");
}

export async function moveSection(sectionId: string, direction: -1 | 1) {
  const supabase = await createClient();
  const { data: sections, error } = await supabase
    .from("sections")
    .select("id, order_index")
    .order("order_index", { ascending: true });
  if (error) throw error;

  const index = (sections ?? []).findIndex((s: { id: string }) => s.id === sectionId);
  const targetIndex = index + direction;
  if (index === -1 || targetIndex < 0 || targetIndex >= (sections ?? []).length) return;

  const a = sections![index];
  const b = sections![targetIndex];
  await Promise.all([
    supabase.from("sections").update({ order_index: b.order_index }).eq("id", a.id),
    supabase.from("sections").update({ order_index: a.order_index }).eq("id", b.id),
  ]);
  revalidatePath("/admin");
  revalidatePath("/");
}

// Updates the single app_settings row (see
// supabase/migrations/0005_app_settings.sql). `logoStoragePath` is already
// uploaded to Storage by the time this runs (components/admin/SettingsForm.tsx
// uploads directly from the browser, same pattern as FileUploader) -- this
// action just persists the resulting path plus the color/theme fields.
// revalidatePath(..., "layout") is what's needed here specifically: the
// root layout (app/layout.tsx) reads these settings on every request, so
// every route under it must be invalidated, not just one path.
export async function updateAppSettings(params: {
  logoStoragePath: string | null;
  primaryColor: string;
  defaultTheme: "light" | "dark" | "system";
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("not authenticated");

  const { error } = await supabase
    .from("app_settings")
    .update({
      logo_storage_path: params.logoStoragePath,
      primary_color: params.primaryColor,
      default_theme: params.defaultTheme,
      updated_by: user.id,
      updated_at: new Date().toISOString(),
    })
    .eq("id", true);
  if (error) throw error;

  revalidatePath("/", "layout");
}

// Flattens the editor's local block-draft tree into rows ready to insert,
// assigning every block a fresh id (the whole tree is replaced wholesale on
// each publish -- see the file header of supabase/migrations/0001_init_schema.sql
// for why blocks are rows rather than one JSON blob, which is still true
// even though the *write* path here is replace-all for simplicity).
function flattenDrafts(
  drafts: BlockDraft[],
  pageId: string,
  parentId: string | null
): Omit<Block, "created_at" | "updated_at">[] {
  return drafts.flatMap((draft, index) => {
    const id = randomUUID();
    const row = {
      id,
      page_id: pageId,
      parent_block_id: parentId,
      tab_key: draft.tab_key ?? null,
      type: draft.type,
      order_index: index,
      content: draft.content,
    };
    return [row, ...flattenDrafts(draft.children, pageId, id)];
  });
}

export async function publishPage(params: {
  pageId: string;
  sectionSlug: string;
  sectionNameHe: string;
  slug: string;
  titleHe: string;
  titleEn: string | null;
  blocks: BlockDraft[];
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("not authenticated");

  const rows = flattenDrafts(params.blocks, params.pageId, null);

  // Replace-all: delete the page's existing blocks, then insert the newly
  // authored tree. Not wrapped in a database transaction (supabase-js
  // doesn't expose multi-statement transactions to the client) -- an
  // interruption between these two calls would leave the page briefly
  // empty rather than corrupt, and publishing is a low-frequency,
  // single-admin-at-a-time action, so this tradeoff is acceptable.
  const { error: deleteError } = await supabase.from("blocks").delete().eq("page_id", params.pageId);
  if (deleteError) throw deleteError;

  if (rows.length > 0) {
    const { error: insertError } = await supabase.from("blocks").insert(rows);
    if (insertError) throw insertError;
  }

  const { error: pageError } = await supabase
    .from("pages")
    .update({
      slug: params.slug,
      title_he: params.titleHe,
      title_en: params.titleEn,
      updated_by: user.id,
      updated_at: new Date().toISOString(),
    })
    .eq("id", params.pageId);
  if (pageError) throw pageError;

  await supabase.from("page_versions").insert({
    page_id: params.pageId,
    editor_id: user.id,
    content_snapshot: rows,
  });

  revalidatePath(`/admin/${params.sectionSlug}`);
  revalidatePath(`/${params.sectionSlug}/${params.slug}`);

  // Best-effort: a resident missing an update notification is not worth
  // failing the publish action over.
  try {
    await notifyResidentsOfPageUpdate({
      sectionNameHe: params.sectionNameHe,
      pageTitleHe: params.titleHe,
      url: `/${params.sectionSlug}/${params.slug}`,
    });
  } catch {
    // swallow -- see comment above
  }
}
