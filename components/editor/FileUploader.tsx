"use client";

import { useRef, useState } from "react";
import { Upload, FileText, Image as ImageIcon } from "lucide-react";
import { uploadFileToStorage } from "@/lib/editor/uploadFile";
import { getPublicUrl } from "@/lib/supabase/storage";
import type { StorageBucket } from "@/lib/supabase/storage";

// Uploads a file directly from the browser to Supabase Storage (rather
// than routing bytes through a server action) and records it in the
// `files` table. Both writes are allowed by RLS only for admins (see
// supabase/migrations/0001_init_schema.sql and 0003_storage.sql), so this
// relies on the same authorization model as every other admin write.
export function FileUploader({
  bucket,
  currentPath,
  currentFilename,
  accept,
  onUploaded,
}: {
  bucket: StorageBucket;
  currentPath?: string;
  currentFilename?: string;
  accept: string;
  onUploaded: (result: { fileId: string; storagePath: string; filename: string }) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(file: File) {
    setUploading(true);
    setError(null);
    try {
      const result = await uploadFileToStorage(bucket, file);
      onUploaded(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "שגיאה בהעלאה");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      {currentPath && (
        <div className="flex items-center gap-2 rounded-lg border border-neutral-200 p-2 text-xs text-neutral-600 dark:border-neutral-800 dark:text-neutral-300">
          {bucket === "images" ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={getPublicUrl("images", currentPath)}
              alt=""
              className="h-10 w-10 rounded object-cover"
            />
          ) : (
            <FileText size={16} />
          )}
          <span className="truncate" dir="ltr">
            {currentFilename || currentPath}
          </span>
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept={accept}
        hidden
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
          e.target.value = "";
        }}
      />
      <button
        type="button"
        disabled={uploading}
        onClick={() => inputRef.current?.click()}
        className="flex items-center justify-center gap-2 rounded-lg border border-dashed border-neutral-300 px-3 py-2 text-sm text-neutral-600 hover:bg-neutral-50 disabled:opacity-50 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-900"
      >
        {bucket === "images" ? <ImageIcon size={16} /> : <Upload size={16} />}
        {uploading ? "מעלה..." : currentPath ? "החלפת קובץ" : "העלאת קובץ"}
      </button>

      {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
}
