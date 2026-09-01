"use client";

import { createClient } from "@/lib/supabase/client";
import type { StorageBucket } from "@/lib/supabase/storage";

export interface UploadedFile {
  fileId: string;
  storagePath: string;
  filename: string;
}

// Uploads one file straight from the browser to Supabase Storage and
// records it in the `files` table -- extracted out of
// components/editor/FileUploader.tsx (the single-file admin upload button)
// so BulkFileUploader.tsx can reuse the exact same upload path for several
// files in a row instead of duplicating it.
export async function uploadFileToStorage(bucket: StorageBucket, file: File): Promise<UploadedFile> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // The storage *key* must always be a plain ASCII path -- Supabase
  // Storage rejects uploads whose key contains non-ASCII characters
  // (Hebrew filenames), spaces, or other punctuation with an "Invalid key"
  // error. The original name is kept separately (as `filename`) for
  // display/download instead of being baked into the key.
  const dotIndex = file.name.lastIndexOf(".");
  const rawExtension = dotIndex > -1 ? file.name.slice(dotIndex) : "";
  const safeExtension = rawExtension.replace(/[^a-zA-Z0-9.]/g, "");
  const path = `${crypto.randomUUID()}${safeExtension}`;

  const { error: uploadError } = await supabase.storage.from(bucket).upload(path, file);
  if (uploadError) throw new Error(uploadError.message);

  const { data: fileRow, error: insertError } = await supabase
    .from("files")
    .insert({
      type: bucket === "images" ? "image" : "pdf",
      storage_path: path,
      uploaded_by: user?.id,
    })
    .select()
    .single();
  if (insertError || !fileRow) {
    throw new Error(insertError?.message ?? "שגיאה בשמירת הקובץ");
  }

  return { fileId: fileRow.id, storagePath: path, filename: file.name };
}
