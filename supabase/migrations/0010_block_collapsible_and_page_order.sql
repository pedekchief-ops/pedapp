-- ============================================================================
-- 0010_block_collapsible_and_page_order.sql
--
-- Two independent admin-configurability additions:
--
-- 1. Per-block collapse/expand default (components/blocks/BlockRenderer.tsx,
--    components/editor/BlockList.tsx). Any block on any page can now be
--    marked as collapsible with a chosen default state -- e.g. a data_table
--    block open by default, a pdf block collapsed by default on a page with
--    several PDFs.
--      collapsible        -- if false, the block always renders in full
--                             (existing behavior, and the default for every
--                             existing block).
--      default_collapsed  -- only meaningful when collapsible is true:
--                             whether it starts closed.
--      collapsible_label  -- text shown next to the toggle; null falls back
--                             to a per-block-type default computed in
--                             BlockRenderer.tsx (e.g. a pdf block's own
--                             title).
--
-- 2. Reordering pages within a section (see PagesListWithSelection.tsx's
--    new up/down controls, lib/actions/admin.ts's movePage). pages.order_index
--    already existed but createPage never set it explicitly, so most
--    existing pages share the column's default value -- the backfill below
--    gives every section's pages distinct, stable order_index values (by
--    creation order) so the new controls have something meaningful to swap.
-- ============================================================================

alter table public.blocks add column collapsible boolean not null default false;
alter table public.blocks add column default_collapsed boolean not null default false;
alter table public.blocks add column collapsible_label text;

with ranked as (
  select id, row_number() over (partition by section_id order by order_index, created_at) - 1 as rn
  from public.pages
)
update public.pages p
set order_index = ranked.rn
from ranked
where p.id = ranked.id;
