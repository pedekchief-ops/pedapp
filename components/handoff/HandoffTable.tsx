"use client";

import { Plus, Printer, RefreshCw } from "lucide-react";
import { useTransition } from "react";
import { addHandoffPatientRow } from "@/lib/actions/handoff";
import { useConfirmDialog } from "@/components/ConfirmDialog";
import { HandoffRow, type PatientFields } from "./HandoffRow";
import type { HandoffPatient, HandoffWard } from "@/lib/supabase/types";

const COLUMNS = [
  "מיקום (חדר)",
  "שם",
  "גיל",
  "רקע",
  "מחלה פעילה וסיבת אשפוז",
  "תרופות (כולל תמיכה נשימתית ונוזלים)",
  "משימות ערב",
  "בדיקה בערב?",
  "מעבדה בוקר?",
];

const WARD_LABELS: Record<HandoffWard, string> = {
  near_side: "צד קרוב",
  far_side: "צד רחוק",
  seven: "שביעיה",
  satellites: "סטליטים",
  annex: "שלוחה",
};

// One ward's table: fixed-bed wards (near_side/far_side/seven) only ever
// show their seeded rows -- no add button, since a row there is a real
// bed, not a free entry. The two free-form wards get a "+ מיטה" button
// (addHandoffPatientRow) instead.
export function HandoffTable({
  ward,
  rows,
  onChanged,
  clipboard,
  onCopy,
}: {
  ward: HandoffWard;
  rows: HandoffPatient[];
  onChanged: () => Promise<void>;
  clipboard: PatientFields | null;
  onCopy: (fields: PatientFields) => void;
}) {
  const [pending, startTransition] = useTransition();
  const { confirm, dialog } = useConfirmDialog();
  const isFreeForm = ward === "satellites" || ward === "annex";

  function confirmClear(row: HandoffPatient) {
    return confirm({
      title: row.is_fixed ? "לרוקן את השורה?" : "למחוק את השורה?",
      description: row.is_fixed
        ? "כל פרטי המטופל יימחקו. המיקום (המיטה) יישאר במקום."
        : "השורה תוסר לגמרי מהטבלה. לא ניתן לשחזר פעולה זו.",
      confirmLabel: row.is_fixed ? "ריקון" : "מחיקה",
      danger: true,
    });
  }

  function confirmPaste() {
    return confirm({
      title: "להדביק על תוכן קיים?",
      description: "השורה הזו כבר מכילה נתונים -- הדבקה תחליף אותם. הנתונים הקודמים לא יישמרו.",
      confirmLabel: "הדבקה",
      danger: true,
    });
  }

  function handleAddRow() {
    startTransition(async () => {
      await addHandoffPatientRow(ward as "satellites" | "annex");
      onChanged();
    });
  }

  return (
    <div>
      <div className="mb-2 flex items-center justify-between print:hidden">
        <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-50">
          {WARD_LABELS[ward]}
        </h2>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onChanged}
            className="flex items-center gap-1 rounded-lg border border-neutral-300 px-2.5 py-1.5 text-xs text-neutral-600 hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
          >
            <RefreshCw size={13} />
            רענון
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="flex items-center gap-1 rounded-lg border border-neutral-300 px-2.5 py-1.5 text-xs text-neutral-600 hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
          >
            <Printer size={13} />
            הדפסה
          </button>
        </div>
      </div>

      <h2 className="mb-2 hidden text-sm font-semibold text-black print:block">{WARD_LABELS[ward]}</h2>

      <div className="overflow-x-auto print:overflow-visible">
        <table className="w-full min-w-[960px] table-fixed border-collapse text-xs print:min-w-0 print:table-auto">
          <thead>
            <tr className="border-b border-neutral-300 text-start text-[11px] font-medium text-neutral-500 dark:border-neutral-700 dark:text-neutral-400 print:text-[9px] print:text-black">
              {COLUMNS.map((label) => (
                <th key={label} className="p-1 text-start font-medium">
                  {label}
                </th>
              ))}
              <th className="p-1 print:hidden" />
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <HandoffRow
                key={row.id}
                row={row}
                onChanged={onChanged}
                confirmClear={confirmClear}
                clipboard={clipboard}
                onCopy={onCopy}
                confirmPaste={confirmPaste}
              />
            ))}
          </tbody>
        </table>
      </div>

      {rows.length === 0 && (
        <p className="mt-2 text-xs text-neutral-400 print:hidden">אין עדיין מטופלים באגף זה.</p>
      )}

      {isFreeForm && (
        <button
          type="button"
          disabled={pending}
          onClick={handleAddRow}
          className="mt-2 flex items-center gap-1 rounded-lg border border-dashed border-neutral-300 px-3 py-1.5 text-xs text-neutral-600 hover:bg-neutral-50 disabled:opacity-50 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-900 print:hidden"
        >
          <Plus size={14} />
          הוספת מיטה
        </button>
      )}
      {dialog}
    </div>
  );
}
