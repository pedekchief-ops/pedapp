"use client";

import { useState } from "react";
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
export function MedicationForm({
  fields,
  categories,
  initialValues,
  initialCategoryIds,
  onSave,
  onCancel,
  saving,
}: {
  fields: MedicationField[];
  categories: MedicationCategory[];
  initialValues: Record<string, MedicationFieldValue>;
  initialCategoryIds: string[];
  onSave: (values: Record<string, MedicationFieldValue>, categoryIds: string[]) => void;
  onCancel: () => void;
  saving: boolean;
}) {
  const [values, setValues] = useState<Record<string, MedicationFieldValue>>(initialValues);
  const [categoryIds, setCategoryIds] = useState<string[]>(initialCategoryIds);

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

      <div className="flex items-center gap-2 pt-2">
        <button
          type="button"
          disabled={saving}
          onClick={() => onSave(values, categoryIds)}
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

function FieldInput({
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
