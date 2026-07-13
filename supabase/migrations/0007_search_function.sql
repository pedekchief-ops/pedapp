-- ============================================================================
-- 0007_search_function.sql
--
-- PostgREST's filter syntax doesn't support casting a jsonb column to text
-- inline (confirmed: `content::text=ilike.*x*` fails with "operator does
-- not exist: jsonb ~~* unknown") -- the cast has to happen in real SQL, so
-- block-content search goes through this function via `.rpc()` instead of
-- `.filter()`. `security invoker` (the default, made explicit) means it
-- runs with the calling user's own permissions, so the existing RLS
-- policies on `blocks` still apply -- this function doesn't bypass
-- anything, it's just a way to express the cast.
-- ============================================================================

create or replace function public.search_blocks(
  search_query text,
  filter_page_id uuid default null,
  filter_page_ids uuid[] default null
)
returns table (id uuid, page_id uuid, content jsonb)
language sql
stable
security invoker
as $$
  select b.id, b.page_id, b.content
  from public.blocks b
  where b.content::text ilike '%' || search_query || '%'
    and (filter_page_id is null or b.page_id = filter_page_id)
    and (filter_page_ids is null or b.page_id = any(filter_page_ids))
  limit 50;
$$;

grant execute on function public.search_blocks(text, uuid, uuid[]) to authenticated, anon;
