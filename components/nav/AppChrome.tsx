"use client";

import { useState } from "react";
import Link from "next/link";
import { useTheme } from "next-themes";
import { Menu, X, Moon, Sun, LogOut, ShieldCheck, Search, Home } from "lucide-react";
import { signOut } from "@/lib/actions/auth";
import type { Profile } from "@/lib/supabase/types";

// The persistent chrome around every resident-facing page: a top bar with a
// hamburger button, and the slide-in drawer it opens (home link, search,
// dark-mode toggle, admin link for admins, sign out). Kept as one client
// component so the open/close state and the header button can share state
// without prop-drilling through a context.
export function AppChrome({
  profile,
  children,
}: {
  profile: Profile | null;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-40 flex items-center gap-3 border-b border-neutral-200 bg-white/90 px-4 py-3 backdrop-blur dark:border-neutral-800 dark:bg-neutral-950/90">
        <button
          type="button"
          aria-label="פתיחת תפריט"
          onClick={() => setOpen(true)}
          className="rounded-lg p-2 text-neutral-700 hover:bg-neutral-100 dark:text-neutral-200 dark:hover:bg-neutral-800"
        >
          <Menu size={22} />
        </button>
        <Link href="/" className="text-base font-semibold text-neutral-900 dark:text-neutral-50">
          מדריך התמחות בילדים
        </Link>
      </header>

      <main className="flex-1">{children}</main>

      {open && (
        <div className="fixed inset-0 z-50">
          {/* Backdrop */}
          <button
            aria-label="סגירת תפריט"
            className="absolute inset-0 bg-black/40"
            onClick={() => setOpen(false)}
          />
          {/* Panel: anchored to the logical "start" edge, which is the right
              edge in our RTL-only layout (see the accompanying note in
              app/globals.css about why translate-x is used directly rather
              than a logical transform utility). */}
          <div className="absolute inset-y-0 start-0 flex w-72 max-w-[80vw] flex-col gap-1 bg-white p-4 shadow-xl dark:bg-neutral-900">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-medium text-neutral-500 dark:text-neutral-400">
                {profile?.full_name || "תפריט"}
              </span>
              <button
                type="button"
                aria-label="סגירה"
                onClick={() => setOpen(false)}
                className="rounded-lg p-1.5 text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800"
              >
                <X size={18} />
              </button>
            </div>

            <DrawerLink href="/" icon={<Home size={18} />} label="בית" onNavigate={() => setOpen(false)} />
            <DrawerLink href="/search" icon={<Search size={18} />} label="חיפוש" onNavigate={() => setOpen(false)} />

            {profile?.role === "admin" && (
              <DrawerLink
                href="/admin"
                icon={<ShieldCheck size={18} />}
                label="ניהול תוכן"
                onNavigate={() => setOpen(false)}
              />
            )}

            <ThemeToggle />

            <form action={signOut} className="mt-auto pt-2">
              <button
                type="submit"
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40"
              >
                <LogOut size={18} />
                התנתקות
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function DrawerLink({
  href,
  icon,
  label,
  onNavigate,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  onNavigate: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-neutral-700 hover:bg-neutral-100 dark:text-neutral-200 dark:hover:bg-neutral-800"
    >
      {icon}
      {label}
    </Link>
  );
}

function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-neutral-700 hover:bg-neutral-100 dark:text-neutral-200 dark:hover:bg-neutral-800"
    >
      {isDark ? <Sun size={18} /> : <Moon size={18} />}
      {isDark ? "מצב בהיר" : "מצב כהה"}
    </button>
  );
}
