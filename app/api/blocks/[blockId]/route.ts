import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { resolveLinkedBlocks } from "@/lib/blocks";
import type { Block } from "@/lib/supabase/types";

// Minimal endpoint backing the inline search-result preview (see
// components/search/SearchOverlay.tsx): fetches just the one matched
// block's type/content on demand when a result is expanded, rather than
// having the search response itself carry full block content for every
// hit (most of which never get previewed).
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ blockId: string }> }
) {
  const { blockId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { data: block, error } = await supabase.from("blocks").select("*").eq("id", blockId).single();
  if (error || !block) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const [resolved] = await resolveLinkedBlocks(supabase, [block as Block]);
  return NextResponse.json(resolved);
}
