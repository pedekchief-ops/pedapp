import Link from "next/link";
import { DEFAULT_SECTION_ICON, SECTION_ICONS } from "@/lib/sectionIcons";
import type { Section } from "@/lib/supabase/types";

export function SectionCard({ section }: { section: Section }) {
  const Icon = SECTION_ICONS[section.icon] ?? DEFAULT_SECTION_ICON;
  // The handoff board is a working clinical tool residents reach for
  // constantly during a shift, not reference material -- a bold, filled
  // card (instead of the usual white card with a tinted icon circle)
  // makes it stand out from the rest of the grid at a glance.
  const isHandoff = section.section_type === "handoff";

  return (
    <Link
      href={`/${section.slug}`}
      className={`flex flex-col items-center gap-2 rounded-2xl border p-4 text-center shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${
        isHandoff
          ? "border-primary bg-primary text-primary-foreground"
          : "border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900"
      }`}
    >
      <span
        className={`flex h-12 w-12 items-center justify-center rounded-full ${
          isHandoff ? "bg-white/15 text-primary-foreground" : "bg-primary/10 text-primary"
        }`}
      >
        <Icon size={22} />
      </span>
      <span
        className={`text-sm font-medium ${
          isHandoff ? "text-primary-foreground" : "text-neutral-900 dark:text-neutral-50"
        }`}
      >
        {section.name_he}
      </span>
      <span
        className={`text-xs ${isHandoff ? "text-primary-foreground/80" : "text-neutral-500 dark:text-neutral-400"}`}
        dir="ltr"
      >
        {section.name_en}
      </span>
    </Link>
  );
}
