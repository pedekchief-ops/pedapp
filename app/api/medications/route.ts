import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getMedicationCategories, getMedicationFields, getMedicationsWithCategories } from "@/lib/medications";

// JSON endpoint backing the resident-facing medications browser (see
// components/medications/MedicationsBrowserLoader.tsx). Fetched
// client-side rather than server-rendered directly for the same reason as
// /api/pages/[..]/[..] -- it's what lets the Serwist service worker
// intercept and cache the request for offline use (Medications defaults
// to is_offline_critical, see supabase/migrations/0002_seed_sections.sql).
export async function GET() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const [fields, categories, medications] = await Promise.all([
    getMedicationFields(supabase),
    getMedicationCategories(supabase),
    getMedicationsWithCategories(supabase),
  ]);

  return NextResponse.json({ fields, categories, medications });
}
