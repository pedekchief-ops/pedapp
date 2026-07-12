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

export async function toggleSectionOfflineCritical(sectionId: string, value: boolean) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("sections")
    .update({ is_offline_critical: value })
    .eq("id", sectionId);
  if (error) throw error;
  revalidatePath("/admin");
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
