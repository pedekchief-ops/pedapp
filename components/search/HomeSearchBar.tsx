"use client";

import { useState } from "react";
import { Search } from "lucide-react";
import { SearchOverlay } from "./SearchOverlay";
import type { Section } from "@/lib/supabase/types";

// A prominent, full-width search bar for the home page -- above the
// section-card grid, not tucked behind the small header icon (which stays,
// for access from any other page). Self-contained (owns its own open
// state, renders its own SearchOverlay instance) rather than wired through
// AppChrome, since it only ever needs to exist on "/" and the header icon
// already covers everywhere else.
export function HomeSearchBar({ sections }: { sections: Section[] }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mb-4 flex w-full items-center gap-3 rounded-2xl border border-neutral-200 bg-white px-4 py-3.5 text-start shadow-sm transition hover:border-neutral-300 dark:border-neutral-800 dark:bg-neutral-900 dark:hover:border-neutral-700"
      >
        <Search size={20} className="shrink-0 text-neutral-400" />
        <span className="text-sm text-neutral-500 dark:text-neutral-400">חיפוש בכל האפליקציה...</span>
      </button>
      {open && <SearchOverlay onClose={() => setOpen(false)} sections={sections} />}
    </>
  );
}
