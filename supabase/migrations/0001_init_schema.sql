-- ============================================================================
-- 0001_init_schema.sql
--
-- Initial schema for the Pediatric Residency reference app.
-- Run this once against a fresh Supabase project (SQL Editor -> paste -> Run,
-- or via `supabase db push` if you use the Supabase CLI).
--
-- Design summary:
--   profiles          one row per auth user, carries the admin/resident role
--   sections          the 8 fixed top-level nav items (Medications, ER, etc.)
--   pages             pages that live inside a section
--   blocks            the actual page content, as ordered rows (not one big
--                     JSON blob) so the admin UI can add/reorder/delete a
--                     single block without rewriting the whole page. A block
--                     of type 'tabs_container' is a parent; its tab children
--                     are other blocks pointing back at it via
--                     parent_block_id + tab_key.
--   page_versions     an immutable snapshot written every time a page is
--                     published, so residents can always see "last updated
--                     by / when" and admins can roll back a bad edit.
--   files             metadata for uploaded PDFs/images (the actual bytes
--                     live in Supabase Storage buckets, see setup notes).
--   push_subscriptions Web Push subscriptions, one row per device a resident
--                     has opted in on.
-- ============================================================================

-- Needed for gen_random_uuid()
create extension if not exists pgcrypto;

-- ----------------------------------------------------------------------------
-- profiles
-- Extends auth.users (which Supabase manages) with app-specific fields.
-- We can't add columns directly to auth.users, so every user gets a mirrored
-- row here instead, created automatically by the trigger further down.
-- ----------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role text not null default 'resident' check (role in ('admin', 'resident')),
  full_name text,
  created_at timestamptz not null default now()
);

-- Small helper used throughout the RLS policies below so we don't repeat the
-- same subquery on every table. `security definer` lets it read `profiles`
-- even from a policy context where the calling role only has row-level
-- access, and `stable` lets Postgres cache the result within one statement.
create or replace function public.is_admin()
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

-- Auto-create a `profiles` row whenever someone signs up via Supabase Auth.
-- New accounts always start as 'resident' -- promoting someone to 'admin' is
-- a deliberate manual step (see README setup instructions), not something a
-- user can grant themselves.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, new.raw_user_meta_data ->> 'full_name');
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ----------------------------------------------------------------------------
-- sections
-- The 8 fixed nav items. Seeded below; admins can still rename/reorder them
-- from the CMS, but creating a brand new section is intentionally rare so we
-- don't build a "delete section" UI in v1 (can be done from SQL editor).
-- ----------------------------------------------------------------------------
create table public.sections (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name_he text not null,
  name_en text not null,
  icon text not null default 'folder',
  order_index int not null default 0,
  -- Sections flagged true get their content proactively cached for offline
  -- use right after login (see lib/offline). Medications defaults to true.
  is_offline_critical boolean not null default false,
  created_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- pages
-- ----------------------------------------------------------------------------
create table public.pages (
  id uuid primary key default gen_random_uuid(),
  section_id uuid not null references public.sections (id) on delete cascade,
  slug text not null,
  title_he text not null,
  title_en text,
  order_index int not null default 0,
  updated_by uuid references public.profiles (id),
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (section_id, slug)
);

-- ----------------------------------------------------------------------------
-- blocks
-- `content` shape depends on `type`:
--   rich_text      -> TipTap JSON document, e.g. { "doc": {...} }
--   image          -> { "file_id": "...", "alt_he": "...", "alt_en": "..." }
--   pdf            -> { "file_id": "...", "title": "..." }
--   tabs_container -> { "tabs": [{ "key": "t1", "label_he": "...", "label_en": "..." }, ...] }
--                     Its child blocks (any type above) point back here via
--                     parent_block_id, and each child's tab_key says which
--                     tab it renders under.
-- ----------------------------------------------------------------------------
create table public.blocks (
  id uuid primary key default gen_random_uuid(),
  page_id uuid not null references public.pages (id) on delete cascade,
  parent_block_id uuid references public.blocks (id) on delete cascade,
  tab_key text,
  type text not null check (type in ('rich_text', 'pdf', 'image', 'tabs_container')),
  order_index int not null default 0,
  content jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index blocks_page_id_idx on public.blocks (page_id);
create index blocks_parent_block_id_idx on public.blocks (parent_block_id);

-- ----------------------------------------------------------------------------
-- page_versions
-- Written on every "publish" action from the admin editor. `content_snapshot`
-- is a plain JSON array mirroring the full block tree for that page at save
-- time, independent of the live `blocks` rows, so it survives later edits.
-- ----------------------------------------------------------------------------
create table public.page_versions (
  id uuid primary key default gen_random_uuid(),
  page_id uuid not null references public.pages (id) on delete cascade,
  editor_id uuid references public.profiles (id),
  content_snapshot jsonb not null,
  created_at timestamptz not null default now()
);

create index page_versions_page_id_idx on public.page_versions (page_id);

-- ----------------------------------------------------------------------------
-- files
-- Metadata only -- the bytes live in the `pdfs` / `images` Storage buckets
-- (created via the dashboard, see setup notes) at `storage_path`.
-- ----------------------------------------------------------------------------
create table public.files (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('pdf', 'image')),
  storage_path text not null,
  uploaded_by uuid references public.profiles (id),
  created_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- push_subscriptions
-- One row per browser/device a resident has enabled notifications on.
-- `subscription` stores the raw PushSubscription JSON from the browser.
-- ----------------------------------------------------------------------------
create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  subscription jsonb not null,
  endpoint text generated always as (subscription ->> 'endpoint') stored,
  created_at timestamptz not null default now(),
  unique (endpoint)
);

-- ============================================================================
-- Row Level Security
--
-- Everything is readable by any signed-in user (residents + admins) and
-- writable only by admins, except profiles (read own) and push_subscriptions
-- (manage own). The server-only "service role" key used by the push-notify
-- API route bypasses RLS entirely, which is why that key must never reach
-- the browser (see .env.local.example).
-- ============================================================================

alter table public.profiles enable row level security;
alter table public.sections enable row level security;
alter table public.pages enable row level security;
alter table public.blocks enable row level security;
alter table public.page_versions enable row level security;
alter table public.files enable row level security;
alter table public.push_subscriptions enable row level security;

-- profiles: everyone can read their own row; admins can read everyone's
-- (needed so the admin UI can show "last updated by <name>").
create policy "profiles: read own" on public.profiles
  for select using (auth.uid() = id);

create policy "profiles: admins read all" on public.profiles
  for select using (public.is_admin());

-- sections / pages / blocks / files: read for any authenticated user,
-- write restricted to admins.
create policy "sections: read all authenticated" on public.sections
  for select using (auth.role() = 'authenticated');
create policy "sections: admin write" on public.sections
  for all using (public.is_admin()) with check (public.is_admin());

create policy "pages: read all authenticated" on public.pages
  for select using (auth.role() = 'authenticated');
create policy "pages: admin write" on public.pages
  for all using (public.is_admin()) with check (public.is_admin());

create policy "blocks: read all authenticated" on public.blocks
  for select using (auth.role() = 'authenticated');
create policy "blocks: admin write" on public.blocks
  for all using (public.is_admin()) with check (public.is_admin());

create policy "files: read all authenticated" on public.files
  for select using (auth.role() = 'authenticated');
create policy "files: admin write" on public.files
  for all using (public.is_admin()) with check (public.is_admin());

-- page_versions: admins only (residents don't need version history in v1).
create policy "page_versions: admin read/write" on public.page_versions
  for all using (public.is_admin()) with check (public.is_admin());

-- push_subscriptions: a user can only see/manage their own subscriptions.
create policy "push_subscriptions: manage own" on public.push_subscriptions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
