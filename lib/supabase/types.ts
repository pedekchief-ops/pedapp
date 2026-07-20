// Hand-written types mirroring supabase/migrations/0001_init_schema.sql.
// If the schema changes, update this file to match (or switch to
// `supabase gen types typescript` once the project is linked via the CLI).

export type UserRole = "admin" | "resident";

export type BlockType =
  | "rich_text"
  | "pdf"
  | "image"
  | "tabs_container"
  | "link_button"
  | "data_table";

export interface Profile {
  id: string;
  role: UserRole;
  full_name: string | null;
  created_at: string;
}

// Mirrors supabase/migrations/0005_app_settings.sql -- the single row
// controlling app-wide branding (logo, primary color, default theme),
// editable at /admin/settings.
export interface AppSettings {
  id: true;
  logo_storage_path: string | null;
  primary_color: string;
  default_theme: "light" | "dark" | "system";
  updated_by: string | null;
  updated_at: string;
}

// 'medications' sections render the dedicated category-tabs + structured
// drug list (components/medications/MedicationsBrowser.tsx) instead of the
// default generic pages list -- see supabase/migrations/0008_medications.sql.
export type SectionType = "generic" | "medications";

export interface Section {
  id: string;
  slug: string;
  name_he: string;
  name_en: string;
  icon: string;
  order_index: number;
  is_offline_critical: boolean;
  section_type: SectionType;
  created_at: string;
}

export interface Page {
  id: string;
  section_id: string;
  slug: string;
  title_he: string;
  title_en: string | null;
  order_index: number;
  updated_by: string | null;
  updated_at: string;
  created_at: string;
}

// Content shapes per block type -- see the migration file header for the
// full explanation of how `tabs_container` nesting works.
export interface RichTextContent {
  doc: Record<string, unknown>; // TipTap JSON document
}

// `storage_path` is denormalized from the `files` table at upload time so
// rendering a page never needs an extra join -- it's safe because a file's
// storage path never changes once uploaded (re-uploading creates a new
// `files` row + a new path rather than overwriting).
export interface ImageContent {
  file_id: string;
  storage_path: string;
  alt_he?: string;
  alt_en?: string;
}

export interface PdfContent {
  file_id: string;
  storage_path: string;
  title?: string;
}

export interface TabsContainerContent {
  tabs: { key: string; label_he: string; label_en?: string }[];
}

// A button that opens an external site in a new tab -- see
// components/blocks/LinkButtonBlock.tsx / components/editor/BlockEditor.tsx.
export interface LinkButtonContent {
  label_he: string;
  label_en?: string;
  url: string;
}

// A configurable table: admin-defined columns, rows grouped into
// categories and (optionally) subcategories. Introduced for the
// medications table but usable on any page -- see
// components/blocks/DataTableBlock.tsx / components/editor/DataTableEditor.tsx.
export interface DataTableColumn {
  key: string;
  label_he: string;
  label_en?: string;
}

export interface DataTableRow {
  key: string;
  values: Record<string, string>; // column key -> cell text
}

export interface DataTableSubcategory {
  key: string;
  name_he: string;
  name_en?: string;
  rows: DataTableRow[];
}

export interface DataTableCategory {
  key: string;
  name_he: string;
  name_en?: string;
  rows: DataTableRow[]; // rows directly under the category, outside any subcategory
  subcategories: DataTableSubcategory[];
}

export interface DataTableContent {
  columns: DataTableColumn[];
  categories: DataTableCategory[];
}

export type BlockContent =
  | RichTextContent
  | ImageContent
  | PdfContent
  | TabsContainerContent
  | LinkButtonContent
  | DataTableContent;

export interface Block {
  id: string;
  page_id: string;
  parent_block_id: string | null;
  tab_key: string | null;
  type: BlockType;
  order_index: number;
  content: BlockContent;
  created_at: string;
  updated_at: string;
}

export interface PageVersion {
  id: string;
  page_id: string;
  editor_id: string | null;
  content_snapshot: Block[];
  created_at: string;
}

export interface FileRecord {
  id: string;
  type: "pdf" | "image";
  storage_path: string;
  uploaded_by: string | null;
  created_at: string;
}

export interface PushSubscriptionRecord {
  id: string;
  user_id: string;
  subscription: PushSubscriptionJSON;
  created_at: string;
}

// A page with its full, nested block tree resolved -- what the resident
// view and the admin editor both consume. See lib/blocks.ts for how this
// is built from the flat `blocks` table rows.
export interface BlockNode extends Block {
  children: BlockNode[];
}

export interface PageWithBlocks extends Page {
  blocks: BlockNode[];
}

// Shape the admin block editor works with locally before publishing --
// unlike BlockNode there's no id/page_id/timestamps yet, since the whole
// tree is replaced wholesale on publish (see lib/actions/admin.ts). The
// editor assigns each draft a throwaway `clientId` purely for React keys /
// local reordering; it never reaches the server.
export interface BlockDraft {
  clientId: string;
  type: BlockType;
  content: BlockContent;
  tab_key?: string | null;
  children: BlockDraft[];
}

// ----------------------------------------------------------------------------
// Medications -- see supabase/migrations/0008_medications.sql for the full
// design rationale (admin-configurable field schema, many-to-many
// categories).
// ----------------------------------------------------------------------------

export type MedicationFieldType = "text" | "number" | "number_range" | "select";

export interface MedicationField {
  id: string;
  key: string;
  label_he: string;
  label_en: string | null;
  field_type: MedicationFieldType;
  options: string[] | null;
  unit_field_key: string | null;
  is_title: boolean;
  show_in_summary: boolean;
  order_index: number;
  created_at: string;
}

export interface MedicationCategory {
  id: string;
  name_he: string;
  name_en: string | null;
  order_index: number;
  created_at: string;
}

export interface MedicationNumberRangeValue {
  min: number | null;
  max: number | null;
}

// The shape stored at medications.values[field.key] depends on the field's
// field_type: text -> string, number -> number, number_range ->
// MedicationNumberRangeValue, select -> string (one of field.options).
export type MedicationFieldValue = string | number | MedicationNumberRangeValue | null;

export interface Medication {
  id: string;
  values: Record<string, MedicationFieldValue>;
  updated_by: string | null;
  updated_at: string;
  created_at: string;
}

export interface MedicationWithCategories extends Medication {
  categoryIds: string[];
}
