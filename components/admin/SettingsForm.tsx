"use client";

import { useRef, useState, useTransition } from "react";
import { Upload, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { getPublicUrl } from "@/lib/supabase/storage";
import { updateAppSettings } from "@/lib/actions/admin";
import type { AppSettings } from "@/lib/supabase/types";

// Admin-facing form for the single app_settings row (see
// supabase/migrations/0005_app_settings.sql). Logo upload writes directly
// to the 'images' Storage bucket from the browser (same pattern as
// components/editor/FileUploader.tsx), then the resulting path is saved
// via updateAppSettings alongside the color/theme fields.
export function SettingsForm({ initial }: { initial: AppSettings }) {
  const [logoPath, setLogoPath] = useState(initial.logo_storage_path);
  const [primaryColor, setPrimaryColor] = useState(initial.primary_color);
  const [defaultTheme, setDefaultTheme] = useState(initial.default_theme);
  const [uploading, setUploading] = useState(false);
  const [pending, startTransition] = useTransition();
  const [status, setStatus] = useState<"idle" | "saved" | "error">("idle");
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleLogoFile(file: File) {
    setUploading(true);
    const supabase = createClient();
    // Storage keys must be plain ASCII -- see the matching comment in
    // components/editor/FileUploader.tsx for why the original filename
    // (which may contain Hebrew/spaces/etc.) can't be used directly.
    const dotIndex = file.name.lastIndexOf(".");
    const rawExtension = dotIndex > -1 ? file.name.slice(dotIndex) : "";
    const safeExtension = rawExtension.replace(/[^a-zA-Z0-9.]/g, "");
    const path = `branding/logo-${Date.now()}${safeExtension}`;
    const { error } = await supabase.storage.from("images").upload(path, file, {
      upsert: true,
    });
    setUploading(false);
    if (error) {
      setStatus("error");
      return;
    }
    setLogoPath(path);
  }

  function handleSave() {
    setStatus("idle");
    startTransition(async () => {
      try {
        await updateAppSettings({
          logoStoragePath: logoPath,
          primaryColor,
          defaultTheme,
        });
        setStatus("saved");
      } catch {
        setStatus("error");
      }
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <section className="rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
        <h2 className="mb-3 text-sm font-semibold text-neutral-900 dark:text-neutral-50">לוגו</h2>
        <div className="flex items-center gap-3">
          {logoPath ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={getPublicUrl("images", logoPath)}
              alt=""
              className="h-14 w-14 rounded-lg border border-neutral-200 object-contain dark:border-neutral-800"
            />
          ) : (
            <div className="flex h-14 w-14 items-center justify-center rounded-lg border border-dashed border-neutral-300 text-xs text-neutral-400 dark:border-neutral-700">
              אין
            </div>
          )}
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            hidden
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleLogoFile(file);
              e.target.value = "";
            }}
          />
          <button
            type="button"
            disabled={uploading}
            onClick={() => inputRef.current?.click()}
            className="flex items-center gap-1.5 rounded-lg border border-dashed border-neutral-300 px-3 py-1.5 text-xs text-neutral-600 hover:bg-neutral-50 disabled:opacity-50 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
          >
            <Upload size={14} />
            {uploading ? "מעלה..." : "העלאת לוגו"}
          </button>
          {logoPath && (
            <button
              type="button"
              onClick={() => setLogoPath(null)}
              className="flex items-center gap-1 text-xs text-red-600 hover:underline dark:text-red-400"
            >
              <X size={14} />
              הסרה
            </button>
          )}
        </div>
      </section>

      <section className="rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
        <h2 className="mb-3 text-sm font-semibold text-neutral-900 dark:text-neutral-50">
          צבע ראשי
        </h2>
        <div className="flex items-center gap-3">
          <input
            type="color"
            value={primaryColor}
            onChange={(e) => setPrimaryColor(e.target.value)}
            className="h-10 w-14 cursor-pointer rounded border border-neutral-300 bg-transparent dark:border-neutral-700"
          />
          <input
            type="text"
            value={primaryColor}
            onChange={(e) => setPrimaryColor(e.target.value)}
            dir="ltr"
            className="w-32 rounded-lg border border-neutral-300 px-2 py-1.5 text-sm dark:border-neutral-700 dark:bg-neutral-950"
          />
        </div>
        <p className="mt-2 text-xs text-neutral-500 dark:text-neutral-400">
          משפיע על כפתורים עיקריים, טאבים פעילים, וצבע חלון הדפדפן ב-PWA.
        </p>
      </section>

      <section className="rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
        <h2 className="mb-3 text-sm font-semibold text-neutral-900 dark:text-neutral-50">
          ברירת מחדל למצב תצוגה
        </h2>
        <select
          value={defaultTheme}
          onChange={(e) => setDefaultTheme(e.target.value as typeof defaultTheme)}
          className="rounded-lg border border-neutral-300 px-2 py-1.5 text-sm dark:border-neutral-700 dark:bg-neutral-950"
        >
          <option value="system">לפי הגדרת המכשיר</option>
          <option value="light">בהיר</option>
          <option value="dark">כהה</option>
        </select>
        <p className="mt-2 text-xs text-neutral-500 dark:text-neutral-400">
          כל משתמש עדיין יכול לשנות ידנית דרך התפריט; זו רק ברירת המחדל.
        </p>
      </section>

      <div className="flex items-center gap-3">
        <button
          type="button"
          disabled={pending}
          onClick={handleSave}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
        >
          {pending ? "שומר..." : "שמירה"}
        </button>
        {status === "saved" && (
          <span className="text-xs text-emerald-600 dark:text-emerald-400">נשמר בהצלחה</span>
        )}
        {status === "error" && (
          <span className="text-xs text-red-600 dark:text-red-400">שגיאה בשמירה</span>
        )}
      </div>
    </div>
  );
}
