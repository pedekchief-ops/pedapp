"use client";

import { useState } from "react";
import type { BlockNode, TabsContainerContent } from "@/lib/supabase/types";
import { BlockRenderer } from "./BlockRenderer";

// True if targetId is block itself or lives anywhere in its subtree --
// used below to find which tab to open for a search-result deep link that
// points at something nested arbitrarily deep (a block inside a tab
// inside another tabs_container, etc.), not just a direct child.
function subtreeContains(block: BlockNode, targetId: string): boolean {
  if (block.id === targetId) return true;
  return block.children.some((child) => subtreeContains(child, targetId));
}

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
  // A nested block only exists in the DOM at all while its tab is active
  // (see the .filter() below) -- so a search-result deep link (#block-<id>,
  // see the scroll effect in app/(resident)/[sectionSlug]/[pageSlug]/page.tsx)
  // to something inside a non-default tab would otherwise land on nothing,
  // since that tab's content was never rendered in the first place. Picking
  // the right initial tab here, before first paint, is what makes that
  // content reachable at all -- the scroll effect can only open/scroll to
  // an element that already exists.
  const [active, setActive] = useState(() => {
    if (typeof window !== "undefined" && window.location.hash) {
      const targetId = window.location.hash.slice(1).replace(/^block-/, "");
      const matchingTab = childBlocks.find((child) => subtreeContains(child, targetId));
      if (matchingTab?.tab_key) return matchingTab.tab_key;
    }
    return content.tabs[0]?.key;
  });

  return (
    <div className="overflow-hidden rounded-xl border border-neutral-200 dark:border-neutral-800">
      <div className="flex overflow-x-auto border-b border-neutral-200 dark:border-neutral-800">
        {content.tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActive(tab.key)}
            className={`whitespace-nowrap border-b-2 px-4 py-2 text-sm font-medium transition ${
              active === tab.key
                ? "border-primary text-primary"
                : "border-transparent text-neutral-500 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-200"
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
