"use client";

import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";

// Goes to the previous screen in browser history, rather than a fixed
// "home"/"admin root" link -- so a resident three levels into content, or
// an admin three screens into editing, has a way back that actually means
// "back" instead of "start over from the top". If there's no in-app
// history (e.g. this tab's very first load), the browser simply falls
// through to wherever it would have gone anyway.
export function BackButton({ className }: { className?: string }) {
  const router = useRouter();
  return (
    <button
      type="button"
      onClick={() => router.back()}
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
