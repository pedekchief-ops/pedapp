import { defaultCache } from "@serwist/next/worker";
import {
  CacheableResponsePlugin,
  CacheFirst,
  ExpirationPlugin,
  NetworkFirst,
  Serwist,
  StaleWhileRevalidate,
} from "serwist";
import type { PrecacheEntry, RuntimeCaching, SerwistGlobalConfig } from "serwist";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}
declare const self: ServiceWorkerGlobalScope;

// Rules specific to this app, tried before the generic Next.js defaults
// below. Order matters: Serwist uses the first matching route.
//
// 1. Page content JSON (/api/pages/... and /api/medications): the resident
//    page view (app/(resident)/[sectionSlug]/[pageSlug]/page.tsx) and the
//    medications browser (components/medications/MedicationsBrowserLoader.tsx)
//    fetch these, and they're the thing that must keep working offline.
//    NetworkFirst tries the live network (so edits show up immediately)
//    and only falls back to the cached copy when there's no connection.
// 2. Uploaded images from Supabase Storage, and PDFs via our own
//    same-origin proxy (app/api/files/pdfs/[...path]/route.ts -- PDFs
//    can't be fetched directly from Storage anymore since the pdf.js
//    viewer requires a same-origin `file` URL): both are
//    content-addressed by a random path that's never reused for
//    different bytes (see the comment on ImageContent/PdfContent in
//    lib/supabase/types.ts), so it's safe to prefer the cache and only
//    hit the network for anything not seen yet.
// 3. The self-hosted pdf.js viewer app (public/pdfjs-viewer/, see
//    components/blocks/PdfBlock.tsx) -- static files that never change
//    once deployed, so CacheFirst is safe and means a PDF a resident has
//    opened once keeps working fully offline afterward.
const appRuntimeCaching: RuntimeCaching[] = [
  {
    matcher: ({ url, sameOrigin }) =>
      sameOrigin && (url.pathname.startsWith("/api/pages/") || url.pathname === "/api/medications"),
    handler: new NetworkFirst({
      cacheName: "page-content",
      plugins: [
        new CacheableResponsePlugin({ statuses: [0, 200] }),
        new ExpirationPlugin({ maxEntries: 300, maxAgeSeconds: 60 * 60 * 24 * 30 }),
      ],
    }),
  },
  {
    matcher: ({ url, sameOrigin }) =>
      url.href.startsWith(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/`) ||
      (sameOrigin && url.pathname.startsWith("/api/files/")),
    handler: new StaleWhileRevalidate({
      cacheName: "uploaded-files",
      plugins: [
        new CacheableResponsePlugin({ statuses: [0, 200] }),
        new ExpirationPlugin({ maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 60 }),
      ],
    }),
  },
  {
    matcher: ({ url, sameOrigin }) => sameOrigin && url.pathname.startsWith("/pdfjs-viewer/"),
    handler: new CacheFirst({
      cacheName: "pdfjs-viewer",
      plugins: [
        new CacheableResponsePlugin({ statuses: [0, 200] }),
        new ExpirationPlugin({ maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 * 365 }),
      ],
    }),
  },
];

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: [...appRuntimeCaching, ...defaultCache],
});

serwist.addEventListeners();

// Web Push events: shows a notification when the server sends one (see
// lib/push/send.ts) and focuses/opens the relevant page on click. This has
// to live in the service worker itself -- push events only fire here, not
// in any page's JS.
self.addEventListener("push", (event) => {
  if (!event.data) return;
  const payload = event.data.json() as { title: string; body: string; url: string };

  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      icon: "/icons/icon-192.png",
      data: { url: payload.url },
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data as { url?: string })?.url ?? "/";
  event.waitUntil(self.clients.openWindow(url));
});
