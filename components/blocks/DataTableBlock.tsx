import type { DataTableColumn, DataTableContent, DataTableRow } from "@/lib/supabase/types";

function Table({ columns, rows }: { columns: DataTableColumn[]; rows: DataTableRow[] }) {
  if (rows.length === 0) return null;
  return (
    // No min-w-max here on purpose: that used to force every column wide
    // enough to fit its content on one line, which is what made a
    // long-content table (e.g. the lab-form index) require a long
    // horizontal scroll to read. Cells wrap instead now (whitespace-normal
    // break-words below), so rows grow taller rather than the table
    // growing wider than the page. overflow-x-auto stays only as a
    // fallback for an unbreakable single "word" (a long code with no
    // spaces), which is rare.
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                className="whitespace-normal break-words border-b border-neutral-200 px-3 py-2 text-start font-semibold text-neutral-700 dark:border-neutral-800 dark:text-neutral-200"
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
                <td
                  key={col.key}
                  className="whitespace-normal break-words px-3 py-2 align-top text-neutral-700 dark:text-neutral-300"
                >
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
