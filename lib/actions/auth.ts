"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

// Server Action used by the drawer's "sign out" button. Runs on the server
// so it can clear the httpOnly auth cookies, then sends the browser to
// /login (middleware would redirect there anyway, but doing it explicitly
// avoids a flash of the now-unauthenticated page first).
export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

// Maps the "username" shown at /login to the real Supabase account email --
// kept server-side (never shipped to the client bundle) so the admin's
// actual email address isn't visible in devtools/view-source. Supabase
// Auth itself is still email-based under the hood; this is purely a
// friendlier login identifier layered on top. There's only ever been one
// admin account so far -- add more entries here if a second admin needs
// their own username.
const USERNAME_TO_EMAIL: Record<string, string> = {
  chief: "pedekchief@gmail.com",
};

function resolveUsername(username: string): string | null {
  return USERNAME_TO_EMAIL[username.trim().toLowerCase()] ?? null;
}

// Same generic error for "no such username" and "wrong password" -- so the
// form never reveals whether a given username exists.
const INVALID_CREDENTIALS_ERROR = "שם משתמש או סיסמה שגויים";

export async function signInWithUsername(
  username: string,
  password: string
): Promise<{ error: string | null }> {
  const email = resolveUsername(username);
  if (!email) return { error: INVALID_CREDENTIALS_ERROR };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  return { error: error ? INVALID_CREDENTIALS_ERROR : null };
}

export async function sendMagicLinkForUsername(username: string): Promise<{ error: string | null }> {
  const email = resolveUsername(username);
  if (!email) return { error: INVALID_CREDENTIALS_ERROR };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({ email });
  return { error: error ? error.message : null };
}
