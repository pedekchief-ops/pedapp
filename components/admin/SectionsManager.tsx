"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { ArrowUp, ArrowDown, Trash2, Plus, ExternalLink, Pencil, X } from "lucide-react";
import {
  createSection,
  deleteSection,
  moveSection,
  updateSection,
} from "@/lib/actions/admin";
import { useConfirmDialog } from "@/components/ConfirmDialog";
import { useToast } from "@/components/Toast";
import { OfflineToggle } from "@/components/admin/OfflineToggle";
import { DEFAULT_SECTION_ICON, SECTION_ICONS, SECTION_ICON_KEYS } from "@/lib/sectionIcons";
import type { Section } from "@/lib/supabase/types";

// Full CRUD for the app's top-level nav sections: add, rename, change
// icon, reorder (exactly the tab/card order shown on the home grid and in
// the drawer), delete, and (via OfflineToggle) flag for offline caching.
export function SectionsManager({
  sections,
  pageCounts,
}: {
  sections: Section[];
  pageCounts: Map<string, number>;
}) {
  const [editMode, setEditMode] = useState(false);
  const [adding, setAdding] = useState(false);
  const [pending, startTransition] = useTransition();
  const { confirm, dialog } = useConfirmDialog();
  const { showToast } = useToast();

  async function handleDelete(section: Section) {
    const ok = await confirm({
      title: `למחוק את הקטגוריה "${section.name_he}"?`,
      description:
        section.section_type === "medications"
          ? "כל העמודים בקטגוריה זו יימחקו. רשימת התרופות עצמה לא תלויה בקטגוריה ותישאר קיימת."
          : "כל העמודים בקטגוריה זו יימחקו יחד איתה. לא ניתן לשחזר פעולה זו.",
      confirmLabel: "מחיקה",
      danger: true,
    });
    if (!ok) return;
    startTransition(async () => {
      await deleteSection(section.id);
      showToast(`הקטגוריה "${section.name_he}" נמחקה`);
    });
  }

  if (!editMode) {
    return (
      <div className="flex flex-col gap-3">
        <ul className="flex flex-col gap-2">
          {sections.map((section) => (
            <li
              key={section.id}
              className="rounded-xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900"
            >
              <Link
                href={`/admin/${section.slug}`}
                className="flex items-center justify-between px-4 py-3"
              >
                <span className="text-sm font-medium text-neutral-900 dark:text-neutral-50">
                  {section.name_he}
                </span>
                <span className="text-xs text-neutral-400">
                  {section.section_type === "medications"
                    ? "תרופות"
                    : `${pageCounts.get(section.id) ?? 0} עמודים`}
                </span>
              </Link>
            </li>
          ))}
        </ul>
        <button
          type="button"
          onClick={() => setEditMode(true)}
          className="flex items-center justify-center gap-1 self-start rounded-lg border border-neutral-300 px-3 py-1.5 text-sm text-neutral-700 hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-800"
        >
          <Pencil size={14} />
          עריכת דפים
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <button
        type="button"
        onClick={() => setEditMode(false)}
        className="flex items-center justify-center gap-1 self-start rounded-lg border border-neutral-300 px-3 py-1.5 text-sm text-neutral-700 hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-800"
      >
        <X size={14} />
        סיום עריכה
      </button>

      <ul className="flex flex-col gap-2">
        {sections.map((section, index) => (
          <SectionRow
            key={section.id}
            section={section}
            index={index}
            total={sections.length}
            pageCount={pageCounts.get(section.id) ?? 0}
            pending={pending}
            startTransition={startTransition}
            onDelete={() => handleDelete(section)}
          />
        ))}
      </ul>

      {adding ? (
        <AddSectionForm
          onDone={() => setAdding(false)}
          onCreated={(name) => showToast(`הקטגוריה "${name}" נוספה`)}
        />
      ) : (
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="flex items-center justify-center gap-1 self-start rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:opacity-90"
        >
          <Plus size={16} />
          קטגוריה חדשה
        </button>
      )}
      {dialog}
    </div>
  );
}

function SectionRow({
  section,
  index,
  total,
  pageCount,
  pending,
  startTransition,
  onDelete,
}: {
  section: Section;
  index: number;
  total: number;
  pageCount: number;
  pending: boolean;
  startTransition: (fn: () => Promise<void> | void) => void;
  onDelete: () => void;
}) {
  const Icon = SECTION_ICONS[section.icon] ?? DEFAULT_SECTION_ICON;

  return (
    <li className="flex flex-col gap-2 rounded-xl border border-neutral-200 bg-white px-3 py-2 dark:border-neutral-800 dark:bg-neutral-900 sm:flex-row sm:items-center">
      <select
        value={section.icon}
        onChange={(e) => startTransition(() => updateSection(section.id, { icon: e.target.value }))}
        className="w-10 rounded-lg border border-neutral-300 bg-transparent p-1.5 text-center dark:border-neutral-700"
        aria-label="אייקון"
      >
        {SECTION_ICON_KEYS.map((key) => (
          <option key={key} value={key}>
            {key}
          </option>
        ))}
      </select>
      <Icon size={18} className="hidden shrink-0 text-neutral-400 sm:block" />

      <div className="flex flex-1 flex-col gap-1 sm:flex-row sm:items-center sm:gap-2">
        <input
          defaultValue={section.name_he}
          onBlur={(e) => {
            const value = e.target.value.trim();
            if (value && value !== section.name_he) {
              startTransition(() => updateSection(section.id, { name_he: value }));
            }
          }}
          placeholder="שם (עברית)"
          className="flex-1 rounded-lg border border-neutral-300 px-2 py-1 text-sm dark:border-neutral-700 dark:bg-neutral-950"
        />
        <input
          defaultValue={section.name_en}
          onBlur={(e) => {
            const value = e.target.value.trim();
            if (value !== section.name_en) {
              startTransition(() => updateSection(section.id, { name_en: value }));
            }
          }}
          placeholder="Name (English)"
          dir="ltr"
          className="flex-1 rounded-lg border border-neutral-300 px-2 py-1 text-sm dark:border-neutral-700 dark:bg-neutral-950"
        />
      </div>

      <span className="whitespace-nowrap text-xs text-neutral-400">
        {section.section_type === "medications" ? "תרופות" : `${pageCount} עמודים`}
      </span>

      <OfflineToggle sectionId={section.id} initialValue={section.is_offline_critical} />

      <div className="flex items-center gap-1">
        <Link
          href={`/admin/${section.slug}`}
          aria-label="ניהול תוכן הקטגוריה"
          className="rounded-md p-1.5 text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800"
        >
          <ExternalLink size={16} />
        </Link>
        <button
          type="button"
          disabled={index === 0 || pending}
          onClick={() => startTransition(() => moveSection(section.id, -1))}
          aria-label="הזזה למעלה"
          className="rounded-md p-1.5 text-neutral-400 hover:bg-neutral-100 disabled:opacity-30 dark:hover:bg-neutral-800"
        >
          <ArrowUp size={14} />
        </button>
        <button
          type="button"
          disabled={index === total - 1 || pending}
          onClick={() => startTransition(() => moveSection(section.id, 1))}
          aria-label="הזזה למטה"
          className="rounded-md p-1.5 text-neutral-400 hover:bg-neutral-100 disabled:opacity-30 dark:hover:bg-neutral-800"
        >
          <ArrowDown size={14} />
        </button>
        <button
          type="button"
          onClick={onDelete}
          aria-label="מחיקת קטגוריה"
          className="rounded-md p-1.5 text-neutral-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40"
        >
          <Trash2 size={14} />
        </button>
      </div>
    </li>
  );
}

function AddSectionForm({
  onDone,
  onCreated,
}: {
  onDone: () => void;
  onCreated: (name: string) => void;
}) {
  const [nameHe, setNameHe] = useState("");
  const [nameEn, setNameEn] = useState("");
  const [icon, setIcon] = useState(SECTION_ICON_KEYS[0]);
  const [sectionType, setSectionType] = useState<"generic" | "medications">("generic");
  const [pending, startTransition] = useTransition();

  function handleCreate() {
    const name = nameHe.trim();
    if (!name) return;
    startTransition(async () => {
      await createSection({ name_he: name, name_en: nameEn.trim(), icon, section_type: sectionType });
      onCreated(name);
      onDone();
    });
  }

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-dashed border-neutral-300 p-3 dark:border-neutral-700">
      <div className="flex flex-wrap gap-2">
        <input
          value={nameHe}
          onChange={(e) => setNameHe(e.target.value)}
          placeholder="שם (עברית)"
          className="flex-1 rounded-lg border border-neutral-300 px-2 py-1.5 text-sm dark:border-neutral-700 dark:bg-neutral-950"
        />
        <input
          value={nameEn}
          onChange={(e) => setNameEn(e.target.value)}
          placeholder="Name (English)"
          dir="ltr"
          className="flex-1 rounded-lg border border-neutral-300 px-2 py-1.5 text-sm dark:border-neutral-700 dark:bg-neutral-950"
        />
        <select
          value={icon}
          onChange={(e) => setIcon(e.target.value)}
          className="rounded-lg border border-neutral-300 px-2 py-1.5 text-sm dark:border-neutral-700 dark:bg-neutral-950"
        >
          {SECTION_ICON_KEYS.map((key) => (
            <option key={key} value={key}>
              {key}
            </option>
          ))}
        </select>
      </div>

      <label className="flex items-center gap-2 text-xs text-neutral-500 dark:text-neutral-400">
        <input
          type="checkbox"
          checked={sectionType === "medications"}
          onChange={(e) => setSectionType(e.target.checked ? "medications" : "generic")}
          className="h-3.5 w-3.5"
        />
        קטגוריית תרופות מובנית (טבלת תרופות עם קטגוריות/שדות, במקום עמודים רגילים)
      </label>

      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={pending || !nameHe.trim()}
          onClick={handleCreate}
          className="rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
        >
          {pending ? "יוצר..." : "יצירה"}
        </button>
        <button
          type="button"
          onClick={onDone}
          className="rounded-lg px-3 py-1.5 text-sm text-neutral-600 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800"
        >
          ביטול
        </button>
      </div>
    </div>
  );
}
