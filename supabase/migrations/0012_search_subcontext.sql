-- ============================================================================
-- 0012_search_subcontext.sql
--
-- search_blocks() now also returns tab_key and parent_block_id, so
-- lib/search.ts can tell whether a matching block lives inside a specific
-- tab of a tabs_container (e.g. "זיהומיות" inside "הנחיות קליניות") and
-- show that tab's label alongside the page/section in search results --
-- see SearchHit.subLabel. Return-type change means the function has to be
-- dropped and recreated, not just replaced in place.
-- ============================================================================

drop function if exists public.search_blocks(text, uuid, uuid[]);

create function public.search_blocks(
  search_query text,
  filter_page_id uuid default null,
  filter_page_ids uuid[] default null
)
returns table (id uuid, page_id uuid, content jsonb, tab_key text, parent_block_id uuid)
language sql
stable
security invoker
as $$
  select b.id, b.page_id, b.content, b.tab_key, b.parent_block_id
  from public.blocks b
  where b.content::text ilike '%' || search_query || '%'
    and (filter_page_id is null or b.page_id = filter_page_id)
    and (filter_page_ids is null or b.page_id = any(filter_page_ids))
  limit 50;
$$;

grant execute on function public.search_blocks(text, uuid, uuid[]) to authenticated, anon;
