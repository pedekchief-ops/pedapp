"use client";

import { useTransition } from "react";
import { toggleSectionOfflineCritical } from "@/lib/actions/admin";

// Lets an admin flag a section's content for proactive offline caching
// (see lib/offline/critical-sections.ts, used right after login). Off by
// default for every section except Medications (seeded in
// supabase/migrations/0002_seed_sections.sql).
export function OfflineToggle({
  sectionId,
  initialValue,
}: {
  sectionId: string;
  initialValue: boolean;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <label className="flex items-center gap-2 text-xs text-neutral-500 dark:text-neutral-400">
      <input
        type="checkbox"
        defaultChecked={initialValue}
        disabled={pending}
        onChange={(e) =>
          startTransition(() => {
            toggleSectionOfflineCritical(sectionId, e.target.checked);
          })
        }
        className="h-3.5 w-3.5"
      />
      זמין ללא אינטרנט
    </label>
  );
}
