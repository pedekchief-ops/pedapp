"use client";

import { useState, useTransition } from "react";
import { Plus, Trash2, ArrowUp, ArrowDown, Eye, EyeOff, Pencil } from "lucide-react";
import {
  createMedicationCategory,
  deleteMedicationCategory,
  moveMedicationCategory,
  updateMedicationCategory,
} from "@/lib/actions/medications";
import { useConfirmDialog } from "@/components/ConfirmDialog";
import { useToast } from "@/components/Toast";
import type { MedicationCategory } from "@/lib/supabase/types";

// Manages the categories shown as tabs at the top of the resident-facing
// medications browser: add/rename/delete/reorder. Order here is exactly
// the left-to-right tab order (see MedicationsBrowser.tsx). Clicking a
// category's name jumps to that category's drugs on the "תרופות" tab
// (onSelectCategory, handled by MedicationsAdmin) -- renaming moved to a
// separate pencil icon so the name itself is free to act as that link.
export function CategoryManager({
  sectionSlug,
  categories,
  onSelectCategory,
}: {
  sectionSlug: string;
  categories: MedicationCategory[];
  onSelectCategory: (categoryId: string) => void;
}) {
  const [newName, setNewName] = useState("");
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const { confirm, dialog } = useConfirmDialog();
  const { showToast } = useToast();

  function commitRename(category: MedicationCategory, value: string) {
    const trimmed = value.trim();
    setRenamingId(null);
    if (trimmed && trimmed !== category.name_he) {
      startTransition(() => updateMedicationCategory(sectionSlug, category.id, { name_he: trimmed }));
    }
  }

  function handleAdd() {
    const name = newName.trim();
    if (!name) return;
    startTransition(async () => {
      await createMedicationCategory(sectionSlug, name);
      setNewName("");
      showToast(`הקטגוריה "${name}" נוספה`);
    });
  }

  async function handleDelete(category: MedicationCategory) {
    const ok = await confirm({
      title: `למחוק את הקטגוריה "${category.name_he}"?`,
      description: "התרופות שהיו בקטגוריה זו לא יימחקו, רק יפסיקו להיות משויכות אליה.",
      confirmLabel: "מחיקה",
      danger: true,
    });
    if (!ok) return;
    startTransition(async () => {
      await deleteMedicationCategory(sectionSlug, category.id);
      showToast(`הקטגוריה "${category.name_he}" נמחקה`);
    });
  }

  return (
    <div className="flex flex-col gap-2">
      {categories.map((category, index) => (
        <div
          key={category.id}
          className="flex items-center gap-2 rounded-xl border border-neutral-200 bg-white px-3 py-2 dark:border-neutral-800 dark:bg-neutral-900"
        >
          {renamingId === category.id ? (
            <input
              autoFocus
              defaultValue={category.name_he}
              onBlur={(e) => commitRename(category, e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") e.currentTarget.blur();
                if (e.key === "Escape") setRenamingId(null);
              }}
              className="flex-1 rounded-lg border border-neutral-300 bg-transparent px-1 text-sm outline-none dark:border-neutral-700"
            />
          ) : (
            <button
              type="button"
              onClick={() => onSelectCategory(category.id)}
              title="צפייה ועריכה של התרופות בקטגוריה זו"
              className="flex-1 rounded-lg px-1 py-0.5 text-start text-sm text-neutral-900 hover:underline dark:text-neutral-50"
            >
              {category.name_he}
            </button>
          )}
          <button
            type="button"
            onClick={() => setRenamingId(category.id)}
            aria-label="שינוי שם הקטגוריה"
            title="שינוי שם"
            className="rounded-md p-1 text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800"
          >
            <Pencil size={13} />
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={() =>
              startTransition(() =>
                updateMedicationCategory(sectionSlug, category.id, { is_hidden: !category.is_hidden })
              )
            }
            title={category.is_hidden ? "מוסתרת ממתמחים -- לחיצה תציג" : "מוצגת למתמחים -- לחיצה תסתיר"}
            className={`flex items-center gap-1 rounded-md px-2 py-1 text-xs disabled:opacity-30 ${
              category.is_hidden
                ? "bg-amber-100 text-amber-700 hover:bg-amber-200 dark:bg-amber-950/40 dark:text-amber-400"
                : "text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800"
            }`}
          >
            {category.is_hidden ? <EyeOff size={14} /> : <Eye size={14} />}
            {category.is_hidden && "מוסתרת"}
          </button>
          <button
            type="button"
            disabled={index === 0 || pending}
            onClick={() => startTransition(() => moveMedicationCategory(sectionSlug, category.id, -1))}
            aria-label="הזזה למעלה"
            className="rounded-md p-1 text-neutral-400 hover:bg-neutral-100 disabled:opacity-30 dark:hover:bg-neutral-800"
          >
            <ArrowUp size={14} />
          </button>
          <button
            type="button"
            disabled={index === categories.length - 1 || pending}
            onClick={() => startTransition(() => moveMedicationCategory(sectionSlug, category.id, 1))}
            aria-label="הזזה למטה"
            className="rounded-md p-1 text-neutral-400 hover:bg-neutral-100 disabled:opacity-30 dark:hover:bg-neutral-800"
          >
            <ArrowDown size={14} />
          </button>
          <button
            type="button"
            onClick={() => handleDelete(category)}
            aria-label="מחיקת קטגוריה"
            className="rounded-md p-1 text-neutral-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40"
          >
            <Trash2 size={14} />
          </button>
        </div>
      ))}

      <div className="flex items-center gap-2">
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleAdd();
          }}
          placeholder="שם קטגוריה חדשה"
          className="flex-1 rounded-lg border border-neutral-300 px-2 py-1.5 text-sm dark:border-neutral-700 dark:bg-neutral-950"
        />
        <button
          type="button"
          onClick={handleAdd}
          disabled={pending}
          className="flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
        >
          <Plus size={14} />
          הוספה
        </button>
      </div>
      {dialog}
    </div>
  );
}
