-- ============================================================================
-- 0002_seed_sections.sql
--
-- Seeds the 8 required top-level sections. Run this once, after
-- 0001_init_schema.sql. `icon` names refer to lucide-react icon names used
-- by components/nav/SectionCard.tsx.
--
-- Medications is flagged is_offline_critical so its pages/files are
-- proactively cached for offline use right after login.
-- ============================================================================

insert into public.sections (slug, name_he, name_en, icon, order_index, is_offline_critical) values
  ('general',        'כללי',                 'General',              'info',        1, false),
  ('medications',    'תרופות',                'Medications',          'pill',        2, true),
  ('starting-residency', 'תחילת התמחות',      'Starting Residency',   'graduation-cap', 3, false),
  ('er-triage',      'מיון',                  'ER / Triage',          'siren',       4, false),
  ('nicu',           'פגייה ותינוקות',        'NICU & Newborns',      'baby',        5, false),
  ('picu',           'טיפול נמרץ',            'PICU / Intensive Care','heart-pulse', 6, false),
  ('hemato-oncology','המטואונקולוגיה',        'Hemato-oncology',      'droplet',     7, false),
  ('bone-marrow',    'מח עצם',                'Bone Marrow',          'bone',        8, false);
