-- ============================================================================
-- 0011_section_landing_page.sql
--
-- Lets one page per section be marked as that section's "landing content"
-- (see app/(resident)/[sectionSlug]/page.tsx): its blocks (files, images,
-- tables, links, ...) render directly on the section's own root page --
-- e.g. entering "פגייה" -- instead of every section root always being just
-- a flat list of links to sub-pages that each need an extra click.
--
-- Exactly one page per section can have is_landing = true, enforced at the
-- application level (see setSectionLandingPage in lib/actions/admin.ts,
-- same pattern as medication_fields.is_title's setTitleMedicationField --
-- clear every other page in the section first, then set the new one)
-- rather than a DB constraint, for consistency with that existing pattern.
-- ============================================================================

alter table public.pages add column is_landing boolean not null default false;
