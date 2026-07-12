-- ============================================================================
-- 0004_seed_demo_page.sql (optional)
--
-- Seeds one fully worked example page under Medications, demonstrating
-- rich text (headings, bold, bullet lists, tables, underline) and nested
-- tabs together on one page. Image/PDF blocks aren't seeded here since
-- they need real uploaded bytes -- open this page from /admin/medications
-- and add an image or PDF block to see all four block types together,
-- then delete the page once you don't need the example anymore.
--
-- Uses Unicode gershayim (״) rather than a plain ASCII double-quote for
-- Hebrew abbreviations like מ״ג, so the text can't be confused with the
-- surrounding JSON string quoting.
-- ============================================================================

with target_section as (
  select id from public.sections where slug = 'medications'
),
new_page as (
  insert into public.pages (section_id, slug, title_he, title_en, order_index)
  select id, 'paracetamol-example', 'מינון פרצטמול (עמוד לדוגמה)', 'Paracetamol Dosing (example)', 1
  from target_section
  returning id
),
intro_block as (
  insert into public.blocks (page_id, type, order_index, content)
  select id, 'rich_text', 0, $$
  {"doc": {"type":"doc","content":[
    {"type":"heading","attrs":{"level":2},"content":[{"type":"text","text":"מינון פרצטמול בילדים"}]},
    {"type":"paragraph","content":[{"type":"text","text":"זהו עמוד לדוגמה שנוצר אוטומטית כדי להדגים את בונה העמודים. ניתן לערוך אותו או למחוק אותו דרך "},{"type":"text","marks":[{"type":"bold"}],"text":"ניהול תוכן"},{"type":"text","text":"."}]},
    {"type":"bulletList","content":[
      {"type":"listItem","content":[{"type":"paragraph","content":[{"type":"text","text":"מינון סטנדרטי: 15 מ״ג/ק״ג למנה"}]}]},
      {"type":"listItem","content":[{"type":"paragraph","content":[{"type":"text","text":"מרווח בין מנות: כל 4-6 שעות"}]}]},
      {"type":"listItem","content":[{"type":"paragraph","content":[{"type":"text","text":"מקסימום: 4 מנות ביממה"}]}]}
    ]}
  ]}}
  $$::jsonb
  from new_page
  returning id
),
tabs_block as (
  insert into public.blocks (page_id, type, order_index, content)
  select new_page.id, 'tabs_container', 1,
    '{"tabs":[{"key":"weight-based","label_he":"לפי משקל"},{"key":"warnings","label_he":"אזהרות"}]}'::jsonb
  from new_page
  returning id, page_id
)
insert into public.blocks (page_id, parent_block_id, tab_key, type, order_index, content)
select tabs_block.page_id, tabs_block.id, 'weight-based', 'rich_text', 0, $$
{"doc":{"type":"doc","content":[
  {"type":"table","content":[
    {"type":"tableRow","content":[
      {"type":"tableHeader","content":[{"type":"paragraph","content":[{"type":"text","text":"משקל (ק״ג)"}]}]},
      {"type":"tableHeader","content":[{"type":"paragraph","content":[{"type":"text","text":"מינון (מ״ל)"}]}]}
    ]},
    {"type":"tableRow","content":[
      {"type":"tableCell","content":[{"type":"paragraph","content":[{"type":"text","text":"10"}]}]},
      {"type":"tableCell","content":[{"type":"paragraph","content":[{"type":"text","text":"5"}]}]}
    ]},
    {"type":"tableRow","content":[
      {"type":"tableCell","content":[{"type":"paragraph","content":[{"type":"text","text":"20"}]}]},
      {"type":"tableCell","content":[{"type":"paragraph","content":[{"type":"text","text":"10"}]}]}
    ]}
  ]}
]}}
$$::jsonb
from tabs_block
union all
select tabs_block.page_id, tabs_block.id, 'warnings', 'rich_text', 0, $$
{"doc":{"type":"doc","content":[
  {"type":"paragraph","content":[{"type":"text","marks":[{"type":"underline"}],"text":"יש להיזהר ממנת יתר במטופלים עם פגיעה כבדית."}]}
]}}
$$::jsonb
from tabs_block;
