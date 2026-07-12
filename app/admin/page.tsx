import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getSections } from "@/lib/data";
import { OfflineToggle } from "@/components/admin/OfflineToggle";

export default async function AdminHomePage() {
  const supabase = await createClient();
  const sections = await getSections(supabase);

  const { data: pageCounts } = await supabase.from("pages").select("section_id");
  const countBySection = new Map<string, number>();
  for (const row of pageCounts ?? []) {
    countBySection.set(row.section_id, (countBySection.get(row.section_id) ?? 0) + 1);
  }

  return (
    <div>
      <h1 className="mb-1 text-lg font-semibold text-neutral-900 dark:text-neutral-50">
        קטגוריות
      </h1>
      <p className="mb-4 text-sm text-neutral-500 dark:text-neutral-400">
        בחרו קטגוריה כדי לנהל את העמודים שבתוכה.
      </p>
      <ul className="flex flex-col gap-2">
        {sections.map((section) => (
          <li
            key={section.id}
            className="flex items-center justify-between rounded-xl border border-neutral-200 bg-white px-4 py-3 dark:border-neutral-800 dark:bg-neutral-900"
          >
            <Link href={`/admin/${section.slug}`} className="flex-1">
              <span className="block text-sm font-medium text-neutral-900 dark:text-neutral-50">
                {section.name_he}
              </span>
              <span className="text-xs text-neutral-500 dark:text-neutral-400">
                {countBySection.get(section.id) ?? 0} עמודים
              </span>
            </Link>
            <OfflineToggle sectionId={section.id} initialValue={section.is_offline_critical} />
          </li>
        ))}
      </ul>
    </div>
  );
}
