import { NextResponse } from "next/server";
import { getPublicUrl } from "@/lib/supabase/storage";

// Same-origin proxy for a PDF stored in Supabase Storage. Exists purely
// because the self-hosted pdf.js viewer (public/pdfjs-viewer/, see
// components/blocks/PdfBlock.tsx) refuses to load a file whose origin
// doesn't match the viewer's own origin -- a deliberate security check in
// pdf.js itself (prevents it being used as an open content proxy when
// embedded on third-party sites), not something we can configure around.
// Routing the request through our own domain satisfies that check while
// still just streaming bytes straight from Storage.
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  const storagePath = path.join("/");
  const upstreamUrl = getPublicUrl("pdfs", storagePath);

  const upstream = await fetch(upstreamUrl);
  if (!upstream.ok || !upstream.body) {
    return NextResponse.json({ error: "not found" }, { status: upstream.status || 404 });
  }

  return new NextResponse(upstream.body, {
    status: 200,
    headers: {
      "Content-Type": upstream.headers.get("content-type") ?? "application/pdf",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
