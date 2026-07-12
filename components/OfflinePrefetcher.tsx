"use client";

import { useEffect } from "react";
import { prefetchCriticalContent } from "@/lib/offline/prefetchCriticalContent";

// Invisible -- just kicks off the offline cache warm-up once per app load.
// Rendered from AppChrome, which only mounts for signed-in residents.
export function OfflinePrefetcher() {
  useEffect(() => {
    prefetchCriticalContent();
  }, []);
  return null;
}
