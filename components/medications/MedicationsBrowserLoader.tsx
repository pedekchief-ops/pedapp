"use client";

import { Suspense, useEffect, useState } from "react";
import { MedicationsBrowser } from "./MedicationsBrowser";
import type { MedicationCategory, MedicationField, MedicationWithCategories } from "@/lib/supabase/types";

type FetchStatus = "loading" | "ready" | "error";

interface MedicationsData {
  fields: MedicationField[];
  categories: MedicationCategory[];
  medications: MedicationWithCategories[];
}

// Fetches from /api/medications (JSON) rather than being server-rendered,
// same reasoning as app/(resident)/[sectionSlug]/[pageSlug]/page.tsx: it's
// what lets the offline service worker cache the request, which matters
// here since Medications defaults to is_offline_critical.
export function MedicationsBrowserLoader() {
  const [data, setData] = useState<MedicationsData | null>(null);
  const [status, setStatus] = useState<FetchStatus>("loading");

  useEffect(() => {
    let cancelled = false;

    fetch("/api/medications")
      .then((res) => {
        if (!res.ok) throw new Error("failed to load medications");
        return res.json();
      })
      .then((json: MedicationsData) => {
        if (!cancelled) {
          setData(json);
          setStatus("ready");
        }
      })
      .catch(() => {
        if (!cancelled) setStatus("error");
      });

    return () => {
      cancelled = true;
    };
  }, []);

  if (status === "loading") {
    return <p className="p-4 text-sm text-neutral-500 dark:text-neutral-400">טוען...</p>;
  }

  if (status === "error" || !data) {
    return (
      <p className="p-4 text-sm text-red-600 dark:text-red-400">
        לא ניתן לטעון את רשימת התרופות. אם אתם במצב לא מקוון, ודאו שביקרתם בעמוד זה בעבר.
      </p>
    );
  }

  return (
    // MedicationsBrowser reads useSearchParams() (for the ?open=<id> deep
    // link from search results), which Next.js requires a Suspense
    // boundary around.
    <Suspense>
      <MedicationsBrowser fields={data.fields} categories={data.categories} medications={data.medications} />
    </Suspense>
  );
}
