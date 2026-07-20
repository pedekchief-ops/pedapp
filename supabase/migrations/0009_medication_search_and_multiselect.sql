-- ============================================================================
-- 0009_medication_search_and_multiselect.sql
--
-- Two additions to medication_fields:
--   is_searchable_name -- flags a text field (generic name, trade name) as
--                          something the site-wide search should match
--                          drugs on, and the admin medications list search
--                          box filters by. Deliberately narrower than "all
--                          text fields" so searching doesn't match against
--                          free-text notes/route.
--   multiple            -- for 'select' fields, allows choosing more than
--                          one option instead of exactly one. When true,
--                          the value stored at medications.values[key] is
--                          a string[] instead of a plain string.
-- ============================================================================

alter table public.medication_fields add column is_searchable_name boolean not null default false;
alter table public.medication_fields add column multiple boolean not null default false;

update public.medication_fields set is_searchable_name = true where key in ('generic_name', 'trade_name');
