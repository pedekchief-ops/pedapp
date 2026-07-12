import Link from "next/link";
import { notFound } from "next/navigation";
import { Plus, Pencil } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getPagesForSection, getSectionBySlug } from "@/lib/data";
import { createPage } from "@/lib/actions/admin";
import { DeletePageButton } from "@/components/admin/DeletePageButton";

export default async function AdminSectionPage({
  params,
}: {
  params: Promise<{ sectionSlug: string }>;
}) {
  const { sectionSlug } = await params;
  const supabase = await createClient();

  const section = await getSectionBySlug(supabase, sectionSlug);
  if (!section) notFound();

  const pages = await getPagesForSection(supabase, section.id);
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

      {pages.length === 0 ? (
        <p className="text-sm text-neutral-500 dark:text-neutral-400">אין עדיין עמודים.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {pages.map((page) => (
            <li
              key={page.id}
              className="flex items-center justify-between rounded-xl border border-neutral-200 bg-white px-4 py-3 dark:border-neutral-800 dark:bg-neutral-900"
            >
              <Link
                href={`/admin/${section.slug}/${page.slug}/edit`}
                className="flex flex-1 items-center gap-2 text-sm font-medium text-neutral-900 dark:text-neutral-50"
              >
                <Pencil size={14} className="text-neutral-400" />
                {page.title_he}
              </Link>
              <DeletePageButton pageId={page.id} sectionSlug={section.slug} pageTitle={page.title_he} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
