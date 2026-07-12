import { createServerClient } from "@supabase/ssr";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

// Supabase client for use on the server: Server Components, Route Handlers,
// and Server Actions. Wires the client's cookie storage to Next's cookie
// jar so the user's auth session travels with each request.
//
// Server Components can't write cookies (Next.js restriction), so `setAll`
// is wrapped in a try/catch -- when called from a Server Component this is a
// silent no-op and is harmless as long as `middleware.ts` is refreshing the
// session on every request (which it does, see middleware.ts).
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // Called from a Server Component -- safe to ignore, see comment above.
          }
        },
      },
    }
  );
}

// Admin-privileged client that bypasses Row Level Security entirely using
// the service role key. Server-only: never import this from a Client
// Component or expose SUPABASE_SERVICE_ROLE_KEY to the browser. Used for
// operations that must act across all users, e.g. sending a push
// notification to every resident's stored subscription.
export function createServiceRoleClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}
