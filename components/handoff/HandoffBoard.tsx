"use client";

import { useCallback, useEffect, useState } from "react";
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

// Every ward's table stays mounted at all times -- only the active one is
// shown (the rest get Tailwind's `hidden`, which also keeps them out of
// "הדפסה" since it's unconditional, not a screen-only hide). This used to
// conditionally *mount* just the active ward instead, which seemed
// harmless (and is what MedicationsAdmin's tabs still do, where nothing
// is ever mid-edit between keystroke and an explicit save) -- but here,
// a row's typed/pasted-but-not-yet-"שמור מטופל"-ed edits live only in
// that HandoffRow's local state. Switching tabs away unmounted the whole
// inactive ward's component tree, silently discarding any such edits with
// no warning -- which is exactly what happened to four satellite patients
// pasted in but never saved before the tab (or the whole page) was left.
// Keeping every ward mounted means there's no unmount to lose that state
// to; the beforeunload guard below covers the one remaining way to lose
// it (closing/navigating away from the page entirely).
export function HandoffBoard({
  patients,
  onChanged,
}: {
  patients: HandoffPatient[];
  onChanged: () => Promise<void>;
}) {
  const [ward, setWard] = useState<HandoffWard>("near_side");
  // Lives here, not in HandoffTable, specifically so it survives a ward
  // tab switch -- copying a patient out of a fixed room into a newly
  // added satellite/annex bed means the clipboard needs to outlive
  // whichever table it was copied from.
  const [clipboard, setClipboard] = useState<PatientFields | null>(null);
  const [dirtyRowIds, setDirtyRowIds] = useState<Set<string>>(new Set());

  const onDirtyChange = useCallback((rowId: string, dirty: boolean) => {
    setDirtyRowIds((prev) => {
      const isDirty = prev.has(rowId);
      if (dirty === isDirty) return prev;
      const next = new Set(prev);
      if (dirty) next.add(rowId);
      else next.delete(rowId);
      return next;
    });
  }, []);

  // Same pattern as components/editor/PageEditor.tsx's unpublished-edits
  // warning -- the one way to lose unsaved work that keeping every ward
  // mounted (above) doesn't already cover.
  useEffect(() => {
    if (dirtyRowIds.size === 0) return;
    function handleBeforeUnload(e: BeforeUnloadEvent) {
      e.preventDefault();
    }
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [dirtyRowIds]);

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

      {WARDS.map((w) => (
        <div key={w.key} className={w.key === ward ? "" : "hidden"}>
          <HandoffTable
            ward={w.key}
            rows={patients.filter((p) => p.ward === w.key)}
            onChanged={onChanged}
            clipboard={clipboard}
            onCopy={setClipboard}
            onDirtyChange={onDirtyChange}
          />
        </div>
      ))}
    </div>
  );
}
