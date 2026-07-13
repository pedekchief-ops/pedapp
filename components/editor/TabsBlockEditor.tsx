"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";
import { BlockList } from "./BlockList";
import { useConfirmDialog } from "@/components/ConfirmDialog";
import type { BlockDraft, TabsContainerContent } from "@/lib/supabase/types";

// Manages a tabs_container block's tab metadata (add/rename/remove) and,
// below it, the nested BlockList for whichever tab is currently active.
// `children` holds every tab's blocks together, distinguished by
// `tab_key` -- this component is responsible for splitting/merging that
// flat array as the admin switches tabs or edits the active one.
export function TabsBlockEditor({
  content,
  childBlocks,
  onChange,
}: {
  content: TabsContainerContent;
  childBlocks: BlockDraft[];
  onChange: (update: { content?: TabsContainerContent; children?: BlockDraft[] }) => void;
}) {
  const [activeKey, setActiveKey] = useState<string | undefined>(content.tabs[0]?.key);
  const { confirm, dialog } = useConfirmDialog();

  function addTab() {
    const key = crypto.randomUUID();
    const nextTabs = [...content.tabs, { key, label_he: `טאב ${content.tabs.length + 1}` }];
    onChange({ content: { tabs: nextTabs } });
    setActiveKey(key);
  }

  function renameTab(key: string, label_he: string) {
    onChange({
      content: { tabs: content.tabs.map((t) => (t.key === key ? { ...t, label_he } : t)) },
    });
  }

  async function removeTab(key: string) {
    if (content.tabs.length <= 1) return;
    const tab = content.tabs.find((t) => t.key === key);
    const ok = await confirm({
      title: `למחוק את הטאב "${tab?.label_he}"?`,
      description: "כל התוכן בתוך הטאב הזה יימחק גם הוא. השינוי ייכנס לתוקף רק לאחר לחיצה על פרסום.",
      confirmLabel: "מחיקה",
      danger: true,
    });
    if (!ok) return;
    const nextTabs = content.tabs.filter((t) => t.key !== key);
    const nextChildren = childBlocks.filter((c) => c.tab_key !== key);
    onChange({ content: { tabs: nextTabs }, children: nextChildren });
    if (activeKey === key) setActiveKey(nextTabs[0]?.key);
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        {content.tabs.map((tab) => (
          <div
            key={tab.key}
            className={`flex items-center gap-1 rounded-lg border px-2 py-1 ${
              activeKey === tab.key ? "border-primary" : "border-neutral-200 dark:border-neutral-800"
            }`}
          >
            <input
              value={tab.label_he}
              onChange={(e) => renameTab(tab.key, e.target.value)}
              onFocus={() => setActiveKey(tab.key)}
              className="w-20 bg-transparent text-xs outline-none"
            />
            {content.tabs.length > 1 && (
              <button
                type="button"
                onClick={() => removeTab(tab.key)}
                aria-label="מחיקת טאב"
              >
                <X size={12} className="text-neutral-400" />
              </button>
            )}
          </div>
        ))}
        <button
          type="button"
          onClick={addTab}
          className="flex items-center gap-1 rounded-lg border border-dashed border-neutral-300 px-2 py-1 text-xs text-neutral-500 dark:border-neutral-700 dark:text-neutral-400"
        >
          <Plus size={12} /> טאב
        </button>
      </div>

      <div className="border-t border-neutral-200 pt-3 dark:border-neutral-800">
        <BlockList
          blocks={childBlocks.filter((c) => c.tab_key === activeKey)}
          tabKey={activeKey ?? null}
          onChange={(updatedTabBlocks) => {
            const otherTabsBlocks = childBlocks.filter((c) => c.tab_key !== activeKey);
            onChange({ children: [...otherTabsBlocks, ...updatedTabBlocks] });
          }}
        />
      </div>
      {dialog}
    </div>
  );
}
