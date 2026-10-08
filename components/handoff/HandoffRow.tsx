"use client";

import { useState, useTransition } from "react";
import { Save, Trash2, Copy, ClipboardPaste } from "lucide-react";
import { saveHandoffPatientRow, clearOrDeleteHandoffPatientRow } from "@/lib/actions/handoff";
import { useToast } from "@/components/Toast";
import type { HandoffPatient } from "@/lib/supabase/types";

type Draft = Pick<
  HandoffPatient,
  | "location"
  | "patient_name"
  | "age"
  | "background"
  | "active_issue"
  | "medications"
  | "evening_tasks"
  | "evening_exam"
  | "morning_labs"
>;

// Copy/paste deliberately excludes location: a bed's room number belongs
// to the bed, not the patient being moved into or out of it -- pasting a
// copied patient into another row should never overwrite where that row
// already says it is.
export type PatientFields = Omit<Draft, "location">;

function hasAnyContent(fields: PatientFields): boolean {
  return Boolean(
    fields.patient_name ||
      fields.age ||
      fields.background ||
      fields.active_issue ||
      fields.medications ||
      fields.evening_tasks ||
      fields.evening_exam ||
      fields.morning_labs
  );
}

function toDraft(row: HandoffPatient): Draft {
  return {
    location: row.location,
    patient_name: row.patient_name,
    age: row.age,
    background: row.background,
    active_issue: row.active_issue,
    medications: row.medications,
    evening_tasks: row.evening_tasks,
    evening_exam: row.evening_exam,
    morning_labs: row.morning_labs,
  };
}

const inputClass =
  "w-full min-w-0 resize-y rounded-md border border-neutral-200 bg-white px-1.5 py-1 text-xs outline-none focus:border-primary dark:border-neutral-700 dark:bg-neutral-950 print:resize-none print:border-0 print:bg-transparent print:p-0 print:text-[8px] print:text-black";

// One row's edits stay purely local (never written on every keystroke)
// until "שמור מטופל" is clicked -- see the file header on
// lib/actions/handoff.ts for why. `confirmClear` is owned by the parent
// table (one shared confirm dialog instance, not one per row -- a dialog
// can't live inside a <tr> without breaking table markup).
//
// `touched` tracks whether THIS row has unsaved local edits, separately
// from comparing draft against the current `row` prop: a fixed row keeps
// the same id forever (its bed doesn't disappear), so React reuses the
// same component instance across a refetch -- without `touched`, there'd
// be no way to tell "the admin is mid-edit, don't clobber it" apart from
// "this row was just cleared/saved server-side, do sync the new values"
// once `row` changes out from under an untouched draft.
export function HandoffRow({
  row,
  onChanged,
  confirmClear,
  clipboard,
  onCopy,
  confirmPaste,
}: {
  row: HandoffPatient;
  onChanged: () => Promise<void>;
  confirmClear: (row: HandoffPatient) => Promise<boolean>;
  clipboard: PatientFields | null;
  onCopy: (fields: PatientFields) => void;
  confirmPaste: () => Promise<boolean>;
}) {
  const { showToast } = useToast();
  const [draft, setDraft] = useState<Draft>(() => toDraft(row));
  const [touched, setTouched] = useState(false);
  // "Adjusting state when a prop changes" via the render-time pattern
  // (react.dev/learn/you-might-not-need-an-effect), not an effect: an
  // effect here would commit the stale draft for one extra frame before
  // correcting itself. Only resyncs when untouched, so an admin's
  // in-progress edit on a row another refetch just happened to touch
  // (e.g. the "רענון" button, or a different row's save) is never
  // clobbered.
  const [syncedRow, setSyncedRow] = useState(row);
  if (row !== syncedRow && !touched) {
    setSyncedRow(row);
    setDraft(toDraft(row));
  }
  const [pending, startTransition] = useTransition();

  function update<K extends keyof Draft>(key: K, value: Draft[K]) {
    setDraft((d) => ({ ...d, [key]: value }));
    setTouched(true);
  }

  function handleSave() {
    startTransition(async () => {
      await saveHandoffPatientRow({ id: row.id, ...draft });
      // Wait for the refetch so `row` already reflects what was just
      // saved by the time `touched` flips back off and the effect above
      // re-syncs the draft -- otherwise it would briefly sync against the
      // stale pre-save row.
      await onChanged();
      setTouched(false);
    });
  }

  async function handleClearOrDelete() {
    const ok = await confirmClear(row);
    if (!ok) return;
    startTransition(async () => {
      await clearOrDeleteHandoffPatientRow(row.id);
      await onChanged();
      setTouched(false);
    });
  }

  function handleCopy() {
    onCopy({
      patient_name: draft.patient_name,
      age: draft.age,
      background: draft.background,
      active_issue: draft.active_issue,
      medications: draft.medications,
      evening_tasks: draft.evening_tasks,
      evening_exam: draft.evening_exam,
      morning_labs: draft.morning_labs,
    });
    showToast("מטופל הועתק");
  }

  async function handlePaste() {
    if (!clipboard) return;
    if (hasAnyContent(draft)) {
      const ok = await confirmPaste();
      if (!ok) return;
    }
    setDraft((d) => ({ ...d, ...clipboard }));
    setTouched(true);
  }

  return (
    <tr className="border-b border-neutral-200 align-top dark:border-neutral-800">
      <td className="p-1">
        <input
          value={draft.location}
          onChange={(e) => update("location", e.target.value)}
          className={inputClass}
        />
      </td>
      <td className="p-1">
        <input
          value={draft.patient_name}
          onChange={(e) => update("patient_name", e.target.value)}
          className={inputClass}
        />
      </td>
      <td className="p-1">
        <input value={draft.age} onChange={(e) => update("age", e.target.value)} className={inputClass} />
      </td>
      <td className="p-1">
        <textarea
          rows={2}
          value={draft.background}
          onChange={(e) => update("background", e.target.value)}
          className={inputClass}
        />
      </td>
      <td className="p-1">
        <textarea
          rows={2}
          value={draft.active_issue}
          onChange={(e) => update("active_issue", e.target.value)}
          className={inputClass}
        />
      </td>
      <td className="p-1">
        <textarea
          rows={2}
          value={draft.medications}
          onChange={(e) => update("medications", e.target.value)}
          className={inputClass}
        />
      </td>
      <td className="p-1">
        <textarea
          rows={2}
          value={draft.evening_tasks}
          onChange={(e) => update("evening_tasks", e.target.value)}
          className={inputClass}
        />
      </td>
      <td className="p-1 text-center">
        <input
          type="checkbox"
          checked={draft.evening_exam}
          onChange={(e) => update("evening_exam", e.target.checked)}
          className="h-4 w-4"
        />
      </td>
      <td className="p-1 text-center">
        <input
          type="checkbox"
          checked={draft.morning_labs}
          onChange={(e) => update("morning_labs", e.target.checked)}
          className="h-4 w-4"
        />
      </td>
      <td className="p-1 print:hidden">
        <div className="flex flex-col gap-1">
          <button
            type="button"
            disabled={!touched || pending}
            onClick={handleSave}
            className="flex items-center justify-center gap-1 rounded-md bg-primary px-1.5 py-1 text-[11px] font-medium text-primary-foreground hover:opacity-90 disabled:opacity-40"
          >
            <Save size={12} />
            שמור מטופל
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={handleClearOrDelete}
            className="flex items-center justify-center gap-1 rounded-md border border-neutral-300 px-1.5 py-1 text-[11px] text-neutral-500 hover:bg-red-50 hover:text-red-600 disabled:opacity-40 dark:border-neutral-700 dark:hover:bg-red-950/40"
          >
            <Trash2 size={12} />
            מחק שורה
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={handleCopy}
            className="flex items-center justify-center gap-1 rounded-md border border-neutral-300 px-1.5 py-1 text-[11px] text-neutral-500 hover:bg-neutral-100 disabled:opacity-40 dark:border-neutral-700 dark:hover:bg-neutral-800"
          >
            <Copy size={12} />
            העתק מטופל
          </button>
          <button
            type="button"
            disabled={!clipboard || pending}
            onClick={handlePaste}
            className="flex items-center justify-center gap-1 rounded-md border border-neutral-300 px-1.5 py-1 text-[11px] text-neutral-500 hover:bg-neutral-100 disabled:opacity-40 dark:border-neutral-700 dark:hover:bg-neutral-800"
          >
            <ClipboardPaste size={12} />
            הדבק מטופל
          </button>
        </div>
      </td>
    </tr>
  );
}
