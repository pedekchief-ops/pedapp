import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { searchContent } from "@/lib/search";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q") ?? "";
  const sectionSlug = searchParams.get("section") ?? undefined;
  const pageSlug = searchParams.get("page") ?? undefined;

  const supabase = await createClient();
  const hits = await searchContent(supabase, { query: q, sectionSlug, pageSlug });

  return NextResponse.json({ hits });
}
