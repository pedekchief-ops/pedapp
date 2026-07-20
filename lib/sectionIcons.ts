import {
  Info,
  Pill,
  GraduationCap,
  Siren,
  Baby,
  HeartPulse,
  Droplet,
  Bone,
  FlaskConical,
  Microscope,
  Stethoscope,
  ClipboardList,
  BookOpen,
  Brain,
  Syringe,
  Activity,
  Thermometer,
  Shield,
  Folder,
  type LucideIcon,
} from "lucide-react";

// Maps the `icon` string stored on each section row to an actual
// lucide-react component. Shared between the resident-facing SectionCard
// and the admin icon picker (components/admin/SectionsManager.tsx) so both
// always agree on what a given icon key looks like. Falls back to a
// generic folder icon for any icon key not in this list (e.g. if the DB
// was seeded before an icon was added here).
export const SECTION_ICONS: Record<string, LucideIcon> = {
  info: Info,
  pill: Pill,
  "graduation-cap": GraduationCap,
  siren: Siren,
  baby: Baby,
  "heart-pulse": HeartPulse,
  droplet: Droplet,
  bone: Bone,
  "flask-conical": FlaskConical,
  microscope: Microscope,
  stethoscope: Stethoscope,
  "clipboard-list": ClipboardList,
  "book-open": BookOpen,
  brain: Brain,
  syringe: Syringe,
  activity: Activity,
  thermometer: Thermometer,
  shield: Shield,
  folder: Folder,
};

export const SECTION_ICON_KEYS = Object.keys(SECTION_ICONS);

// Deliberately not wrapped in a lookup function: the
// react-hooks/static-components lint rule flags `const Icon =
// someFunction(key)` (it can't verify the function always returns a
// stable reference) but not a direct map index, so callers should write
// `SECTION_ICONS[key] ?? Folder` inline instead of importing a helper.
export { Folder as DEFAULT_SECTION_ICON };
