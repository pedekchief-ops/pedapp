"use client";

import { Suspense, useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Mode = "signin" | "signup";

// useSearchParams() opts the page out of static rendering unless it's
// wrapped in Suspense (Next.js requirement) -- the wrapper here is just
// that boundary; LoginFormInner has the actual page content.
export function LoginForm({ logoUrl }: { logoUrl: string | null }) {
  return (
    <Suspense>
      <LoginFormInner logoUrl={logoUrl} />
    </Suspense>
  );
}

function LoginFormInner({ logoUrl }: { logoUrl: string | null }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirectTo") || "/";

  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function handlePasswordSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setNotice(null);
    setLoading(true);

    const supabase = createClient();

    if (mode === "signin") {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      setLoading(false);
      if (signInError) {
        setError(signInError.message);
        return;
      }
      router.push(redirectTo);
      router.refresh();
      return;
    }

    // Every visitor already has a silent anonymous session (see
    // lib/supabase/middleware.ts). Sign out of it first so signUp always
    // creates a clean, standalone account rather than potentially linking
    // onto the anonymous one.
    const {
      data: { user: currentUser },
    } = await supabase.auth.getUser();
    if (currentUser?.is_anonymous) {
      await supabase.auth.signOut();
    }

    // Sign-up: new accounts always land as the 'resident' role (see the
    // handle_new_user trigger in supabase/migrations/0001_init_schema.sql).
    // Promoting a resident to admin is a deliberate manual step, not
    // something this form can do.
    const { error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    });
    setLoading(false);
    if (signUpError) {
      setError(signUpError.message);
      return;
    }
    setNotice("נשלח מייל אימות. אשרו את המייל ואז התחברו.");
    setMode("signin");
  }

  async function handleMagicLink() {
    if (!email) {
      setError("הזינו כתובת מייל תחילה");
      return;
    }
    setError(null);
    setNotice(null);
    setLoading(true);
    const supabase = createClient();
    const { error: otpError } = await supabase.auth.signInWithOtp({ email });
    setLoading(false);
    if (otpError) {
      setError(otpError.message);
      return;
    }
    setNotice("נשלח קישור התחברות למייל שלכם.");
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-neutral-50 px-4 dark:bg-neutral-950">
      <div className="w-full max-w-sm rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
        <div className="mb-1 flex items-center gap-2">
          {logoUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logoUrl} alt="" className="h-8 w-8 rounded object-contain" />
          )}
          <h1 className="text-xl font-semibold text-neutral-900 dark:text-neutral-50">
            כניסת צוות ניהול
          </h1>
        </div>
        <p className="mb-6 text-sm text-neutral-500 dark:text-neutral-400">
          {mode === "signin"
            ? "האפליקציה עצמה פתוחה לכולם ללא התחברות -- זה רק לניהול תוכן"
            : "יצירת חשבון חדש (יתחיל כמשתמש רגיל; הפיכה למנהל היא פעולה ידנית)"}
        </p>

        <form onSubmit={handlePasswordSubmit} className="flex flex-col gap-3">
          {mode === "signup" && (
            <input
              type="text"
              placeholder="שם מלא"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              className="rounded-lg border border-neutral-300 bg-transparent px-3 py-2 text-sm outline-none focus:border-primary dark:border-neutral-700"
            />
          )}
          <input
            type="email"
            placeholder="אימייל"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            dir="ltr"
            className="rounded-lg border border-neutral-300 bg-transparent px-3 py-2 text-sm outline-none focus:border-primary dark:border-neutral-700"
          />
          <input
            type="password"
            placeholder="סיסמה"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            dir="ltr"
            className="rounded-lg border border-neutral-300 bg-transparent px-3 py-2 text-sm outline-none focus:border-primary dark:border-neutral-700"
          />

          {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
          {notice && <p className="text-sm text-emerald-600 dark:text-emerald-400">{notice}</p>}

          <button
            type="submit"
            disabled={loading}
            className="mt-1 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90 disabled:opacity-50"
          >
            {loading ? "רגע..." : mode === "signin" ? "התחברות" : "הרשמה"}
          </button>
        </form>

        <button
          type="button"
          onClick={handleMagicLink}
          disabled={loading}
          className="mt-3 w-full text-center text-xs text-neutral-500 underline decoration-dotted hover:text-neutral-800 disabled:opacity-50 dark:text-neutral-400 dark:hover:text-neutral-200"
        >
          שלחו לי קישור התחברות למייל במקום
        </button>

        <button
          type="button"
          onClick={() => {
            setMode(mode === "signin" ? "signup" : "signin");
            setError(null);
            setNotice(null);
          }}
          className="mt-4 w-full text-center text-sm text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100"
        >
          {mode === "signin" ? "אין לכם חשבון? הרשמה" : "כבר יש לכם חשבון? התחברות"}
        </button>
      </div>
    </div>
  );
}
