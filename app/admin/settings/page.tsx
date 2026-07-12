import { createClient } from "@/lib/supabase/server";
import { getAppSettings } from "@/lib/data";
import { SettingsForm } from "@/components/admin/SettingsForm";

export default async function AdminSettingsPage() {
  const supabase = await createClient();
  const settings = await getAppSettings(supabase);

  return (
    <div>
      <h1 className="mb-1 text-lg font-semibold text-neutral-900 dark:text-neutral-50">
        עיצוב האפליקציה
      </h1>
      <p className="mb-4 text-sm text-neutral-500 dark:text-neutral-400">
        שינויים כאן חלים על כל האפליקציה עבור כל המשתמשים.
      </p>
      <SettingsForm initial={settings} />
    </div>
  );
}
