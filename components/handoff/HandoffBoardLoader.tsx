"use client";

import { useCallback, useEffect, useState } from "react";
import { HandoffBoard } from "./HandoffBoard";
import type { HandoffPatient } from "@/lib/supabase/types";

type FetchStatus = "loading" | "ready" | "error";

// Fetches from /api/handoff client-side -- same pattern as
// MedicationsBrowserLoader (and for the same reason: lets the saves in
// lib/actions/handoff.ts, which don't touch the Next.js cache, just
// trigger a plain re-fetch here instead of needing their own
// revalidation).
export function HandoffBoardLoader() {
  const [patients, setPatients] = useState<HandoffPatient[] | null>(null);
  const [status, setStatus] = useState<FetchStatus>("loading");

  const load = useCallback(() => {
    return fetch("/api/handoff")
      .then((res) => {
        if (!res.ok) throw new Error("failed to load handoff board");
        return res.json();
      })
      .then((json: { patients: HandoffPatient[] }) => {
        setPatients(json.patients);
        setStatus("ready");
      })
      .catch(() => setStatus("error"));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (status === "loading") {
    return <p className="p-4 text-sm text-neutral-500 dark:text-neutral-400">טוען...</p>;
  }

  if (status === "error" || !patients) {
    return (
      <p className="p-4 text-sm text-red-600 dark:text-red-400">
        לא ניתן לטעון את לוח המעקב. אם אתם במצב לא מקוון, ודאו שביקרתם בעמוד זה בעבר.
      </p>
    );
  }

  return <HandoffBoard patients={patients} onChanged={load} />;
}
