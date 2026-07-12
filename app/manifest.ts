import type { MetadataRoute } from "next";

// Next.js file convention: this is compiled into /manifest.webmanifest
// automatically and linked from app/layout.tsx's metadata.manifest field.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "מדריך התמחות בילדים",
    short_name: "מדריך התמחות",
    description: "מדריך קליני להתמחות ברפואת ילדים",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#0d9488",
    dir: "rtl",
    lang: "he",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      {
        src: "/icons/icon-512-maskable.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
