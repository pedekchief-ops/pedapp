"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import { Menu, X, Moon, Sun, LogOut, ShieldCheck, Search, Home } from "lucide-react";
import { signOut } from "@/lib/actions/auth";
import { OfflinePrefetcher } from "@/components/OfflinePrefetcher";
import { PushSubscribeToggle } from "@/components/PushSubscribeToggle";
import { SearchOverlay } from "@/components/search/SearchOverlay";
import { BackButton } from "@/components/BackButton";
import type { Profile, Section } from "@/lib/supabase/types";

// The persistent chrome around every resident-facing page: a top bar with a
// hamburger button and a search icon (opens SearchOverlay from anywhere in
// the app), plus the slide-in drawer the hamburger opens (home link,
// dark-mode toggle, admin link for admins, sign out). Kept as one client
// component so the open/close state and the header buttons can share state
// without prop-drilling through a context.
export function AppChrome({
  profile,
  logoUrl,
  isRealAccount,
  sections,
  children,
}: {
  profile: Profile | null;
  logoUrl: string | null;
  isRealAccount: boolean;
  sections: Section[];
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const pathname = usePathname();
  const isHome = pathname === "/";

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-40 flex items-center gap-1 border-b border-neutral-200 bg-white/90 px-2 py-3 backdrop-blur dark:border-neutral-800 dark:bg-neutral-950/90">
        {!isHome && <BackButton />}
        <button
          type="button"
          aria-label="פתיחת תפריט"
          onClick={() => setOpen(true)}
          className="rounded-lg p-2 text-neutral-700 hover:bg-neutral-100 dark:text-neutral-200 dark:hover:bg-neutral-800"
        >
          <Menu size={22} />
        </button>
        <Link href="/" className="flex flex-1 items-center gap-2 px-1 text-base font-semibold text-neutral-900 dark:text-neutral-50">
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logoUrl} alt="" className="h-7 w-7 rounded object-contain" />
          ) : (
            <span className="h-2 w-2 rounded-full bg-primary" aria-hidden />
          )}
          מדריך התמחות בילדים
        </Link>
        <button
          type="button"
          aria-label="חיפוש"
          onClick={() => setSearchOpen(true)}
          className="rounded-lg p-2 text-neutral-700 hover:bg-neutral-100 dark:text-neutral-200 dark:hover:bg-neutral-800"
        >
          <Search size={20} />
        </button>
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
                {isRealAccount ? profile?.full_name || "תפריט" : "תפריט"}
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

            {profile?.role === "admin" && (
              <DrawerLink
                href="/admin"
                icon={<ShieldCheck size={18} />}
                label="ניהול תוכן"
                onNavigate={() => setOpen(false)}
              />
            )}

            <ThemeToggle />
            <PushSubscribeToggle />

            {/* Sign-out only makes sense for a real (non-anonymous)
                account -- residents browsing without one never "signed
                in" to anything, see isRealAccount in
                app/(resident)/layout.tsx. */}
            {isRealAccount ? (
              <form action={signOut} className="mt-auto pt-2">
                <button
                  type="submit"
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40"
                >
                  <LogOut size={18} />
                  התנתקות
                </button>
              </form>
            ) : (
              <div className="mt-auto pt-2">
                <DrawerLink
                  href="/login"
                  icon={<ShieldCheck size={18} />}
                  label="כניסת צוות ניהול"
                  onNavigate={() => setOpen(false)}
                />
              </div>
            )}
          </div>
        </div>
      )}

      {searchOpen && <SearchOverlay onClose={() => setSearchOpen(false)} sections={sections} />}
      <OfflinePrefetcher />
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
