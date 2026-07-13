import type { DataTableColumn, DataTableContent, DataTableRow } from "@/lib/supabase/types";

function Table({ columns, rows }: { columns: DataTableColumn[]; rows: DataTableRow[] }) {
  if (rows.length === 0) return null;
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-max border-collapse text-sm">
        <thead>
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                className="border-b border-neutral-200 px-3 py-2 text-start font-semibold text-neutral-700 dark:border-neutral-800 dark:text-neutral-200"
              >
                {col.label_he}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.key} className="border-b border-neutral-100 dark:border-neutral-900">
              {columns.map((col) => (
                <td key={col.key} className="px-3 py-2 text-neutral-700 dark:text-neutral-300">
                  {row.values[col.key] ?? ""}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Renders a configurable table (admin-defined columns via /admin, rows
// grouped into categories/subcategories) -- see DataTableContent in
// lib/supabase/types.ts. Each category/subcategory is a <details> element
// so a long medications table can be collapsed on mobile instead of
// forcing one giant scroll.
export function DataTableBlock({ content }: { content: DataTableContent }) {
  return (
    <div className="flex flex-col divide-y divide-neutral-200 rounded-xl border border-neutral-200 dark:divide-neutral-800 dark:border-neutral-800">
      {content.categories.map((category) => (
        <details key={category.key} open className="p-3">
          <summary className="cursor-pointer text-sm font-semibold text-neutral-900 dark:text-neutral-50">
            {category.name_he}
          </summary>
          <div className="mt-2 flex flex-col gap-3">
            <Table columns={content.columns} rows={category.rows} />
            {category.subcategories.map((sub) => (
              <details key={sub.key} open className="ps-3">
                <summary className="cursor-pointer text-xs font-medium text-neutral-600 dark:text-neutral-300">
                  {sub.name_he}
                </summary>
                <div className="mt-2">
                  <Table columns={content.columns} rows={sub.rows} />
                </div>
              </details>
            ))}
          </div>
        </details>
      ))}
    </div>
  );
}
