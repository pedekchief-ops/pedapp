import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// JSON endpoint backing HandoffBoardLoader -- fetched client-side (same
// reasoning as /api/medications) so saves/clears/adds elsewhere can just
// trigger a re-fetch instead of each action needing its own cache
// invalidation (see lib/actions/handoff.ts's file header).
export async function GET() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("handoff_patients")
    .select("*")
    .order("ward", { ascending: true })
    .order("order_index", { ascending: true });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ patients: data ?? [] });
}
