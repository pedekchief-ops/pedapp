import Link from "next/link";
import {
  Info,
  Pill,
  GraduationCap,
  Siren,
  Baby,
  HeartPulse,
  Droplet,
  Bone,
  Folder,
  type LucideIcon,
} from "lucide-react";
import type { Section } from "@/lib/supabase/types";

// Maps the `icon` string stored on each section row (see
// supabase/migrations/0002_seed_sections.sql) to an actual lucide-react
// component. Falls back to a generic folder icon for any section created
// later from the admin CMS with an icon name we don't recognize yet.
const ICONS: Record<string, LucideIcon> = {
  info: Info,
  pill: Pill,
  "graduation-cap": GraduationCap,
  siren: Siren,
  baby: Baby,
  "heart-pulse": HeartPulse,
  droplet: Droplet,
  bone: Bone,
};

export function SectionCard({ section }: { section: Section }) {
  const Icon = ICONS[section.icon] ?? Folder;

  return (
    <Link
      href={`/${section.slug}`}
      className="flex flex-col items-center gap-2 rounded-2xl border border-neutral-200 bg-white p-4 text-center shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-neutral-800 dark:bg-neutral-900"
    >
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
        <Icon size={22} />
      </span>
      <span className="text-sm font-medium text-neutral-900 dark:text-neutral-50">
        {section.name_he}
      </span>
      <span className="text-xs text-neutral-500 dark:text-neutral-400" dir="ltr">
        {section.name_en}
      </span>
    </Link>
  );
}
