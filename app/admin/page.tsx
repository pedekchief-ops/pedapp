import { createClient } from "@/lib/supabase/server";
import { getSections } from "@/lib/data";
import { SectionsManager } from "@/components/admin/SectionsManager";

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
        הוסיפו, ערכו, מחקו או סדרו מחדש את קטגוריות התפריט הראשי. לחצו על שם קטגוריה כדי לנהל את התוכן שבתוכה.
      </p>
      <SectionsManager sections={sections} pageCounts={countBySection} />
    </div>
  );
}
