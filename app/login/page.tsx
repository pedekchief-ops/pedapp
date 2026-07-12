import { createClient } from "@/lib/supabase/server";
import { getAppSettings } from "@/lib/data";
import { getPublicUrl } from "@/lib/supabase/storage";
import { LoginForm } from "@/components/LoginForm";

export default async function LoginPage() {
  const supabase = await createClient();
  const settings = await getAppSettings(supabase);
  const logoUrl = settings.logo_storage_path
    ? getPublicUrl("images", settings.logo_storage_path)
    : null;

  return <LoginForm logoUrl={logoUrl} />;
}
