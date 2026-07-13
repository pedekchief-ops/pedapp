import { createClient } from "@/lib/supabase/server";
import { getAppSettings, getProfile } from "@/lib/data";
import { getPublicUrl } from "@/lib/supabase/storage";
import { AppChrome } from "@/components/nav/AppChrome";

// Shared shell for every resident-facing route (home grid, section lists,
// page views, search). Fetches the signed-in user's profile once here so
// AppChrome can decide whether to show the "admin" drawer link, without
// every child route re-fetching it.
export default async function ResidentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const profile = user ? await getProfile(supabase, user.id) : null;

  const settings = await getAppSettings(supabase);
  const logoUrl = settings.logo_storage_path
    ? getPublicUrl("images", settings.logo_storage_path)
    : null;

  return (
    <AppChrome profile={profile} logoUrl={logoUrl} isRealAccount={!!user && !user.is_anonymous}>
      {children}
    </AppChrome>
  );
}
