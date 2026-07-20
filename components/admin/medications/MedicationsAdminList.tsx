"use client";

import { useMemo, useState, useTransition } from "react";
import { Plus, Pencil, Trash2, FolderPlus, FolderMinus, Search } from "lucide-react";
import {
  bulkDeleteMedications,
  bulkSetMedicationCategory,
  deleteMedication,
  saveMedication,
} from "@/lib/actions/medications";
import { useConfirmDialog } from "@/components/ConfirmDialog";
import { useToast } from "@/components/Toast";
import { getMedicationSearchTexts, getMedicationTitle } from "@/lib/medications";
import { MedicationForm } from "./MedicationForm";
import type {
  MedicationCategory,
  MedicationField,
  MedicationFieldValue,
  MedicationWithCategories,
} from "@/lib/supabase/types";

// Full medication CRUD: add new, edit existing (expands inline into
// MedicationForm, same accordion pattern as the resident-facing browser),
// delete, and multi-select bulk add-to-category / remove-from-category /
// delete. Every drug's categories are shown as small tags on its row.
export function MedicationsAdminList({
  sectionSlug,
  fields,
  categories,
  medications,
}: {
  sectionSlug: string;
  fields: MedicationField[];
  categories: MedicationCategory[];
  medications: MedicationWithCategories[];
}) {
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkCategory, setBulkCategory] = useState("");
  const [search, setSearch] = useState("");
  const [saving, startSaving] = useTransition();
  const { confirm, dialog } = useConfirmDialog();
  const { showToast } = useToast();

  const categoriesById = new Map(categories.map((c) => [c.id, c]));

  const visibleMedications = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return medications;
    return medications.filter((m) =>
      getMedicationSearchTexts(fields, m.values).some((text) => text.toLowerCase().includes(query))
    );
  }, [medications, fields, search]);

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleSave(
    id: string | null,
    values: Record<string, MedicationFieldValue>,
    categoryIds: string[]
  ) {
    startSaving(async () => {
      await saveMedication(sectionSlug, { id, values, categoryIds });
      setAdding(false);
      setEditingId(null);
      showToast(id ? "התרופה עודכנה" : "התרופה נוספה");
    });
  }

  async function handleDelete(medication: MedicationWithCategories) {
    const name = getMedicationTitle(fields, medication.values) || "התרופה";
    const ok = await confirm({
      title: `למחוק את "${name}"?`,
      description: "לא ניתן לשחזר פעולה זו.",
      confirmLabel: "מחיקה",
      danger: true,
    });
    if (!ok) return;
    startSaving(async () => {
      await deleteMedication(sectionSlug, medication.id);
      showToast(`"${name}" נמחקה`);
    });
  }

  async function handleBulkDelete() {
    const ok = await confirm({
      title: `למחוק ${selected.size} תרופות?`,
      description: "לא ניתן לשחזר פעולה זו.",
      confirmLabel: "מחיקה",
      danger: true,
    });
    if (!ok) return;
    const ids = Array.from(selected);
    startSaving(async () => {
      await bulkDeleteMedications(sectionSlug, ids);
      setSelected(new Set());
      showToast(`${ids.length} תרופות נמחקו`);
    });
  }

  function handleBulkCategory(action: "add" | "remove") {
    if (!bulkCategory) return;
    const category = categoriesById.get(bulkCategory);
    const ids = Array.from(selected);
    startSaving(async () => {
      await bulkSetMedicationCategory(sectionSlug, ids, bulkCategory, action);
      setSelected(new Set());
      showToast(
        action === "add"
          ? `${ids.length} תרופות נוספו לקטגוריה "${category?.name_he}"`
          : `${ids.length} תרופות הוסרו מהקטגוריה "${category?.name_he}"`
      );
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        {!adding && (
          <button
            type="button"
            onClick={() => {
              setAdding(true);
              setEditingId(null);
            }}
            className="flex items-center justify-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:opacity-90"
          >
            <Plus size={16} />
            תרופה חדשה
          </button>
        )}
        <div className="flex flex-1 items-center gap-2 rounded-lg border border-neutral-300 px-2 py-1.5 dark:border-neutral-700">
          <Search size={14} className="text-neutral-400" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="חיפוש תרופה לפי שם..."
            className="w-full min-w-0 bg-transparent text-sm outline-none"
          />
        </div>
      </div>

      {adding && (
        <div className="rounded-xl border border-neutral-200 bg-white p-3 dark:border-neutral-800 dark:bg-neutral-900">
          <MedicationForm
            fields={fields}
            categories={categories}
            initialValues={{}}
            initialCategoryIds={[]}
            saving={saving}
            onCancel={() => setAdding(false)}
            onSave={(values, categoryIds) => handleSave(null, values, categoryIds)}
          />
        </div>
      )}

      {selected.size > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-primary/30 bg-primary/5 px-3 py-2">
          <span className="text-sm font-medium text-neutral-700 dark:text-neutral-200">
            נבחרו {selected.size}
          </span>
          <select
            value={bulkCategory}
            onChange={(e) => setBulkCategory(e.target.value)}
            className="rounded-lg border border-neutral-300 px-2 py-1 text-sm dark:border-neutral-700 dark:bg-neutral-950"
          >
            <option value="">בחירת קטגוריה...</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name_he}
              </option>
            ))}
          </select>
          <button
            type="button"
            disabled={!bulkCategory || saving}
            onClick={() => handleBulkCategory("add")}
            className="flex items-center gap-1 rounded-lg border border-neutral-300 px-2 py-1 text-sm text-neutral-700 hover:bg-neutral-50 disabled:opacity-50 dark:border-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-800"
          >
            <FolderPlus size={14} />
            הוספה
          </button>
          <button
            type="button"
            disabled={!bulkCategory || saving}
            onClick={() => handleBulkCategory("remove")}
            className="flex items-center gap-1 rounded-lg border border-neutral-300 px-2 py-1 text-sm text-neutral-700 hover:bg-neutral-50 disabled:opacity-50 dark:border-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-800"
          >
            <FolderMinus size={14} />
            הסרה
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={handleBulkDelete}
            className="rounded-lg bg-red-600 px-2 py-1 text-sm text-white hover:bg-red-700 disabled:opacity-50"
          >
            מחיקת הנבחרים
          </button>
        </div>
      )}

      {visibleMedications.length === 0 ? (
        <p className="text-sm text-neutral-500 dark:text-neutral-400">
          {medications.length === 0 ? "אין עדיין תרופות." : "לא נמצאו תרופות מתאימות לחיפוש."}
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {visibleMedications.map((medication) => {
            const isEditing = editingId === medication.id;
            const name = getMedicationTitle(fields, medication.values) || "(ללא שם)";

            return (
              <li
                key={medication.id}
                className="overflow-hidden rounded-xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900"
              >
                <div className="flex items-center gap-2 px-3 py-2">
                  <input
                    type="checkbox"
                    checked={selected.has(medication.id)}
                    onChange={() => toggleSelect(medication.id)}
                    aria-label={`בחירת ${name}`}
                    className="h-4 w-4"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setEditingId(isEditing ? null : medication.id);
                      setAdding(false);
                    }}
                    className="flex flex-1 items-center gap-2 text-start"
                  >
                    <Pencil size={14} className="text-neutral-400" />
                    <span className="text-sm font-medium text-neutral-900 dark:text-neutral-50">{name}</span>
                    <span className="flex flex-wrap gap-1">
                      {medication.categoryIds.map((id) => {
                        const category = categoriesById.get(id);
                        if (!category) return null;
                        return (
                          <span
                            key={id}
                            className="rounded-full bg-neutral-100 px-2 py-0.5 text-[11px] text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300"
                          >
                            {category.name_he}
                          </span>
                        );
                      })}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(medication)}
                    aria-label="מחיקת תרופה"
                    className="rounded-lg p-2 text-neutral-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>

                {isEditing && (
                  <div className="border-t border-neutral-100 p-3 dark:border-neutral-900">
                    <MedicationForm
                      fields={fields}
                      categories={categories}
                      initialValues={medication.values}
                      initialCategoryIds={medication.categoryIds}
                      saving={saving}
                      onCancel={() => setEditingId(null)}
                      onSave={(values, categoryIds) => handleSave(medication.id, values, categoryIds)}
                    />
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
      {dialog}
    </div>
  );
}
