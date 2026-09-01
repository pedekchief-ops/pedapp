"use server";

import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";
import type { MedicationFieldType } from "@/lib/supabase/types";

// AI-assisted extraction of a dosing table (PDF or photo/scan image) into
// rows matching the medications schema (see lib/supabase/types.ts:
// MedicationField / medications.values). Every source document has a
// different column layout (some have no notes column, some have
// renal-adjustment or product-composition columns that don't apply to most
// drugs), so this maps to the *existing*
// admin-configurable field set where possible and proposes new fields for
// anything genuinely uncovered -- see the plan at
// /Users/nadav/.claude/plans/mossy-tickling-fairy.md. Nothing here writes
// to the database: this only returns a proposal for a human admin to
// review, edit, and explicitly save (via saveMedication /
// createMedicationField in lib/actions/medications.ts).

export interface ExtractedFieldSuggestion {
  key: string;
  label_he: string;
  field_type: MedicationFieldType;
  options: string[] | null;
}

export type ExtractedValue =
  | string
  | number
  | string[]
  | { min: number | null; max: number | null }
  | null;

export interface ExtractedDrug {
  generic_name: string;
  values: Record<string, ExtractedValue>;
  // The row transcribed as printed in the source, so an admin can compare
  // it side-by-side against the structured values above without reopening
  // the source file -- see ImportReview.tsx. Deliberately a literal
  // transcription, not a re-derived summary (that's what "notes" is for).
  source_excerpt: string;
}

export interface ExtractionResult {
  suggested_new_fields: ExtractedFieldSuggestion[];
  drugs: ExtractedDrug[];
  // General prose from the document that isn't tied to one row (a
  // treatment-duration note under a table, a references list, etc.) --
  // shown to the admin as read-only context, never auto-attached to a row.
  document_notes: string | null;
}

interface ExistingField {
  key: string;
  label_he: string;
  field_type: MedicationFieldType;
  options: string[] | null;
}

const EXTRACTION_TOOL_NAME = "record_extracted_medications";

function buildToolSchema() {
  const valueSchema = {
    anyOf: [
      { type: "string" },
      { type: "number" },
      { type: "null" },
      { type: "array", items: { type: "string" } },
      {
        type: "object",
        properties: {
          min: { type: ["number", "null"] },
          max: { type: ["number", "null"] },
        },
        required: ["min", "max"],
        additionalProperties: false,
      },
    ],
  };

  return {
    name: EXTRACTION_TOOL_NAME,
    description:
      "Records every drug row extracted from the dosing table document, mapped to the existing medication field schema plus any newly proposed fields.",
    input_schema: {
      type: "object" as const,
      properties: {
        suggested_new_fields: {
          type: "array",
          description:
            "New columns proposed because the PDF has data that doesn't fit any existing field. Only propose a new field when the data is genuinely structured (not a one-off aside) and recurs across several rows.",
          items: {
            type: "object",
            properties: {
              key: {
                type: "string",
                description: "snake_case machine key, e.g. renal_adjustment",
              },
              label_he: { type: "string" },
              field_type: {
                type: "string",
                enum: ["text", "number", "number_range", "select"],
              },
              options: {
                type: ["array", "null"],
                items: { type: "string" },
                description: "Only for field_type 'select'; null otherwise.",
              },
            },
            required: ["key", "label_he", "field_type", "options"],
            additionalProperties: false,
          },
        },
        drugs: {
          type: "array",
          items: {
            type: "object",
            properties: {
              generic_name: { type: "string" },
              values: {
                type: "object",
                description:
                  "Keys are either an existing field's key or one of suggested_new_fields' keys.",
                additionalProperties: valueSchema,
              },
              source_excerpt: {
                type: "string",
                description:
                  "This row transcribed exactly as printed in the source (literal wording/numbers/order, not reformatted or summarized) -- lets a human reviewer compare the structured values above against the original text.",
              },
            },
            required: ["generic_name", "values", "source_excerpt"],
            additionalProperties: false,
          },
        },
        document_notes: {
          type: ["string", "null"],
          description:
            "General prose from the document not tied to a specific drug row (e.g. a treatment-duration note under the table). Null if none.",
        },
      },
      required: ["suggested_new_fields", "drugs", "document_notes"],
      additionalProperties: false,
    },
  };
}

function buildPrompt(existingFields: ExistingField[]) {
  const fieldsDescription = existingFields
    .map((f) => {
      const opts = f.options ? ` options: [${f.options.join(", ")}]` : "";
      return `- key: "${f.key}", label: "${f.label_he}", type: ${f.field_type}${opts}`;
    })
    .join("\n");

  return `You are extracting a pediatric medication dosing table from a document (a PDF, or a photo/scan of a printed table -- Hebrew/English mixed, RTL layout) into structured data for a medical reference app.

Existing field schema (map to these first -- only propose a new field in suggested_new_fields when nothing here fits):
${fieldsDescription}

Rules:
1. Extract every drug/product row in the table. "generic_name" is required for every row, and must be whatever name the source table itself uses to identify that row -- usually the pharmacological generic/molecule name, but if the table is organized by commercial product (e.g. a product-comparison table where several products share the same active ingredient or salt), use each product's own name instead. Never reuse the same generic_name for two genuinely different rows just because they share an active ingredient -- every row's generic_name must be unique within this table.
2. A "number_range" field's value must be {min, max} (either may be null if the source gives only one bound). A plain single number still goes in a "number" field as a number, not a range object.
3. A "select" field's value must be one of its existing "options" (or, for a new select field you're proposing, one of the options you list for it) -- never invent a value outside the option list. If a field is "multiple" (like "route"), its value is an array of option strings.
4. If a drug has more than one dosing regimen depending on indication (e.g. treatment vs. prophylaxis, loading vs. maintenance, adult vs. pediatric), put the single most general/common regimen in the structured dose fields, and record every regimen (clearly labeled) as readable text in "notes". Never silently drop a regimen.
5. Only propose a new field (suggested_new_fields) for data that is genuinely structured and recurs across multiple rows in this table (e.g. a Yes/No renal-adjustment column, a percent-elemental-iron column). Do not propose a new field for a one-off aside -- put that in notes instead.
6. General prose in the document that isn't about one specific drug (e.g. a paragraph below the table about typical treatment duration, a references list) goes in "document_notes", not attached to any row.
7. Preserve the original Hebrew/English text as printed -- do not translate drug names or clinical terms.
8. "source_excerpt" is a literal transcription of the row, not a summary -- copy the wording/numbers/order as printed. This is what lets a human reviewer catch a transcription mistake by comparing it against the structured fields, so it must stand on its own even if the structured extraction above it is wrong.

Call the ${EXTRACTION_TOOL_NAME} tool exactly once with the complete extraction.`;
}

const IMAGE_MEDIA_TYPES: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  gif: "image/gif",
  webp: "image/webp",
};

// Claude reads a photo of a dosing table the same way it reads a PDF one --
// same API, same key, no extra setup -- so this accepts either. The only
// real difference is which content-block shape the Messages API wants
// (document vs. image) and, for an image, which exact media_type.
function buildSourceContentBlock(
  bucket: "pdfs" | "images",
  storagePath: string,
  base64: string
): Anthropic.Messages.ContentBlockParam {
  if (bucket === "pdfs") {
    return {
      type: "document",
      source: { type: "base64", media_type: "application/pdf", data: base64 },
    };
  }
  const extension = storagePath.split(".").pop()?.toLowerCase() ?? "";
  const mediaType = IMAGE_MEDIA_TYPES[extension];
  if (!mediaType) {
    throw new Error(
      `Unsupported image type ".${extension}" -- use jpg, png, gif, or webp.`
    );
  }
  return {
    type: "image",
    source: { type: "base64", media_type: mediaType as "image/jpeg", data: base64 },
  };
}

export async function extractMedicationsFromFile(
  sectionSlug: string,
  storagePath: string,
  bucket: "pdfs" | "images"
): Promise<ExtractionResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error(
      "ANTHROPIC_API_KEY is not configured -- PDF import is unavailable until it's set."
    );
  }

  const supabase = await createClient();

  const [{ data: fileBlob, error: downloadError }, { data: fieldsData, error: fieldsError }] =
    await Promise.all([
      supabase.storage.from(bucket).download(storagePath),
      supabase
        .from("medication_fields")
        .select("key, label_he, field_type, options")
        .order("order_index", { ascending: true }),
    ]);
  if (downloadError) throw downloadError;
  if (!fileBlob) throw new Error(`Could not download ${storagePath} from the ${bucket} bucket.`);
  if (fieldsError) throw fieldsError;

  // Anthropic's per-image size limit (well under this) will reject an
  // oversized photo with its own clear error anyway, but this catches the
  // common case (a multi-MB phone photo) with a message that actually says
  // what to do about it, rather than a cryptic API error.
  if (bucket === "images" && fileBlob.size > 10 * 1024 * 1024) {
    throw new Error(
      "התמונה גדולה מדי (מעל 10MB) -- נסה לצלם/לייצא ברזולוציה נמוכה יותר."
    );
  }

  const fileBase64 = Buffer.from(await fileBlob.arrayBuffer()).toString("base64");
  const existingFields = (fieldsData ?? []) as ExistingField[];

  const anthropic = new Anthropic({ apiKey });
  const tool = buildToolSchema();

  const message = await anthropic.messages.create({
    model: "claude-sonnet-5",
    max_tokens: 8000,
    tools: [tool],
    tool_choice: { type: "tool", name: EXTRACTION_TOOL_NAME },
    messages: [
      {
        role: "user",
        content: [
          buildSourceContentBlock(bucket, storagePath, fileBase64),
          { type: "text", text: buildPrompt(existingFields) },
        ],
      },
    ],
  });

  const toolUse = message.content.find(
    (block): block is Anthropic.ToolUseBlock =>
      block.type === "tool_use" && block.name === EXTRACTION_TOOL_NAME
  );
  if (!toolUse) {
    throw new Error("Extraction failed: the model did not return structured data.");
  }

  // sectionSlug isn't used yet (extraction doesn't write to the DB), but is
  // kept as a parameter so callers already have the right shape for when
  // the review screen's save step (createMedicationField / saveMedication)
  // is wired in next -- those calls do need it for cache revalidation.
  void sectionSlug;

  return toolUse.input as ExtractionResult;
}
