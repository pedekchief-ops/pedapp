import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getPageWithBlocks, getSectionBySlug } from "@/lib/data";
import { blockNodesToDrafts } from "@/lib/editor/blockDraft";
import { PageEditor } from "@/components/editor/PageEditor";

export default async function EditPagePage({
  params,
}: {
  params: Promise<{ sectionSlug: string; pageSlug: string }>;
}) {
  const { sectionSlug, pageSlug } = await params;
  const supabase = await createClient();

  const section = await getSectionBySlug(supabase, sectionSlug);
  if (!section) notFound();

  const page = await getPageWithBlocks(supabase, sectionSlug, pageSlug);
  if (!page) notFound();

  return (
    <PageEditor
      pageId={page.id}
      sectionSlug={section.slug}
      sectionNameHe={section.name_he}
      initialTitleHe={page.title_he}
      initialTitleEn={page.title_en}
      initialSlug={page.slug}
      initialBlocks={blockNodesToDrafts(page.blocks)}
    />
  );
}
