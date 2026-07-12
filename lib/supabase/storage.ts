// Supabase Storage public URLs are fully deterministic from the project URL,
// bucket name, and object path, so building one doesn't need a network call
// or even a Supabase client instance -- useful since this runs in both
// Server and Client Components.
export type StorageBucket = "images" | "pdfs";

export function getPublicUrl(bucket: StorageBucket, path: string): string {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  return `${base}/storage/v1/object/public/${bucket}/${path}`;
}
