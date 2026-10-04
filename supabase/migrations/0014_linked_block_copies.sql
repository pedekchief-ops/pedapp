-- ============================================================================
-- 0014_linked_block_copies.sql
--
-- "צור העתק" (create copy): lets an admin show one existing block (a text
-- paragraph, an image, a PDF, a link button, or a table) on another page
-- too, as a live-linked copy -- editing the original updates every place
-- it's displayed, without manual re-entry.
--
-- stable_id: lib/actions/admin.ts's publishPage replaces a page's entire
-- `blocks` rows on every publish (delete-all, insert-all with fresh `id`s
-- for every block, changed or not -- see flattenDrafts' comment). A link
-- therefore can't target `id`, since the row it points at gets recreated
-- under a new id the next time its OWN page is published. stable_id is a
-- second identity that lib/editor/blockDraft.ts and flattenDrafts carry
-- through unchanged across edits, so it keeps meaning "the same block"
-- across republishes. Existing rows are backfilled to their current id.
alter table public.blocks add column stable_id uuid not null default gen_random_uuid();
update public.blocks set stable_id = id;
create unique index blocks_stable_id_idx on public.blocks (stable_id);

-- source_stable_id: when set, this row is a linked copy of the block whose
-- stable_id matches. Its own type/content/collapsible* columns hold a
-- frozen snapshot taken when the copy was created -- a fallback for the
-- (expected to be rare) case where the source block is later deleted or
-- hasn't been published yet, and what full-text search indexes. Normal
-- rendering overlays the *live* source content at read time instead (see
-- lib/blocks.ts's resolveLinkedBlocks), which is what makes edits to the
-- original propagate everywhere it's copied.
--
-- Deliberately no foreign key: a delete-then-reinsert publish of the
-- SOURCE's own page would otherwise null out every row that links to it
-- the moment the delete runs, before the matching row comes back on
-- insert -- an application-level lookup that simply no-ops on a miss (and
-- falls back to the frozen snapshot) tolerates that churn instead.
alter table public.blocks add column source_stable_id uuid;
