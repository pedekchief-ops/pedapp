import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Runs on every matched request (see proxy.ts's matcher). Does two jobs:
//
// 1. Refreshes the Supabase auth session cookies on each request. Supabase
//    sessions expire; without this, a page load after expiry would silently
//    keep stale cookies and auth calls would start failing.
// 2. Gates access:
//    - /admin requires a real, non-anonymous signed-in admin.
//    - Everything else (the resident-facing app) is open to anyone with the
//      link, no account needed. We still give first-time visitors a
//      lightweight anonymous Supabase session (rather than no session at
//      all) purely so RLS policies and per-user features that key off
//      auth.uid() -- push notification subscriptions, "updated by" audit
//      fields, etc. -- keep working unchanged. This requires Anonymous
//      Sign-ins to be enabled in the Supabase dashboard (Authentication ->
//      Sign In / Providers); if it isn't, signInAnonymously() below fails
//      and we simply let the request through anyway rather than block the
//      whole app on that.
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          // Cookies must be written to both the incoming request (so this
          // same middleware invocation sees them) and the outgoing response
          // (so the browser stores them).
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // getUser() (not getSession()) re-validates the token against Supabase
  // Auth rather than trusting the cookie blindly -- required for a real
  // authorization decision, see lib/supabase/server.ts for the same note.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const isLoginPage = pathname.startsWith("/login");
  const isAdminPath = pathname.startsWith("/admin");

  if (isAdminPath) {
    if (!user || user.is_anonymous) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      url.searchParams.set("redirectTo", pathname);
      return NextResponse.redirect(url);
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profile?.role !== "admin") {
      const url = request.nextUrl.clone();
      url.pathname = "/";
      return NextResponse.redirect(url);
    }

    return supabaseResponse;
  }

  // Resident-facing routes: establish an anonymous session for brand-new
  // visitors so the rest of the app has a consistent auth.uid() to work
  // with. Failures here (e.g. the dashboard toggle isn't on yet) are
  // swallowed -- the app should degrade, not hard-fail, since RLS itself
  // is the real gate on what an unauthenticated request can read.
  if (!user && !isLoginPage) {
    const { error } = await supabase.auth.signInAnonymously();
    if (error) {
      return supabaseResponse;
    }
  }

  // A real (non-anonymous) admin who's already signed in gets sent home
  // instead of seeing the login form again. Anonymous residents are left
  // alone so they can still reach /login to create a real admin account.
  if (user && !user.is_anonymous && isLoginPage) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
