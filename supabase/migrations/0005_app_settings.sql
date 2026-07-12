-- ============================================================================
-- 0005_app_settings.sql
--
-- Single-row table holding app-wide branding controlled from
-- /admin/settings: logo, primary/accent color, and default light/dark
-- theme. Deliberately app-wide only (no per-section or per-page styling)
-- to keep this simple to reason about and maintain.
--
-- The `id boolean primary key default true check (id)` trick guarantees
-- there can only ever be exactly one row (a second insert with id=true
-- would violate the primary key, and id can't be false since the check
-- requires it truthy) -- simpler than a separate "is this the active row"
-- flag.
-- ============================================================================

create table public.app_settings (
  id boolean primary key default true check (id),
  logo_storage_path text,
  primary_color text not null default '#0d9488',
  default_theme text not null default 'system' check (default_theme in ('light', 'dark', 'system')),
  updated_by uuid references public.profiles (id),
  updated_at timestamptz not null default now()
);

insert into public.app_settings (id) values (true);

alter table public.app_settings enable row level security;

-- Readable by anyone, including signed-out visitors -- the login page
-- shows the same logo/color before authentication.
create policy "app_settings: public read" on public.app_settings
  for select using (true);

create policy "app_settings: admin write" on public.app_settings
  for update to authenticated using (public.is_admin()) with check (public.is_admin());
