import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getPagesForSection, getSectionBySlug } from "@/lib/data";
import { MedicationsBrowserLoader } from "@/components/medications/MedicationsBrowserLoader";

export default async function SectionPage({
  params,
}: {
  params: Promise<{ sectionSlug: string }>;
}) {
  const { sectionSlug } = await params;
  const supabase = await createClient();

  const section = await getSectionBySlug(supabase, sectionSlug);
  if (!section) notFound();

  // 'medications' sections get a dedicated structured browser instead of
  // the generic pages list -- see supabase/migrations/0008_medications.sql.
  // Fetched client-side (MedicationsBrowserLoader -> /api/medications) so
  // the offline service worker can cache it, matching how the generic page
  // view works (app/(resident)/[sectionSlug]/[pageSlug]/page.tsx).
  if (section.section_type === "medications") {
    return <MedicationsBrowserLoader />;
  }

  const pages = await getPagesForSection(supabase, section.id);

  return (
    <div className="mx-auto max-w-2xl p-4">
      <h1 className="mb-4 text-lg font-semibold text-neutral-900 dark:text-neutral-50">
        {section.name_he}
      </h1>

      {pages.length === 0 ? (
        <p className="text-sm text-neutral-500 dark:text-neutral-400">
          אין עדיין תוכן בקטגוריה זו.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {pages.map((page) => (
            <li key={page.id}>
              <Link
                href={`/${section.slug}/${page.slug}`}
                className="block rounded-xl border border-neutral-200 px-4 py-3 text-sm font-medium text-neutral-800 hover:bg-neutral-50 dark:border-neutral-800 dark:text-neutral-100 dark:hover:bg-neutral-900"
              >
                {page.title_he}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
