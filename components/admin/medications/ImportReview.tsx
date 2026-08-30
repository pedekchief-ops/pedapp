"use client";

import { useMemo, useState, useTransition } from "react";
import { Info, X } from "lucide-react";
import {
  createMedicationCategory,
  createMedicationField,
  saveMedication,
} from "@/lib/actions/medications";
import { FieldInput } from "./MedicationForm";
import type { ExtractionResult } from "@/lib/actions/medication-import";
import type { MedicationCategory, MedicationField, MedicationFieldValue } from "@/lib/supabase/types";

interface Row {
  localId: string;
  included: boolean;
  values: Record<string, MedicationFieldValue>;
}

// Everything extracted from the PDF (lib/actions/medication-import.ts) is
// editable here before anything touches the database: new field
// suggestions can be approved/renamed/rejected, every drug row can be
// edited or excluded, and a target category is chosen. "Save" is the only
// point that actually calls the real mutation actions
// (createMedicationField / createMedicationCategory / saveMedication --
// same ones the regular admin UI uses), each extracted drug becoming one
// medication row exactly like adding it by hand would.
export function ImportReview({
  sectionSlug,
  fields,
  categories,
  result,
  sourceFilename,
  onDone,
  onCancel,
}: {
  sectionSlug: string;
  fields: MedicationField[];
  categories: MedicationCategory[];
  result: ExtractionResult;
  sourceFilename: string;
  onDone: (count: number) => void;
  onCancel: () => void;
}) {
  const [fieldApprovals, setFieldApprovals] = useState<Record<string, { approved: boolean; label_he: string }>>(
    () =>
      Object.fromEntries(
        result.suggested_new_fields.map((f) => [f.key, { approved: true, label_he: f.label_he }])
      )
  );

  const suggestedDefaultCategoryName = sourceFilename.replace(/\.pdf$/i, "").trim();
  const [categoryMode, setCategoryMode] = useState<"existing" | "new" | "none">(
    categories.length > 0 ? "existing" : "new"
  );
  const [selectedCategoryId, setSelectedCategoryId] = useState(categories[0]?.id ?? "");
  const [newCategoryName, setNewCategoryName] = useState(suggestedDefaultCategoryName);

  const [rows, setRows] = useState<Row[]>(() =>
    result.drugs.map((drug) => ({
      localId: crypto.randomUUID(),
      included: true,
      values: { ...drug.values, generic_name: drug.generic_name } as Record<string, MedicationFieldValue>,
    }))
  );

  const [saving, startSaving] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const approvedNewFields = result.suggested_new_fields.filter((f) => fieldApprovals[f.key]?.approved);
  const rejectedKeys = new Set(
    result.suggested_new_fields.filter((f) => !fieldApprovals[f.key]?.approved).map((f) => f.key)
  );

  // The full set of fields to render an input for on every row: the
  // real, already-persisted fields plus a throwaway MedicationField shape
  // for each approved-but-not-yet-created suggestion, purely so FieldInput
  // can render it the same way. Values are keyed by field `key` (not id),
  // so nothing about these synthetic ids leaks into what actually gets
  // saved.
  const fieldsForForm: MedicationField[] = useMemo(() => {
    const synthetic: MedicationField[] = approvedNewFields.map((f, i) => ({
      id: `new-${f.key}`,
      key: f.key,
      label_he: fieldApprovals[f.key]?.label_he ?? f.label_he,
      label_en: null,
      field_type: f.field_type,
      options: f.options,
      unit_field_key: null,
      is_title: false,
      show_in_summary: false,
      is_searchable_name: false,
      multiple: false,
      order_index: 10000 + i,
      created_at: "",
    }));
    return [...fields, ...synthetic];
  }, [fields, approvedNewFields, fieldApprovals]);

  function updateRowValue(localId: string, key: string, value: MedicationFieldValue) {
    setRows((prev) =>
      prev.map((r) => (r.localId === localId ? { ...r, values: { ...r.values, [key]: value } } : r))
    );
  }

  function toggleRowIncluded(localId: string) {
    setRows((prev) => prev.map((r) => (r.localId === localId ? { ...r, included: !r.included } : r)));
  }

  function removeRow(localId: string) {
    setRows((prev) => prev.filter((r) => r.localId !== localId));
  }

  async function handleSaveAll() {
    setError(null);
    const includedRows = rows.filter((r) => r.included);
    if (includedRows.length === 0) {
      setError("לא נבחרו תרופות לייבוא");
      return;
    }
    if (categoryMode === "new" && !newCategoryName.trim()) {
      setError("יש להזין שם לקטגוריה החדשה, או לבחור 'ללא קטגוריה'");
      return;
    }

    startSaving(async () => {
      try {
        for (const f of approvedNewFields) {
          await createMedicationField(sectionSlug, {
            key: f.key,
            label_he: fieldApprovals[f.key]?.label_he ?? f.label_he,
            field_type: f.field_type,
            options: f.options,
            unit_field_key: null,
          });
        }

        let categoryId: string | null = null;
        if (categoryMode === "existing") categoryId = selectedCategoryId || null;
        if (categoryMode === "new") {
          const created = await createMedicationCategory(sectionSlug, newCategoryName.trim());
          categoryId = created.id;
        }

        await Promise.all(
          includedRows.map((row) => {
            const values = Object.fromEntries(
              Object.entries(row.values).filter(([k]) => !rejectedKeys.has(k))
            );
            return saveMedication(sectionSlug, {
              id: null,
              values,
              categoryIds: categoryId ? [categoryId] : [],
            });
          })
        );

        onDone(includedRows.length);
      } catch (err) {
        setError(err instanceof Error ? err.message : "השמירה נכשלה");
      }
    });
  }

  return (
    <div className="flex flex-col gap-4">
      {result.document_notes && (
        <div className="flex items-start gap-2 rounded-lg border border-neutral-200 bg-neutral-50 p-3 text-xs text-neutral-600 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-400">
          <Info size={14} className="mt-0.5 shrink-0" />
          <p>
            <span className="font-medium">הקשר כללי מהמסמך (לא מקושר לתרופה ספציפית):</span>{" "}
            {result.document_notes}
          </p>
        </div>
      )}

      {result.suggested_new_fields.length > 0 && (
        <div className="rounded-xl border border-neutral-200 p-3 dark:border-neutral-800">
          <p className="mb-2 text-sm font-medium text-neutral-900 dark:text-neutral-50">
            שדות חדשים שהתגלו ({result.suggested_new_fields.length})
          </p>
          <div className="flex flex-col gap-2">
            {result.suggested_new_fields.map((f) => (
              <label key={f.key} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={fieldApprovals[f.key]?.approved ?? false}
                  onChange={(e) =>
                    setFieldApprovals((prev) => ({
                      ...prev,
                      [f.key]: { ...prev[f.key], approved: e.target.checked },
                    }))
                  }
                  className="h-4 w-4"
                />
                <input
                  type="text"
                  value={fieldApprovals[f.key]?.label_he ?? f.label_he}
                  onChange={(e) =>
                    setFieldApprovals((prev) => ({
                      ...prev,
                      [f.key]: { ...prev[f.key], label_he: e.target.value },
                    }))
                  }
                  disabled={!fieldApprovals[f.key]?.approved}
                  className="w-48 rounded-lg border border-neutral-300 px-2 py-1 text-sm disabled:opacity-40 dark:border-neutral-700 dark:bg-neutral-950"
                />
                <span className="text-xs text-neutral-400">
                  ({f.field_type}
                  {f.options ? `: ${f.options.join(", ")}` : ""})
                </span>
              </label>
            ))}
          </div>
        </div>
      )}

      <div className="rounded-xl border border-neutral-200 p-3 dark:border-neutral-800">
        <p className="mb-2 text-sm font-medium text-neutral-900 dark:text-neutral-50">קטגוריית יעד</p>
        <div className="flex flex-wrap items-center gap-3 text-sm">
          {categories.length > 0 && (
            <label className="flex items-center gap-2">
              <input
                type="radio"
                checked={categoryMode === "existing"}
                onChange={() => setCategoryMode("existing")}
              />
              <select
                value={selectedCategoryId}
                onChange={(e) => {
                  setSelectedCategoryId(e.target.value);
                  setCategoryMode("existing");
                }}
                className="rounded-lg border border-neutral-300 px-2 py-1 text-sm dark:border-neutral-700 dark:bg-neutral-950"
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name_he}
                  </option>
                ))}
              </select>
            </label>
          )}
          <label className="flex items-center gap-2">
            <input
              type="radio"
              checked={categoryMode === "new"}
              onChange={() => setCategoryMode("new")}
            />
            <input
              type="text"
              value={newCategoryName}
              onChange={(e) => {
                setNewCategoryName(e.target.value);
                setCategoryMode("new");
              }}
              placeholder="שם קטגוריה חדשה"
              className="rounded-lg border border-neutral-300 px-2 py-1 text-sm dark:border-neutral-700 dark:bg-neutral-950"
            />
          </label>
          <label className="flex items-center gap-2">
            <input type="radio" checked={categoryMode === "none"} onChange={() => setCategoryMode("none")} />
            ללא קטגוריה
          </label>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        {rows.map((row) => {
          const title = (row.values.generic_name as string) || "(ללא שם)";
          return (
            <div
              key={row.localId}
              className={`rounded-xl border border-neutral-200 p-3 dark:border-neutral-800 ${
                row.included ? "" : "opacity-40"
              }`}
            >
              <div className="mb-2 flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={row.included}
                  onChange={() => toggleRowIncluded(row.localId)}
                  aria-label={`כלול את ${title}`}
                  className="h-4 w-4"
                />
                <span className="flex-1 text-sm font-semibold text-neutral-900 dark:text-neutral-50">
                  {title}
                </span>
                <button
                  type="button"
                  onClick={() => removeRow(row.localId)}
                  aria-label="הסרת שורה"
                  className="rounded-lg p-1.5 text-neutral-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40"
                >
                  <X size={14} />
                </button>
              </div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {fieldsForForm.map((field) => (
                  <div key={field.id} className="flex flex-col gap-1">
                    <label className="text-xs font-medium text-neutral-500 dark:text-neutral-400">
                      {field.label_he}
                    </label>
                    <FieldInput
                      field={field}
                      value={row.values[field.key]}
                      onChange={(v) => updateRowValue(row.localId, field.key, v)}
                    />
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={saving}
          onClick={handleSaveAll}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
        >
          {saving ? "שומר..." : `ייבוא ${rows.filter((r) => r.included).length} תרופות`}
        </button>
        <button
          type="button"
          disabled={saving}
          onClick={onCancel}
          className="rounded-lg px-4 py-2 text-sm text-neutral-600 hover:bg-neutral-100 disabled:opacity-50 dark:text-neutral-300 dark:hover:bg-neutral-800"
        >
          ביטול
        </button>
      </div>
    </div>
  );
}
