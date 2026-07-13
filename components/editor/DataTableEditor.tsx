"use client";

import { Plus, Trash2 } from "lucide-react";
import { useConfirmDialog } from "@/components/ConfirmDialog";
import type {
  DataTableCategory,
  DataTableColumn,
  DataTableContent,
  DataTableRow,
  DataTableSubcategory,
} from "@/lib/supabase/types";

// Editor for a data_table block: admin-defined columns, then rows grouped
// into categories and (optionally) subcategories -- see DataTableContent
// in lib/supabase/types.ts for the exact shape and
// components/blocks/DataTableBlock.tsx for the read-only counterpart.
// Column renames don't need to touch existing row data since rows key
// their cell values by the column's stable `key`, not its label.
export function DataTableEditor({
  content,
  onChange,
}: {
  content: DataTableContent;
  onChange: (content: DataTableContent) => void;
}) {
  const { confirm, dialog } = useConfirmDialog();

  function updateColumns(columns: DataTableColumn[]) {
    onChange({ ...content, columns });
  }

  function addColumn() {
    updateColumns([
      ...content.columns,
      { key: crypto.randomUUID(), label_he: `עמודה ${content.columns.length + 1}` },
    ]);
  }

  function renameColumn(key: string, label_he: string) {
    updateColumns(content.columns.map((c) => (c.key === key ? { ...c, label_he } : c)));
  }

  async function removeColumn(key: string) {
    const ok = await confirm({
      title: "למחוק את העמודה?",
      description: "הנתונים בעמודה זו יימחקו מכל השורות בטבלה.",
      confirmLabel: "מחיקה",
      danger: true,
    });
    if (!ok) return;
    updateColumns(content.columns.filter((c) => c.key !== key));
  }

  function updateCategories(categories: DataTableCategory[]) {
    onChange({ ...content, categories });
  }

  function addCategory() {
    updateCategories([
      ...content.categories,
      {
        key: crypto.randomUUID(),
        name_he: `קטגוריה ${content.categories.length + 1}`,
        rows: [],
        subcategories: [],
      },
    ]);
  }

  async function removeCategory(index: number, name: string) {
    const ok = await confirm({
      title: `למחוק את הקטגוריה "${name}"?`,
      description: "כל השורות ותתי הקטגוריות שבתוכה יימחקו גם הן.",
      confirmLabel: "מחיקה",
      danger: true,
    });
    if (!ok) return;
    updateCategories(content.categories.filter((_, i) => i !== index));
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <p className="mb-1 text-xs font-medium text-neutral-500 dark:text-neutral-400">עמודות</p>
        <div className="flex flex-wrap gap-2">
          {content.columns.map((col) => (
            <div
              key={col.key}
              className="flex items-center gap-1 rounded-lg border border-neutral-300 px-2 py-1 dark:border-neutral-700"
            >
              <input
                value={col.label_he}
                onChange={(e) => renameColumn(col.key, e.target.value)}
                className="w-24 bg-transparent text-xs outline-none"
              />
              <button type="button" onClick={() => removeColumn(col.key)} aria-label="מחיקת עמודה">
                <Trash2 size={12} className="text-neutral-400 hover:text-red-600" />
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={addColumn}
            className="flex items-center gap-1 rounded-lg border border-dashed border-neutral-300 px-2 py-1 text-xs text-neutral-500 dark:border-neutral-700 dark:text-neutral-400"
          >
            <Plus size={12} /> עמודה
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        {content.categories.map((category, index) => (
          <CategoryEditor
            key={category.key}
            columns={content.columns}
            category={category}
            onChange={(updated) =>
              updateCategories(content.categories.map((c, i) => (i === index ? updated : c)))
            }
            onRemove={() => removeCategory(index, category.name_he)}
          />
        ))}
        <button
          type="button"
          onClick={addCategory}
          className="flex items-center gap-1 self-start rounded-lg border border-dashed border-neutral-300 px-3 py-1.5 text-xs text-neutral-600 dark:border-neutral-700 dark:text-neutral-300"
        >
          <Plus size={14} /> הוספת קטגוריה
        </button>
      </div>
      {dialog}
    </div>
  );
}

function CategoryEditor({
  columns,
  category,
  onChange,
  onRemove,
}: {
  columns: DataTableColumn[];
  category: DataTableCategory;
  onChange: (category: DataTableCategory) => void;
  onRemove: () => void;
}) {
  const { confirm, dialog } = useConfirmDialog();

  function addSubcategory() {
    onChange({
      ...category,
      subcategories: [
        ...category.subcategories,
        {
          key: crypto.randomUUID(),
          name_he: `תת-קטגוריה ${category.subcategories.length + 1}`,
          rows: [],
        },
      ],
    });
  }

  async function removeSubcategory(index: number, name: string) {
    const ok = await confirm({
      title: `למחוק את "${name}"?`,
      description: "כל השורות שבתוכה יימחקו גם הן.",
      confirmLabel: "מחיקה",
      danger: true,
    });
    if (!ok) return;
    onChange({ ...category, subcategories: category.subcategories.filter((_, i) => i !== index) });
  }

  return (
    <div className="rounded-xl border border-neutral-200 p-3 dark:border-neutral-800">
      <div className="mb-2 flex items-center gap-2">
        <input
          value={category.name_he}
          onChange={(e) => onChange({ ...category, name_he: e.target.value })}
          className="flex-1 rounded-lg border border-neutral-300 px-2 py-1 text-sm font-medium dark:border-neutral-700 dark:bg-neutral-950"
        />
        <button
          type="button"
          onClick={onRemove}
          aria-label="מחיקת קטגוריה"
          className="rounded-md p-1.5 text-neutral-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40"
        >
          <Trash2 size={14} />
        </button>
      </div>

      <RowsEditor columns={columns} rows={category.rows} onChange={(rows) => onChange({ ...category, rows })} />

      <div className="mt-3 flex flex-col gap-3 border-t border-neutral-100 pt-3 dark:border-neutral-900">
        {category.subcategories.map((sub, index) => (
          <SubcategoryEditor
            key={sub.key}
            columns={columns}
            subcategory={sub}
            onChange={(updated) =>
              onChange({
                ...category,
                subcategories: category.subcategories.map((s, i) => (i === index ? updated : s)),
              })
            }
            onRemove={() => removeSubcategory(index, sub.name_he)}
          />
        ))}
        <button
          type="button"
          onClick={addSubcategory}
          className="self-start text-xs text-neutral-500 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-200"
        >
          + הוספת תת-קטגוריה
        </button>
      </div>
      {dialog}
    </div>
  );
}

function SubcategoryEditor({
  columns,
  subcategory,
  onChange,
  onRemove,
}: {
  columns: DataTableColumn[];
  subcategory: DataTableSubcategory;
  onChange: (subcategory: DataTableSubcategory) => void;
  onRemove: () => void;
}) {
  return (
    <div className="rounded-lg border border-neutral-200 p-2 ps-4 dark:border-neutral-800">
      <div className="mb-2 flex items-center gap-2">
        <input
          value={subcategory.name_he}
          onChange={(e) => onChange({ ...subcategory, name_he: e.target.value })}
          className="flex-1 rounded-lg border border-neutral-300 px-2 py-1 text-xs dark:border-neutral-700 dark:bg-neutral-950"
        />
        <button type="button" onClick={onRemove} aria-label="מחיקת תת-קטגוריה">
          <Trash2 size={12} className="text-neutral-400 hover:text-red-600" />
        </button>
      </div>
      <RowsEditor
        columns={columns}
        rows={subcategory.rows}
        onChange={(rows) => onChange({ ...subcategory, rows })}
      />
    </div>
  );
}

function RowsEditor({
  columns,
  rows,
  onChange,
}: {
  columns: DataTableColumn[];
  rows: DataTableRow[];
  onChange: (rows: DataTableRow[]) => void;
}) {
  const { confirm, dialog } = useConfirmDialog();

  function addRow() {
    onChange([...rows, { key: crypto.randomUUID(), values: {} }]);
  }

  function updateCell(rowKey: string, columnKey: string, value: string) {
    onChange(
      rows.map((r) => (r.key === rowKey ? { ...r, values: { ...r.values, [columnKey]: value } } : r))
    );
  }

  async function removeRow(rowKey: string) {
    const ok = await confirm({ title: "למחוק את השורה?", confirmLabel: "מחיקה", danger: true });
    if (!ok) return;
    onChange(rows.filter((r) => r.key !== rowKey));
  }

  if (columns.length === 0) {
    return <p className="text-xs text-neutral-400">הוסיפו עמודה אחת לפחות כדי להתחיל.</p>;
  }

  return (
    <div className="flex flex-col gap-2">
      {rows.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full min-w-max border-collapse text-xs">
            <thead>
              <tr>
                {columns.map((col) => (
                  <th
                    key={col.key}
                    className="border-b border-neutral-200 px-2 py-1 text-start text-neutral-500 dark:border-neutral-800 dark:text-neutral-400"
                  >
                    {col.label_he}
                  </th>
                ))}
                <th className="border-b border-neutral-200 dark:border-neutral-800" />
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.key}>
                  {columns.map((col) => (
                    <td key={col.key} className="border-b border-neutral-100 p-1 dark:border-neutral-900">
                      <input
                        value={row.values[col.key] ?? ""}
                        onChange={(e) => updateCell(row.key, col.key, e.target.value)}
                        className="w-full min-w-24 rounded border border-neutral-200 px-1.5 py-1 text-xs dark:border-neutral-700 dark:bg-neutral-950"
                      />
                    </td>
                  ))}
                  <td className="border-b border-neutral-100 p-1 dark:border-neutral-900">
                    <button type="button" onClick={() => removeRow(row.key)} aria-label="מחיקת שורה">
                      <Trash2 size={12} className="text-neutral-400 hover:text-red-600" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <button
        type="button"
        onClick={addRow}
        className="self-start text-xs text-neutral-500 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-200"
      >
        + הוספת שורה
      </button>
      {dialog}
    </div>
  );
}
