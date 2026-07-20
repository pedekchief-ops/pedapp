import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  Medication,
  MedicationCategory,
  MedicationField,
  MedicationFieldValue,
  MedicationNumberRangeValue,
  MedicationWithCategories,
} from "@/lib/supabase/types";

export async function getMedicationFields(supabase: SupabaseClient): Promise<MedicationField[]> {
  const { data, error } = await supabase
    .from("medication_fields")
    .select("*")
    .order("order_index", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function getMedicationCategories(supabase: SupabaseClient): Promise<MedicationCategory[]> {
  const { data, error } = await supabase
    .from("medication_categories")
    .select("*")
    .order("order_index", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

// Loads every medication and every category link in two queries and joins
// them in memory, rather than filtering per-category on the server -- the
// resident browser needs the full set anyway (it switches category tabs
// client-side, same pattern as components/blocks/TabsBlock.tsx), and drug
// counts here are small enough that this is simpler than N+1 queries.
export async function getMedicationsWithCategories(
  supabase: SupabaseClient
): Promise<MedicationWithCategories[]> {
  const [{ data: medications, error: medError }, { data: links, error: linksError }] = await Promise.all([
    supabase.from("medications").select("*"),
    supabase.from("medication_category_links").select("medication_id, category_id"),
  ]);
  if (medError) throw medError;
  if (linksError) throw linksError;

  const categoryIdsByMedication = new Map<string, string[]>();
  for (const link of (links ?? []) as { medication_id: string; category_id: string }[]) {
    const list = categoryIdsByMedication.get(link.medication_id) ?? [];
    list.push(link.category_id);
    categoryIdsByMedication.set(link.medication_id, list);
  }

  return ((medications ?? []) as Medication[]).map((m) => ({
    ...m,
    categoryIds: categoryIdsByMedication.get(m.id) ?? [],
  }));
}

// Renders one field's value as display text, appending a unit suffix
// pulled from another field when the field declares `unit_field_key` (see
// supabase/migrations/0008_medications.sql for why -- it's what turns a
// bare "15-20" into "15-20 מ״ג" without hardcoding field names anywhere).
export function formatMedicationFieldValue(
  field: MedicationField,
  values: Record<string, MedicationFieldValue>
): string {
  const value = values[field.key];
  if (value === null || value === undefined || value === "") return "";
  if (Array.isArray(value) && value.length === 0) return "";

  let text: string;
  if (Array.isArray(value)) {
    text = value.join(", ");
  } else if (field.field_type === "number_range") {
    const range = value as MedicationNumberRangeValue;
    if (range.min == null && range.max == null) return "";
    text =
      range.max == null || range.max === range.min
        ? String(range.min ?? range.max)
        : `${range.min ?? ""}–${range.max}`;
  } else {
    text = String(value);
  }

  if (field.unit_field_key) {
    const unitValue = values[field.unit_field_key];
    if (typeof unitValue === "string" && unitValue) {
      text = `${text} ${unitValue}`;
    }
  }

  return text;
}

// The drug's headline text (the one field flagged is_title) -- pulled out
// as a helper since several components need exactly this.
export function getMedicationTitle(
  fields: MedicationField[],
  values: Record<string, MedicationFieldValue>
): string {
  const titleField = fields.find((f) => f.is_title);
  if (!titleField) return "";
  const value = values[titleField.key];
  return typeof value === "string" ? value : "";
}

// Every value from fields flagged is_searchable_name (generic name, trade
// name by default) -- used both by site-wide search (lib/search.ts) and
// the admin medications list's own search box.
export function getMedicationSearchTexts(
  fields: MedicationField[],
  values: Record<string, MedicationFieldValue>
): string[] {
  return fields
    .filter((f) => f.is_searchable_name)
    .map((f) => values[f.key])
    .filter((v): v is string => typeof v === "string" && v.length > 0);
}
