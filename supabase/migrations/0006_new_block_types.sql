-- ============================================================================
-- 0006_new_block_types.sql
--
-- Adds two new block types to the existing `blocks.type` check constraint:
--   link_button  -> a labeled button that opens an external URL
--                   { "label_he": "...", "label_en": "...", "url": "..." }
--   data_table   -> a configurable table (admin-defined columns, rows
--                   grouped into categories/subcategories), used first for
--                   a medications table but usable on any page
--                   { "columns": [{ "key", "label_he", "label_en" }, ...],
--                     "categories": [{ "key", "name_he", "name_en",
--                       "rows": [{ "key", "values": { columnKey: text } }],
--                       "subcategories": [{ "key", "name_he", "name_en",
--                         "rows": [...] }] }] }
--
-- The original constraint was declared inline without an explicit name, so
-- rather than assume Postgres's auto-generated name, this finds whichever
-- check constraint on blocks.type currently mentions 'rich_text' and drops
-- that one before adding the replacement.
-- ============================================================================

do $$
declare
  r record;
begin
  for r in
    select conname from pg_constraint
    where conrelid = 'public.blocks'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%rich_text%'
  loop
    execute format('alter table public.blocks drop constraint %I', r.conname);
  end loop;
end $$;

alter table public.blocks add constraint blocks_type_check
  check (type in ('rich_text', 'pdf', 'image', 'tabs_container', 'link_button', 'data_table'));
