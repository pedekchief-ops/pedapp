"use client";

import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { useUnsavedChangesGuard } from "@/components/nav/UnsavedChangesGuard";

// Goes to the previous screen in browser history, rather than a fixed
// "home"/"admin root" link -- so a resident three levels into content, or
// an admin three screens into editing, has a way back that actually means
// "back" instead of "start over from the top". If there's no in-app
// history (e.g. this tab's very first load), the browser simply falls
// through to wherever it would have gone anyway.
//
// confirmNavigation is a no-op (always resolves true) unless this renders
// inside AppChrome's UnsavedChangesProvider -- app/admin/layout.tsx uses
// this same component from its own, separate header with no such
// provider, and should keep navigating normally there.
export function BackButton({ className }: { className?: string }) {
  const router = useRouter();
  const { confirmNavigation } = useUnsavedChangesGuard();

  async function handleClick() {
    if (await confirmNavigation()) router.back();
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label="חזרה"
      className={
        className ??
        "rounded-lg p-2 text-neutral-700 hover:bg-neutral-100 dark:text-neutral-200 dark:hover:bg-neutral-800"
      }
    >
      <ArrowRight size={20} />
    </button>
  );
}
