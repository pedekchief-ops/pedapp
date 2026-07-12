import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getPageWithBlocks } from "@/lib/data";

// JSON endpoint backing the resident page view (see
// app/(resident)/[sectionSlug]/[pageSlug]/page.tsx for why this is a fetch()
// target rather than server-rendered directly). Access control is just
// "must be signed in" -- Row Level Security on the underlying tables
// already restricts writes to admins, and any authenticated resident is
// allowed to read any page.
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ sectionSlug: string; pageSlug: string }> }
) {
  const { sectionSlug, pageSlug } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const page = await getPageWithBlocks(supabase, sectionSlug, pageSlug);
  if (!page) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  let editorName: string | null = null;
  if (page.updated_by) {
    const { data: editor } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", page.updated_by)
      .single();
    editorName = editor?.full_name ?? null;
  }

  return NextResponse.json({ ...page, editorName });
}
