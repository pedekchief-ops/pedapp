import type { Metadata, Viewport } from "next";
import { Rubik } from "next/font/google";
import { ThemeProvider } from "@/components/ThemeProvider";
import { createClient } from "@/lib/supabase/server";
import { getAppSettings } from "@/lib/data";
import { getContrastColor } from "@/lib/color";
import "./globals.css";

// Rubik reads Hebrew and Latin glyphs well and is a common choice for
// Hebrew-primary UIs -- important since this app mixes Hebrew prose with
// inline English drug names and dosages throughout.
const rubik = Rubik({
  variable: "--font-rubik",
  subsets: ["hebrew", "latin"],
});

export const metadata: Metadata = {
  title: "מדריך התמחות בילדים",
  description: "מדריך קליני להתמחות ברפואת ילדים",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "מדריך התמחות",
  },
  icons: {
    icon: [{ url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
};

// A function (not a static export) so the PWA/browser-chrome color can
// follow the admin-configured brand color from /admin/settings.
export async function generateViewport(): Promise<Viewport> {
  const supabase = await createClient();
  const settings = await getAppSettings(supabase);

  return {
    themeColor: [
      { media: "(prefers-color-scheme: light)", color: settings.primary_color },
      { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
    ],
    width: "device-width",
    initialScale: 1,
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const supabase = await createClient();
  const settings = await getAppSettings(supabase);

  return (
    // suppressHydrationWarning is required by next-themes: it sets the
    // .dark class on <html> before hydration to avoid a flash of the wrong
    // theme, which would otherwise mismatch the server-rendered markup.
    // The inline style sets --brand-primary/--brand-primary-foreground
    // (see app/globals.css) from the admin's chosen color, on every
    // request, before any CSS or component renders.
    <html
      lang="he"
      dir="rtl"
      className={`${rubik.variable} h-full antialiased`}
      style={
        {
          "--brand-primary": settings.primary_color,
          "--brand-primary-foreground": getContrastColor(settings.primary_color),
        } as React.CSSProperties
      }
      suppressHydrationWarning
    >
      {/* suppressHydrationWarning here too: browser extensions like
          Grammarly inject data-gr-* attributes onto <body> before React
          hydrates, which otherwise trips this same warning harmlessly. */}
      <body className="flex min-h-full flex-col" suppressHydrationWarning>
        <ThemeProvider defaultTheme={settings.default_theme}>{children}</ThemeProvider>
      </body>
    </html>
  );
}
