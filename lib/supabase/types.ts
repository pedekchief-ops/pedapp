// Hand-written types mirroring supabase/migrations/0001_init_schema.sql.
// If the schema changes, update this file to match (or switch to
// `supabase gen types typescript` once the project is linked via the CLI).

export type UserRole = "admin" | "resident";

export type BlockType = "rich_text" | "pdf" | "image" | "tabs_container";

export interface Profile {
  id: string;
  role: UserRole;
  full_name: string | null;
  created_at: string;
}

export interface Section {
  id: string;
  slug: string;
  name_he: string;
  name_en: string;
  icon: string;
  order_index: number;
  is_offline_critical: boolean;
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

export type BlockContent =
  | RichTextContent
  | ImageContent
  | PdfContent
  | TabsContainerContent;

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
