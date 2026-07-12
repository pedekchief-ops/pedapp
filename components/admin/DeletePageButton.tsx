"use client";

import { useTransition } from "react";
import { Trash2 } from "lucide-react";
import { deletePage } from "@/lib/actions/admin";

export function DeletePageButton({
  pageId,
  sectionSlug,
  pageTitle,
}: {
  pageId: string;
  sectionSlug: string;
  pageTitle: string;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      aria-label="מחיקת עמוד"
      onClick={() => {
        if (confirm(`למחוק את העמוד "${pageTitle}"? לא ניתן לשחזר פעולה זו.`)) {
          startTransition(() => deletePage(pageId, sectionSlug));
        }
      }}
      className="rounded-lg p-2 text-neutral-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-50 dark:hover:bg-red-950/40"
    >
      <Trash2 size={16} />
    </button>
  );
}
