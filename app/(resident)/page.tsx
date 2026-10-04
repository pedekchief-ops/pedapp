import { createClient } from "@/lib/supabase/server";
import { getSections } from "@/lib/data";
import { SectionCard } from "@/components/nav/SectionCard";
import { HomeSearchBar } from "@/components/search/HomeSearchBar";

export default async function HomePage() {
  const supabase = await createClient();
  const sections = await getSections(supabase);

  return (
    <div className="mx-auto max-w-2xl p-4">
      <HomeSearchBar sections={sections} />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {sections.map((section) => (
          <SectionCard key={section.id} section={section} />
        ))}
      </div>
    </div>
  );
}
