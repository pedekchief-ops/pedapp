"use client";

import { useState } from "react";
import { HandoffTable } from "./HandoffTable";
import type { PatientFields } from "./HandoffRow";
import type { HandoffPatient, HandoffWard } from "@/lib/supabase/types";

// Tab order exactly as given: צד קרוב, צד רחוק, שביעיה, סטליטים, שלוחה.
const WARDS: { key: HandoffWard; label: string }[] = [
  { key: "near_side", label: "צד קרוב" },
  { key: "far_side", label: "צד רחוק" },
  { key: "seven", label: "שביעיה" },
  { key: "satellites", label: "סטליטים" },
  { key: "annex", label: "שלוחה" },
];

// Only the active ward's table is ever mounted (same pattern as
// MedicationsAdmin's tabs) -- besides the usual reason (no point rendering
// four tables nobody's looking at), it's also what makes "הדפסה" print
// just the one table on screen instead of all five.
export function HandoffBoard({
  patients,
  onChanged,
}: {
  patients: HandoffPatient[];
  onChanged: () => Promise<void>;
}) {
  const [ward, setWard] = useState<HandoffWard>("near_side");
  // Lives here, not in HandoffTable, specifically so it survives a ward
  // tab switch -- only the active ward's HandoffTable is ever mounted
  // (see the comment below), so a clipboard owned by it would be lost the
  // moment the admin switched tabs to paste somewhere else, e.g. copying
  // a patient out of a fixed room into a newly added satellite bed.
  const [clipboard, setClipboard] = useState<PatientFields | null>(null);
  const rows = patients.filter((p) => p.ward === ward);

  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-1 border-b border-neutral-200 dark:border-neutral-800 print:hidden">
        {WARDS.map((w) => (
          <button
            key={w.key}
            type="button"
            onClick={() => setWard(w.key)}
            className={`border-b-2 px-3 py-2 text-sm font-medium transition ${
              ward === w.key
                ? "border-primary text-primary"
                : "border-transparent text-neutral-500 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-200"
            }`}
          >
            {w.label}
          </button>
        ))}
      </div>

      <HandoffTable
        ward={ward}
        rows={rows}
        onChanged={onChanged}
        clipboard={clipboard}
        onCopy={setClipboard}
      />
    </div>
  );
}
