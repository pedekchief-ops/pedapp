import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getMedicationCategories, getMedicationFields, getMedicationsWithCategories } from "@/lib/medications";
import { getProfile } from "@/lib/data";

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

  const [fields, categories, medications, profile, sectionResult] = await Promise.all([
    getMedicationFields(supabase),
    getMedicationCategories(supabase),
    getMedicationsWithCategories(supabase),
    getProfile(supabase, user.id),
    // Medications aren't scoped to a section in the schema (exactly one
    // shared list, see lib/search.ts's searchMedications for the same
    // lookup) -- needed here only so an admin editing inline from the
    // resident view can call saveMedication(sectionSlug, ...), which wants
    // it purely for cache revalidation.
    supabase.from("sections").select("slug").eq("section_type", "medications").limit(1).maybeSingle(),
  ]);

  return NextResponse.json({
    fields,
    categories,
    medications,
    isAdmin: profile?.role === "admin",
    sectionSlug: sectionResult.data?.slug ?? null,
  });
}
