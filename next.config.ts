import type { NextConfig } from "next";
import withSerwistInit from "@serwist/next";

const nextConfig: NextConfig = {
  /* config options here */
};

const withSerwist = withSerwistInit({
  swSrc: "app/sw.ts",
  swDest: "public/sw.js",
  // Disabled in development: a caching service worker fighting with fast
  // refresh makes local changes look like they aren't taking effect.
  disable: process.env.NODE_ENV === "development",
});

export default withSerwist(nextConfig);
