-- ============================================================================
-- 0013_medication_visibility.sql
--
-- Lets a drug, or a whole category, be hidden from residents while a
-- clinical pharmacist reviews/approves medication content -- a hidden drug
-- (its own is_hidden, or its category's) is stripped out of
-- /api/medications before it ever reaches a non-admin browser, and
-- excluded from site search entirely (lib/search.ts's searchMedications).
-- An admin still sees everything (marked visually) so they can find and
-- un-hide what's been reviewed -- see MedicationForm.tsx / CategoryManager.tsx.
--
-- Defaults to false (visible) for every existing row -- this does not hide
-- any currently-published medication; hiding is an explicit, per-item
-- choice going forward.
-- ============================================================================

alter table public.medications add column is_hidden boolean not null default false;
alter table public.medication_categories add column is_hidden boolean not null default false;
