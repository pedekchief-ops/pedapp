"use server";

import { createClient } from "@/lib/supabase/server";
import type { HandoffWard } from "@/lib/supabase/types";

// Unlike every other write path in the app, these aren't admin-gated --
// Row Level Security (supabase/migrations/0015_handoff_board.sql) grants
// any signed-in resident read+write on handoff_patients, since the whole
// point of the board is that the team on shift updates it directly. No
// revalidatePath here: this data is only ever read client-side (see
// app/api/handoff/route.ts), so HandoffBoardLoader just re-fetches after
// each write, same pattern as MedicationsBrowserLoader.

const PATIENT_FIELDS = {
  patient_name: "",
  age: "",
  background: "",
  active_issue: "",
  medications: "",
  evening_tasks: "",
  evening_exam: false,
  morning_labs: false,
} as const;

// Saves one row's editable fields -- called only from "שמור מטופל", never
// on every keystroke (see HandoffRow.tsx's local draft state), so an
// admin typing a long note doesn't hammer the database.
export async function saveHandoffPatientRow(params: {
  id: string;
  location: string;
  patient_name: string;
  age: string;
  background: string;
  active_issue: string;
  medications: string;
  evening_tasks: string;
  evening_exam: boolean;
  morning_labs: boolean;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("not authenticated");

  const { id, ...fields } = params;
  const { error } = await supabase
    .from("handoff_patients")
    .update({ ...fields, updated_by: user.id, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

// A new row in one of the two free-form wards ("satellites"/"annex") --
// the fixed-bed wards never get new rows, their rooms are seeded once by
// the migration.
export async function addHandoffPatientRow(ward: Extract<HandoffWard, "satellites" | "annex">) {
  const supabase = await createClient();
  const { data: existing, error: existingError } = await supabase
    .from("handoff_patients")
    .select("order_index")
    .eq("ward", ward)
    .order("order_index", { ascending: false })
    .limit(1);
  if (existingError) throw existingError;
  const nextOrder = (existing?.[0]?.order_index ?? -1) + 1;

  const { error } = await supabase
    .from("handoff_patients")
    .insert({ ward, is_fixed: false, order_index: nextOrder, ...PATIENT_FIELDS, location: "" });
  if (error) throw error;
}

// "מחק שורה": a fixed bed can't actually disappear from the table, so this
// just clears the patient out of it (location/room number stays); a
// free-form row has nothing permanent about it, so it's removed outright.
export async function clearOrDeleteHandoffPatientRow(id: string) {
  const supabase = await createClient();
  const { data: row, error: fetchError } = await supabase
    .from("handoff_patients")
    .select("is_fixed")
    .eq("id", id)
    .single();
  if (fetchError) throw fetchError;

  if (row.is_fixed) {
    const { error } = await supabase.from("handoff_patients").update(PATIENT_FIELDS).eq("id", id);
    if (error) throw error;
  } else {
    const { error } = await supabase.from("handoff_patients").delete().eq("id", id);
    if (error) throw error;
  }
}
