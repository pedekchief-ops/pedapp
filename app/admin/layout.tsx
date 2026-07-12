import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { signOut } from "@/lib/actions/auth";

// Deliberately minimal chrome, separate from AppChrome (the resident-facing
// shell) -- the admin CMS is a distinct tool for a different task, not
// another "page" of the resident app. Access is enforced by middleware.ts
// (see lib/supabase/middleware.ts), which redirects non-admins before this
// layout ever renders.
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-neutral-50 dark:bg-neutral-950">
      <header className="sticky top-0 z-40 flex items-center justify-between border-b border-neutral-200 bg-white px-4 py-3 dark:border-neutral-800 dark:bg-neutral-900">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="flex items-center gap-1 text-sm text-neutral-600 hover:text-neutral-900 dark:text-neutral-300 dark:hover:text-neutral-50"
          >
            <ArrowRight size={16} />
            חזרה לאפליקציה
          </Link>
          <span className="text-sm font-semibold text-neutral-900 dark:text-neutral-50">
            ניהול תוכן
          </span>
        </div>
        <form action={signOut}>
          <button
            type="submit"
            className="text-sm text-red-600 hover:underline dark:text-red-400"
          >
            התנתקות
          </button>
        </form>
      </header>
      <main className="mx-auto max-w-3xl p-4">{children}</main>
    </div>
  );
}
