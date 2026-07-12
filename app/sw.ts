import { defaultCache } from "@serwist/next/worker";
import {
  CacheableResponsePlugin,
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

// Two rules specific to this app, tried before the generic Next.js
// defaults below. Order matters: Serwist uses the first matching route.
//
// 1. Page content JSON (/api/pages/...): the resident page view
//    (app/(resident)/[sectionSlug]/[pageSlug]/page.tsx) fetches this, and
//    it's the thing that must keep working offline. NetworkFirst tries the
//    live network (so edits show up immediately) and only falls back to
//    the cached copy when there's no connection.
// 2. Uploaded PDFs/images from Supabase Storage: content-addressed by a
//    random path that's never reused for different bytes (see the comment
//    on ImageContent/PdfContent in lib/supabase/types.ts), so it's safe to
//    prefer the cache and only hit the network for anything not seen yet.
const appRuntimeCaching: RuntimeCaching[] = [
  {
    matcher: ({ url, sameOrigin }) => sameOrigin && url.pathname.startsWith("/api/pages/"),
    handler: new NetworkFirst({
      cacheName: "page-content",
      plugins: [
        new CacheableResponsePlugin({ statuses: [0, 200] }),
        new ExpirationPlugin({ maxEntries: 300, maxAgeSeconds: 60 * 60 * 24 * 30 }),
      ],
    }),
  },
  {
    matcher: ({ url }) =>
      url.href.startsWith(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/`),
    handler: new StaleWhileRevalidate({
      cacheName: "uploaded-files",
      plugins: [
        new CacheableResponsePlugin({ statuses: [0, 200] }),
        new ExpirationPlugin({ maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 60 }),
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
