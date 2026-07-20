"use client";

import { useState, useTransition } from "react";
import { Plus, Trash2, ArrowUp, ArrowDown, Star } from "lucide-react";
import {
  createMedicationField,
  deleteMedicationField,
  moveMedicationField,
  setTitleMedicationField,
  updateMedicationField,
} from "@/lib/actions/medications";
import { useConfirmDialog } from "@/components/ConfirmDialog";
import { useToast } from "@/components/Toast";
import type { MedicationField, MedicationFieldType } from "@/lib/supabase/types";

const FIELD_TYPE_LABELS: Record<MedicationFieldType, string> = {
  text: "טקסט",
  number: "מספר",
  number_range: "טווח (מ-עד)",
  select: "רשימת בחירה",
};

// Manages the admin-configurable schema of what's entered per drug (see
// supabase/migrations/0008_medications.sql). Every drug in the system
// shares this same field set; changing it here changes what the "add/edit
// medication" form in MedicationsAdminList.tsx asks for next.
export function FieldManager({
  sectionSlug,
  fields,
}: {
  sectionSlug: string;
  fields: MedicationField[];
}) {
  const [pending, startTransition] = useTransition();
  const { confirm, dialog } = useConfirmDialog();
  const { showToast } = useToast();
  const selectFields = fields.filter((f) => f.field_type === "select");

  async function handleDelete(field: MedicationField) {
    const ok = await confirm({
      title: `למחוק את השדה "${field.label_he}"?`,
      description: "הנתונים שהוזנו לשדה זה בכל התרופות יימחקו.",
      confirmLabel: "מחיקה",
      danger: true,
    });
    if (!ok) return;
    startTransition(async () => {
      await deleteMedicationField(sectionSlug, field.id);
      showToast(`השדה "${field.label_he}" נמחק`);
    });
  }

  return (
    <div className="flex flex-col gap-3">
      {fields.map((field, index) => (
        <FieldRow
          key={field.id}
          sectionSlug={sectionSlug}
          field={field}
          index={index}
          total={fields.length}
          selectFields={selectFields}
          pending={pending}
          startTransition={startTransition}
          onDelete={() => handleDelete(field)}
        />
      ))}
      <AddFieldForm sectionSlug={sectionSlug} />
      {dialog}
    </div>
  );
}

function FieldRow({
  sectionSlug,
  field,
  index,
  total,
  selectFields,
  pending,
  startTransition,
  onDelete,
}: {
  sectionSlug: string;
  field: MedicationField;
  index: number;
  total: number;
  selectFields: MedicationField[];
  pending: boolean;
  startTransition: (fn: () => Promise<void> | void) => void;
  onDelete: () => void;
}) {
  const [optionsText, setOptionsText] = useState((field.options ?? []).join(", "));

  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-3 dark:border-neutral-800 dark:bg-neutral-900">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => startTransition(() => setTitleMedicationField(sectionSlug, field.id))}
          aria-label="קביעה כשדה כותרת"
          title="שדה הכותרת (השם שמוצג בראש כל תרופה)"
          className={field.is_title ? "text-amber-500" : "text-neutral-300 hover:text-amber-400"}
        >
          <Star size={16} fill={field.is_title ? "currentColor" : "none"} />
        </button>
        <input
          defaultValue={field.label_he}
          onBlur={(e) => {
            const value = e.target.value.trim();
            if (value && value !== field.label_he) {
              startTransition(() => updateMedicationField(sectionSlug, field.id, { label_he: value }));
            }
          }}
          className="flex-1 rounded-lg border border-transparent bg-transparent px-1 text-sm font-medium outline-none focus:border-neutral-300 dark:focus:border-neutral-700"
        />
        <select
          value={field.field_type}
          onChange={(e) =>
            startTransition(() =>
              updateMedicationField(sectionSlug, field.id, {
                field_type: e.target.value as MedicationFieldType,
              })
            )
          }
          className="rounded-lg border border-neutral-300 px-2 py-1 text-xs dark:border-neutral-700 dark:bg-neutral-950"
        >
          {Object.entries(FIELD_TYPE_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <button
          type="button"
          disabled={index === 0 || pending}
          onClick={() => startTransition(() => moveMedicationField(sectionSlug, field.id, -1))}
          aria-label="הזזה למעלה"
          className="rounded-md p-1 text-neutral-400 hover:bg-neutral-100 disabled:opacity-30 dark:hover:bg-neutral-800"
        >
          <ArrowUp size={14} />
        </button>
        <button
          type="button"
          disabled={index === total - 1 || pending}
          onClick={() => startTransition(() => moveMedicationField(sectionSlug, field.id, 1))}
          aria-label="הזזה למטה"
          className="rounded-md p-1 text-neutral-400 hover:bg-neutral-100 disabled:opacity-30 dark:hover:bg-neutral-800"
        >
          <ArrowDown size={14} />
        </button>
        <button
          type="button"
          onClick={onDelete}
          aria-label="מחיקת שדה"
          className="rounded-md p-1 text-neutral-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40"
        >
          <Trash2 size={14} />
        </button>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-3 ps-6 text-xs text-neutral-500 dark:text-neutral-400">
        <label className="flex items-center gap-1.5">
          <input
            type="checkbox"
            checked={field.show_in_summary}
            onChange={(e) =>
              startTransition(() =>
                updateMedicationField(sectionSlug, field.id, { show_in_summary: e.target.checked })
              )
            }
            className="h-3.5 w-3.5"
          />
          הצגה בתצוגה המצומצמת
        </label>

        {(field.field_type === "number" || field.field_type === "number_range") && (
          <label className="flex items-center gap-1.5">
            יחידה מ:
            <select
              value={field.unit_field_key ?? ""}
              onChange={(e) =>
                startTransition(() =>
                  updateMedicationField(sectionSlug, field.id, {
                    unit_field_key: e.target.value || null,
                  })
                )
              }
              className="rounded border border-neutral-300 px-1 py-0.5 dark:border-neutral-700 dark:bg-neutral-950"
            >
              <option value="">ללא</option>
              {selectFields
                .filter((f) => f.id !== field.id)
                .map((f) => (
                  <option key={f.id} value={f.key}>
                    {f.label_he}
                  </option>
                ))}
            </select>
          </label>
        )}

        {field.field_type === "select" && (
          <input
            value={optionsText}
            onChange={(e) => setOptionsText(e.target.value)}
            onBlur={() =>
              startTransition(() =>
                updateMedicationField(sectionSlug, field.id, {
                  options: optionsText
                    .split(",")
                    .map((s) => s.trim())
                    .filter(Boolean),
                })
              )
            }
            placeholder="אפשרויות, מופרדות בפסיק"
            className="flex-1 rounded border border-neutral-300 px-2 py-1 dark:border-neutral-700 dark:bg-neutral-950"
          />
        )}
      </div>
    </div>
  );
}

function AddFieldForm({ sectionSlug }: { sectionSlug: string }) {
  const [key, setKey] = useState("");
  const [label, setLabel] = useState("");
  const [type, setType] = useState<MedicationFieldType>("text");
  const [pending, startTransition] = useTransition();
  const { showToast } = useToast();

  function handleAdd() {
    const trimmedLabel = label.trim();
    if (!trimmedLabel) return;
    const fieldKey =
      key.trim() ||
      trimmedLabel
        .replace(/[^\p{L}\p{N}]+/gu, "_")
        .replace(/^_+|_+$/g, "")
        .toLowerCase() ||
      crypto.randomUUID();

    startTransition(async () => {
      await createMedicationField(sectionSlug, {
        key: fieldKey,
        label_he: trimmedLabel,
        field_type: type,
        options: type === "select" ? [] : null,
        unit_field_key: null,
      });
      setKey("");
      setLabel("");
      setType("text");
      showToast(`השדה "${trimmedLabel}" נוסף`);
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl border border-dashed border-neutral-300 p-3 dark:border-neutral-700">
      <input
        value={label}
        onChange={(e) => setLabel(e.target.value)}
        placeholder="שם השדה החדש"
        className="flex-1 rounded-lg border border-neutral-300 px-2 py-1.5 text-sm dark:border-neutral-700 dark:bg-neutral-950"
      />
      <select
        value={type}
        onChange={(e) => setType(e.target.value as MedicationFieldType)}
        className="rounded-lg border border-neutral-300 px-2 py-1.5 text-sm dark:border-neutral-700 dark:bg-neutral-950"
      >
        {Object.entries(FIELD_TYPE_LABELS).map(([value, l]) => (
          <option key={value} value={value}>
            {l}
          </option>
        ))}
      </select>
      <button
        type="button"
        onClick={handleAdd}
        disabled={pending}
        className="flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
      >
        <Plus size={14} />
        הוספת שדה
      </button>
    </div>
  );
}
