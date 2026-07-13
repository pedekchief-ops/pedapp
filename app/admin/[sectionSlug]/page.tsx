import { notFound } from "next/navigation";
import { Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getPagesForSection, getSectionBySlug, getSections } from "@/lib/data";
import { createPage } from "@/lib/actions/admin";
import { PagesListWithSelection } from "@/components/admin/PagesListWithSelection";

export default async function AdminSectionPage({
  params,
}: {
  params: Promise<{ sectionSlug: string }>;
}) {
  const { sectionSlug } = await params;
  const supabase = await createClient();

  const section = await getSectionBySlug(supabase, sectionSlug);
  if (!section) notFound();

  const [pages, allSections] = await Promise.all([
    getPagesForSection(supabase, section.id),
    getSections(supabase),
  ]);
  const createPageForSection = createPage.bind(null, section.id, section.slug);

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-lg font-semibold text-neutral-900 dark:text-neutral-50">
          {section.name_he}
        </h1>
        <form action={createPageForSection}>
          <button
            type="submit"
            className="flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:opacity-90"
          >
            <Plus size={16} />
            עמוד חדש
          </button>
        </form>
      </div>

      <PagesListWithSelection
        pages={pages}
        section={section}
        otherSections={allSections.filter((s) => s.id !== section.id)}
      />
    </div>
  );
}
