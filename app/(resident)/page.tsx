import { createClient } from "@/lib/supabase/server";
import { getSections } from "@/lib/data";
import { SectionCard } from "@/components/nav/SectionCard";

export default async function HomePage() {
  const supabase = await createClient();
  const sections = await getSections(supabase);

  return (
    <div className="mx-auto grid max-w-2xl grid-cols-2 gap-3 p-4 sm:grid-cols-3">
      {sections.map((section) => (
        <SectionCard key={section.id} section={section} />
      ))}
    </div>
  );
}
