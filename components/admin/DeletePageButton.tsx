"use client";

import { useTransition } from "react";
import { Trash2 } from "lucide-react";
import { deletePage } from "@/lib/actions/admin";
import { useConfirmDialog } from "@/components/ConfirmDialog";
import { useToast } from "@/components/Toast";

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
  const { confirm, dialog } = useConfirmDialog();
  const { showToast } = useToast();

  async function handleClick() {
    const ok = await confirm({
      title: `למחוק את העמוד "${pageTitle}"?`,
      description: "לא ניתן לשחזר פעולה זו.",
      confirmLabel: "מחיקה",
      danger: true,
    });
    if (!ok) return;
    startTransition(async () => {
      await deletePage(pageId, sectionSlug);
      showToast(`העמוד "${pageTitle}" נמחק`);
    });
  }

  return (
    <>
      <button
        type="button"
        disabled={pending}
        aria-label="מחיקת עמוד"
        onClick={handleClick}
        className="rounded-lg p-2 text-neutral-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-50 dark:hover:bg-red-950/40"
      >
        <Trash2 size={16} />
      </button>
      {dialog}
    </>
  );
}
