"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import type {
  MedicationCategory,
  MedicationField,
  MedicationFieldValue,
  MedicationNumberRangeValue,
} from "@/lib/supabase/types";

// Dynamic add/edit form built from the admin-configured field schema (see
// FieldManager.tsx) -- every field renders a different input depending on
// its field_type, so adding a new field there immediately shows up here
// with no code change needed.
//
// initialIsHidden/onSave's isHidden -- see
// supabase/migrations/0013_medication_visibility.sql. Lets whoever's
// editing (an admin, or a clinical pharmacist reviewing content) hide this
// one drug from residents until it's been approved, independent of its
// category's own visibility.
export function MedicationForm({
  fields,
  categories,
  initialValues,
  initialCategoryIds,
  initialIsHidden,
  onSave,
  onCancel,
  saving,
}: {
  fields: MedicationField[];
  categories: MedicationCategory[];
  initialValues: Record<string, MedicationFieldValue>;
  initialCategoryIds: string[];
  initialIsHidden: boolean;
  onSave: (values: Record<string, MedicationFieldValue>, categoryIds: string[], isHidden: boolean) => void;
  onCancel: () => void;
  saving: boolean;
}) {
  const [values, setValues] = useState<Record<string, MedicationFieldValue>>(initialValues);
  const [categoryIds, setCategoryIds] = useState<string[]>(initialCategoryIds);
  const [isHidden, setIsHidden] = useState(initialIsHidden);

  function setValue(key: string, value: MedicationFieldValue) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  function toggleCategory(id: string) {
    setCategoryIds((prev) => (prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]));
  }

  return (
    <div className="flex flex-col gap-3">
      {fields.map((field) => (
        <div key={field.id} className="flex flex-col gap-1">
          <label className="text-xs font-medium text-neutral-500 dark:text-neutral-400">
            {field.label_he}
          </label>
          <FieldInput field={field} value={values[field.key]} onChange={(v) => setValue(field.key, v)} />
        </div>
      ))}

      <div>
        <p className="mb-1 text-xs font-medium text-neutral-500 dark:text-neutral-400">
          קטגוריות (ניתן לבחור יותר מאחת)
        </p>
        <div className="flex flex-wrap gap-2">
          {categories.map((category) => (
            <label
              key={category.id}
              className={`flex items-center gap-1.5 rounded-lg border px-2 py-1 text-xs ${
                categoryIds.includes(category.id)
                  ? "border-primary text-primary"
                  : "border-neutral-300 text-neutral-600 dark:border-neutral-700 dark:text-neutral-300"
              }`}
            >
              <input
                type="checkbox"
                checked={categoryIds.includes(category.id)}
                onChange={() => toggleCategory(category.id)}
                className="h-3 w-3"
              />
              {category.name_he}
            </label>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-2">
        {isHidden && (
          <span className="text-xs font-medium text-amber-600 dark:text-amber-400">
            מוסתרת ממתמחים כרגע
          </span>
        )}
        <button
          type="button"
          onClick={() => setIsHidden((v) => !v)}
          className="flex items-center gap-1.5 rounded-lg border border-neutral-300 px-2.5 py-1.5 text-xs font-medium text-neutral-600 hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
        >
          {isHidden ? <Eye size={14} /> : <EyeOff size={14} />}
          {isHidden ? "הצגה" : "הסתרה"}
        </button>
      </div>

      <div className="flex items-center gap-2 pt-2">
        <button
          type="button"
          disabled={saving}
          onClick={() => onSave(values, categoryIds, isHidden)}
          className="rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
        >
          {saving ? "שומר..." : "שמירה"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg px-3 py-1.5 text-sm text-neutral-600 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800"
        >
          ביטול
        </button>
      </div>
    </div>
  );
}

// Exported so other admin screens that need a typed per-field-type input
// outside a full MedicationForm (e.g. the PDF import review table in
// ImportReview.tsx, which reviews many rows at once rather than one drug
// with its own save/cancel) can reuse it instead of re-implementing the
// per-field_type rendering.
export function FieldInput({
  field,
  value,
  onChange,
}: {
  field: MedicationField;
  value: MedicationFieldValue;
  onChange: (value: MedicationFieldValue) => void;
}) {
  if (field.field_type === "select" && field.multiple) {
    const selected = Array.isArray(value) ? value : [];
    return (
      <div className="flex flex-wrap gap-2">
        {(field.options ?? []).map((opt) => {
          const checked = selected.includes(opt);
          return (
            <label
              key={opt}
              className={`flex items-center gap-1.5 rounded-lg border px-2 py-1 text-xs ${
                checked
                  ? "border-primary text-primary"
                  : "border-neutral-300 text-neutral-600 dark:border-neutral-700 dark:text-neutral-300"
              }`}
            >
              <input
                type="checkbox"
                checked={checked}
                onChange={() =>
                  onChange(checked ? selected.filter((o) => o !== opt) : [...selected, opt])
                }
                className="h-3 w-3"
              />
              {opt}
            </label>
          );
        })}
      </div>
    );
  }

  if (field.field_type === "select") {
    return (
      <select
        value={(value as string) ?? ""}
        onChange={(e) => onChange(e.target.value || null)}
        className="rounded-lg border border-neutral-300 px-2 py-1.5 text-sm dark:border-neutral-700 dark:bg-neutral-950"
      >
        <option value="">--</option>
        {(field.options ?? []).map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
    );
  }

  if (field.field_type === "number") {
    return (
      <input
        type="number"
        value={value == null ? "" : String(value)}
        onChange={(e) => onChange(e.target.value === "" ? null : Number(e.target.value))}
        className="rounded-lg border border-neutral-300 px-2 py-1.5 text-sm dark:border-neutral-700 dark:bg-neutral-950"
      />
    );
  }

  if (field.field_type === "number_range") {
    const range = (value as MedicationNumberRangeValue) ?? { min: null, max: null };
    return (
      <div className="flex items-center gap-2">
        <input
          type="number"
          placeholder="מינימום"
          value={range.min ?? ""}
          onChange={(e) =>
            onChange({ ...range, min: e.target.value === "" ? null : Number(e.target.value) })
          }
          className="w-24 rounded-lg border border-neutral-300 px-2 py-1.5 text-sm dark:border-neutral-700 dark:bg-neutral-950"
        />
        <span className="text-xs text-neutral-400">עד</span>
        <input
          type="number"
          placeholder="מקסימום (אופציונלי)"
          value={range.max ?? ""}
          onChange={(e) =>
            onChange({ ...range, max: e.target.value === "" ? null : Number(e.target.value) })
          }
          className="w-32 rounded-lg border border-neutral-300 px-2 py-1.5 text-sm dark:border-neutral-700 dark:bg-neutral-950"
        />
      </div>
    );
  }

  return (
    <input
      type="text"
      value={(value as string) ?? ""}
      onChange={(e) => onChange(e.target.value)}
      className="rounded-lg border border-neutral-300 px-2 py-1.5 text-sm dark:border-neutral-700 dark:bg-neutral-950"
    />
  );
}
