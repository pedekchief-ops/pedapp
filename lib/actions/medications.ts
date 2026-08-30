"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { MedicationCategory, MedicationFieldType, MedicationFieldValue } from "@/lib/supabase/types";

// Same authorization model as lib/actions/admin.ts: every call uses the
// per-request client carrying the caller's own session, so Row Level
// Security (see supabase/migrations/0008_medications.sql) is the actual
// enforcement, not application code.

function revalidateMedications(sectionSlug: string) {
  revalidatePath(`/${sectionSlug}`);
  revalidatePath(`/admin/${sectionSlug}`);
}

// ---------------------------------------------------------------------------
// Fields (the admin-configurable schema of what's entered per drug)
// ---------------------------------------------------------------------------

export async function createMedicationField(
  sectionSlug: string,
  params: {
    key: string;
    label_he: string;
    field_type: MedicationFieldType;
    options: string[] | null;
    unit_field_key: string | null;
  }
) {
  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("medication_fields")
    .select("order_index")
    .order("order_index", { ascending: false })
    .limit(1);
  const nextOrder = (existing?.[0]?.order_index ?? 0) + 1;

  const { error } = await supabase.from("medication_fields").insert({
    ...params,
    order_index: nextOrder,
  });
  if (error) throw error;
  revalidateMedications(sectionSlug);
}

export async function updateMedicationField(
  sectionSlug: string,
  fieldId: string,
  params: Partial<{
    label_he: string;
    field_type: MedicationFieldType;
    options: string[] | null;
    unit_field_key: string | null;
    show_in_summary: boolean;
    multiple: boolean;
  }>
) {
  const supabase = await createClient();
  const { error } = await supabase.from("medication_fields").update(params).eq("id", fieldId);
  if (error) throw error;
  revalidateMedications(sectionSlug);
}

// Exactly one field is the "title" field shown as each drug's headline --
// setting a new one clears the flag off whichever field had it before.
export async function setTitleMedicationField(sectionSlug: string, fieldId: string) {
  const supabase = await createClient();
  const { error: clearError } = await supabase
    .from("medication_fields")
    .update({ is_title: false })
    .neq("id", fieldId);
  if (clearError) throw clearError;
  const { error } = await supabase.from("medication_fields").update({ is_title: true }).eq("id", fieldId);
  if (error) throw error;
  revalidateMedications(sectionSlug);
}

export async function deleteMedicationField(sectionSlug: string, fieldId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("medication_fields").delete().eq("id", fieldId);
  if (error) throw error;
  revalidateMedications(sectionSlug);
}

export async function moveMedicationField(sectionSlug: string, fieldId: string, direction: -1 | 1) {
  const supabase = await createClient();
  const { data: fields, error } = await supabase
    .from("medication_fields")
    .select("id, order_index")
    .order("order_index", { ascending: true });
  if (error) throw error;

  const index = (fields ?? []).findIndex((f: { id: string }) => f.id === fieldId);
  const targetIndex = index + direction;
  if (index === -1 || targetIndex < 0 || targetIndex >= (fields ?? []).length) return;

  const a = fields![index];
  const b = fields![targetIndex];
  await Promise.all([
    supabase.from("medication_fields").update({ order_index: b.order_index }).eq("id", a.id),
    supabase.from("medication_fields").update({ order_index: a.order_index }).eq("id", b.id),
  ]);
  revalidateMedications(sectionSlug);
}

// ---------------------------------------------------------------------------
// Categories (the tabs shown at the top of the medications browser)
// ---------------------------------------------------------------------------

// Returns the created row (id) so callers that need to immediately link
// something to this category -- e.g. the PDF import review screen, which
// creates a category and attaches newly-imported drugs to it in the same
// action -- don't have to re-fetch the list to find it. Existing callers
// that don't need the id (CategoryManager.tsx) just ignore the return value.
export async function createMedicationCategory(sectionSlug: string, name_he: string) {
  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("medication_categories")
    .select("order_index")
    .order("order_index", { ascending: false })
    .limit(1);
  const nextOrder = (existing?.[0]?.order_index ?? 0) + 1;

  const { data, error } = await supabase
    .from("medication_categories")
    .insert({ name_he, order_index: nextOrder })
    .select()
    .single();
  if (error) throw error;
  revalidateMedications(sectionSlug);
  return data as MedicationCategory;
}

export async function updateMedicationCategory(sectionSlug: string, categoryId: string, name_he: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("medication_categories")
    .update({ name_he })
    .eq("id", categoryId);
  if (error) throw error;
  revalidateMedications(sectionSlug);
}

export async function deleteMedicationCategory(sectionSlug: string, categoryId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("medication_categories").delete().eq("id", categoryId);
  if (error) throw error;
  revalidateMedications(sectionSlug);
}

export async function moveMedicationCategory(sectionSlug: string, categoryId: string, direction: -1 | 1) {
  const supabase = await createClient();
  const { data: categories, error } = await supabase
    .from("medication_categories")
    .select("id, order_index")
    .order("order_index", { ascending: true });
  if (error) throw error;

  const index = (categories ?? []).findIndex((c: { id: string }) => c.id === categoryId);
  const targetIndex = index + direction;
  if (index === -1 || targetIndex < 0 || targetIndex >= (categories ?? []).length) return;

  const a = categories![index];
  const b = categories![targetIndex];
  await Promise.all([
    supabase.from("medication_categories").update({ order_index: b.order_index }).eq("id", a.id),
    supabase.from("medication_categories").update({ order_index: a.order_index }).eq("id", b.id),
  ]);
  revalidateMedications(sectionSlug);
}

// ---------------------------------------------------------------------------
// Medications
// ---------------------------------------------------------------------------

export async function saveMedication(
  sectionSlug: string,
  params: {
    id: string | null; // null -> create
    values: Record<string, MedicationFieldValue>;
    categoryIds: string[];
  }
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("not authenticated");

  let medicationId = params.id;
  if (medicationId) {
    const { error } = await supabase
      .from("medications")
      .update({ values: params.values, updated_by: user.id, updated_at: new Date().toISOString() })
      .eq("id", medicationId);
    if (error) throw error;
  } else {
    const { data, error } = await supabase
      .from("medications")
      .insert({ values: params.values, updated_by: user.id })
      .select()
      .single();
    if (error) throw error;
    medicationId = data.id;
  }

  // Replace-all for category links -- simplest way to reconcile "which
  // categories should this drug now be in" against whatever it had before.
  const { error: deleteLinksError } = await supabase
    .from("medication_category_links")
    .delete()
    .eq("medication_id", medicationId);
  if (deleteLinksError) throw deleteLinksError;

  if (params.categoryIds.length > 0) {
    const { error: insertLinksError } = await supabase.from("medication_category_links").insert(
      params.categoryIds.map((categoryId) => ({ medication_id: medicationId, category_id: categoryId }))
    );
    if (insertLinksError) throw insertLinksError;
  }

  revalidateMedications(sectionSlug);
}

export async function deleteMedication(sectionSlug: string, medicationId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("medications").delete().eq("id", medicationId);
  if (error) throw error;
  revalidateMedications(sectionSlug);
}

export async function bulkDeleteMedications(sectionSlug: string, medicationIds: string[]) {
  if (medicationIds.length === 0) return;
  const supabase = await createClient();
  const { error } = await supabase.from("medications").delete().in("id", medicationIds);
  if (error) throw error;
  revalidateMedications(sectionSlug);
}

export async function bulkSetMedicationCategory(
  sectionSlug: string,
  medicationIds: string[],
  categoryId: string,
  action: "add" | "remove"
) {
  if (medicationIds.length === 0) return;
  const supabase = await createClient();

  if (action === "remove") {
    const { error } = await supabase
      .from("medication_category_links")
      .delete()
      .eq("category_id", categoryId)
      .in("medication_id", medicationIds);
    if (error) throw error;
  } else {
    // Avoid inserting duplicate (medication_id, category_id) pairs for
    // drugs already in this category.
    const { data: existing } = await supabase
      .from("medication_category_links")
      .select("medication_id")
      .eq("category_id", categoryId)
      .in("medication_id", medicationIds);
    const already = new Set((existing ?? []).map((r: { medication_id: string }) => r.medication_id));
    const toInsert = medicationIds.filter((id) => !already.has(id));
    if (toInsert.length > 0) {
      const { error } = await supabase
        .from("medication_category_links")
        .insert(toInsert.map((medication_id) => ({ medication_id, category_id: categoryId })));
      if (error) throw error;
    }
  }

  revalidateMedications(sectionSlug);
}
