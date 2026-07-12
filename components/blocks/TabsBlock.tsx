"use client";

import { useState } from "react";
import type { BlockNode, TabsContainerContent } from "@/lib/supabase/types";
import { BlockRenderer } from "./BlockRenderer";

// Renders a tabs_container block: a horizontal, scrollable tab strip (built
// from content.tabs) and, below it, whichever child blocks carry a
// matching tab_key (see supabase/migrations/0001_init_schema.sql for how
// nesting works). Needs client-side state for the active tab, which is why
// this -- and everything it recursively renders -- runs in the browser.
export function TabsBlock({
  content,
  childBlocks,
}: {
  content: TabsContainerContent;
  childBlocks: BlockNode[];
}) {
  const [active, setActive] = useState(content.tabs[0]?.key);

  return (
    <div className="overflow-hidden rounded-xl border border-neutral-200 dark:border-neutral-800">
      <div className="flex overflow-x-auto border-b border-neutral-200 dark:border-neutral-800">
        {content.tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActive(tab.key)}
            className={`whitespace-nowrap px-4 py-2 text-sm font-medium transition ${
              active === tab.key
                ? "border-b-2 border-neutral-900 text-neutral-900 dark:border-neutral-100 dark:text-neutral-50"
                : "text-neutral-500 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-200"
            }`}
          >
            {tab.label_he}
          </button>
        ))}
      </div>
      <div className="flex flex-col gap-4 p-4">
        {childBlocks
          .filter((child) => child.tab_key === active)
          .map((child) => (
            <BlockRenderer key={child.id} block={child} />
          ))}
      </div>
    </div>
  );
}
