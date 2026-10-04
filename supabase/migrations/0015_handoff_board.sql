-- ============================================================================
-- 0015_handoff_board.sql
--
-- "העברת מחלקה" (department handoff/sign-out board): a new section_type,
-- alongside 'generic' (page builder) and 'medications' (structured drug
-- list) -- see components/handoff/HandoffBoard.tsx. Unlike everything else
-- in the app, every signed-in resident can write here, not just admins
-- (that's the whole point: a shared, live census the team on shift updates
-- directly), so RLS grants write to any authenticated user rather than
-- gating through is_admin().
--
-- Five fixed wards (tabs). Three have a fixed set of rooms/beds that
-- always exist (is_fixed = true, seeded below) -- "deleting" one of these
-- rows only clears the patient fields, since the bed itself is permanent.
-- The other two ("satellites"/"annex") have no fixed beds: rows are added
-- and removed freely (is_fixed = false), see addHandoffPatientRow /
-- clearOrDeleteHandoffPatientRow in lib/actions/handoff.ts.
-- ============================================================================

alter table public.sections drop constraint if exists sections_section_type_check;
alter table public.sections add constraint sections_section_type_check
  check (section_type in ('generic', 'medications', 'handoff'));

create table public.handoff_patients (
  id uuid primary key default gen_random_uuid(),
  ward text not null check (ward in ('near_side', 'seven', 'far_side', 'satellites', 'annex')),
  is_fixed boolean not null default false,
  order_index int not null default 0,
  -- Every column below is free text the admin/resident can edit directly,
  -- including location -- even for a fixed bed, per the explicit request
  -- that every cell except the two checkboxes stays open to free-form
  -- editing (e.g. to add a side note like "1 (בידוד)").
  location text not null default '',
  patient_name text not null default '',
  age text not null default '',
  background text not null default '',
  active_issue text not null default '',
  medications text not null default '',
  evening_tasks text not null default '',
  evening_exam boolean not null default false,
  morning_labs boolean not null default false,
  updated_by uuid references public.profiles (id),
  updated_at timestamptz not null default now()
);

create index handoff_patients_ward_idx on public.handoff_patients (ward, order_index);

alter table public.handoff_patients enable row level security;

-- Read and write both open to any signed-in resident, not just admins --
-- the one table in the app where that's true. See the file header above.
create policy "handoff_patients: all authenticated" on public.handoff_patients
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

-- Seed the fixed beds. Room numbers match the ward's real layout as
-- described by the admin:
--   near_side ("צד קרוב"): rooms 1-6, two beds per room.
--   seven ("שביעיה"): rooms 1-7, one bed per room.
--   far_side ("צד רחוק"): rooms 8-10 (one bed), rooms 11-17 (two beds).
insert into public.handoff_patients (ward, is_fixed, order_index, location) values
  ('near_side', true, 0, '1'), ('near_side', true, 1, '1'),
  ('near_side', true, 2, '2'), ('near_side', true, 3, '2'),
  ('near_side', true, 4, '3'), ('near_side', true, 5, '3'),
  ('near_side', true, 6, '4'), ('near_side', true, 7, '4'),
  ('near_side', true, 8, '5'), ('near_side', true, 9, '5'),
  ('near_side', true, 10, '6'), ('near_side', true, 11, '6'),
  ('seven', true, 0, '1'), ('seven', true, 1, '2'), ('seven', true, 2, '3'),
  ('seven', true, 3, '4'), ('seven', true, 4, '5'), ('seven', true, 5, '6'),
  ('seven', true, 6, '7'),
  ('far_side', true, 0, '8'), ('far_side', true, 1, '9'), ('far_side', true, 2, '10'),
  ('far_side', true, 3, '11'), ('far_side', true, 4, '11'),
  ('far_side', true, 5, '12'), ('far_side', true, 6, '12'),
  ('far_side', true, 7, '13'), ('far_side', true, 8, '13'),
  ('far_side', true, 9, '14'), ('far_side', true, 10, '14'),
  ('far_side', true, 11, '15'), ('far_side', true, 12, '15'),
  ('far_side', true, 13, '16'), ('far_side', true, 14, '16'),
  ('far_side', true, 15, '17'), ('far_side', true, 16, '17');
