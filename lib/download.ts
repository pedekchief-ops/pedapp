// Fetches a file as a blob and triggers a save-as download client-side.
// A plain <a href download> is unreliable for cross-origin URLs (Supabase
// Storage is a different origin from the app) -- Safari/iOS in particular
// ignores the `download` attribute cross-origin and just navigates to the
// file instead. Fetching the bytes ourselves and downloading from a local
// blob: URL works consistently everywhere.
export async function downloadFile(url: string, filename: string) {
  const response = await fetch(url);
  const blob = await response.blob();
  const objectUrl = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = objectUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();

  URL.revokeObjectURL(objectUrl);
}
