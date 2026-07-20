-- ============================================================================
-- 0008_medications.sql
--
-- A purpose-built medications system, replacing the generic page-list
-- behavior for the Medications section specifically:
--   - sections.section_type flags a section as 'medications' (vs the
--     default 'generic' pages-list behavior) so the resident/admin routes
--     know which UI to render for that section.
--   - medication_fields: the admin-configurable schema of what gets
--     entered per drug (generic name, dosage, units, ...). Fully editable
--     rather than hardcoded, matching how blocks/data_table columns work
--     elsewhere in this app.
--   - medication_categories: the tabs shown at the top of the medications
--     browser (e.g. "אנטימיקרוביאלי", "אנטי פרכוסי").
--   - medications: one row per drug; its field values live in a single
--     jsonb column keyed by medication_fields.key, since the field set is
--     admin-defined and can change over time.
--   - medication_category_links: many-to-many, since a drug can appear
--     under more than one category.
-- ============================================================================

alter table public.sections
  add column section_type text not null default 'generic'
    check (section_type in ('generic', 'medications'));

update public.sections set section_type = 'medications' where slug = 'medications';

-- ----------------------------------------------------------------------------
-- medication_fields
-- `options` holds the choice list for a 'select' field (e.g. dosage units).
-- `unit_field_key` lets a number/number_range field (e.g. "מינון") point at
-- a select field (e.g. "יחידות") whose value is appended when displaying it,
-- so "15-20" renders as "15-20 מ״ג" without hardcoding field names anywhere
-- in the app.
-- `is_title` marks the one field used as each drug's headline (defaults to
-- generic name); `show_in_summary` marks fields shown in the collapsed row
-- before it's expanded.
-- ----------------------------------------------------------------------------
create table public.medication_fields (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  label_he text not null,
  label_en text,
  field_type text not null check (field_type in ('text', 'number', 'number_range', 'select')),
  options jsonb,
  unit_field_key text,
  is_title boolean not null default false,
  show_in_summary boolean not null default false,
  order_index int not null default 0,
  created_at timestamptz not null default now()
);

create table public.medication_categories (
  id uuid primary key default gen_random_uuid(),
  name_he text not null,
  name_en text,
  order_index int not null default 0,
  created_at timestamptz not null default now()
);

create table public.medications (
  id uuid primary key default gen_random_uuid(),
  values jsonb not null default '{}'::jsonb,
  updated_by uuid references public.profiles (id),
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table public.medication_category_links (
  medication_id uuid not null references public.medications (id) on delete cascade,
  category_id uuid not null references public.medication_categories (id) on delete cascade,
  primary key (medication_id, category_id)
);

create index medication_category_links_category_idx on public.medication_category_links (category_id);
create index medication_category_links_medication_idx on public.medication_category_links (medication_id);

alter table public.medication_fields enable row level security;
alter table public.medication_categories enable row level security;
alter table public.medications enable row level security;
alter table public.medication_category_links enable row level security;

create policy "medication_fields: read all authenticated" on public.medication_fields
  for select using (auth.role() = 'authenticated');
create policy "medication_fields: admin write" on public.medication_fields
  for all using (public.is_admin()) with check (public.is_admin());

create policy "medication_categories: read all authenticated" on public.medication_categories
  for select using (auth.role() = 'authenticated');
create policy "medication_categories: admin write" on public.medication_categories
  for all using (public.is_admin()) with check (public.is_admin());

create policy "medications: read all authenticated" on public.medications
  for select using (auth.role() = 'authenticated');
create policy "medications: admin write" on public.medications
  for all using (public.is_admin()) with check (public.is_admin());

create policy "medication_category_links: read all authenticated" on public.medication_category_links
  for select using (auth.role() = 'authenticated');
create policy "medication_category_links: admin write" on public.medication_category_links
  for all using (public.is_admin()) with check (public.is_admin());

-- Default field schema, matching what was asked for at launch. Admins can
-- add/remove/rename/reorder these freely afterward from /admin/medications.
insert into public.medication_fields (key, label_he, field_type, options, unit_field_key, is_title, show_in_summary, order_index) values
  ('generic_name',   'שם גנרי',      'text',         null, null,      true,  false, 1),
  ('trade_name',     'שם מסחרי',     'text',         null, null,      false, false, 2),
  ('units',          'יחידות',       'select', '["מ״ג", "ג׳", "מק״ג", "ננ״ג", "יח׳"]'::jsonb, null, false, false, 3),
  ('dosage',         'מינון',        'number_range', null, 'units',   false, true,  4),
  ('doses_per_day',  'מספר מנות',    'number_range', null, null,      false, true,  5),
  ('route',          'דרך מתן',      'text',         null, null,      false, false, 6),
  ('max_dosage',     'מינון מקסימלי','number',       null, 'units',   false, true,  7),
  ('notes',          'הערות',        'text',         null, null,      false, false, 8);
