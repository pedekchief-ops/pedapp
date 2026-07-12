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
