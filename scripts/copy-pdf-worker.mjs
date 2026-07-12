// Copies the pdf.js worker bundled with pdfjs-dist (a react-pdf dependency)
// into /public so it's served from our own origin at a fixed path. This
// matters for two reasons: (1) it avoids react-pdf's default of fetching
// the worker from a CDN, which would be an external dependency and a
// privacy/reliability concern for a clinical app, and (2) a same-origin
// file at a stable path is trivially cacheable by the offline service
// worker, whereas a CDN URL would need its own runtime-caching rule.
// Runs automatically via the "postinstall" script in package.json.
import { copyFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const source = join(
  __dirname,
  "..",
  "node_modules",
  "pdfjs-dist",
  "build",
  "pdf.worker.min.mjs"
);
const destDir = join(__dirname, "..", "public");
const dest = join(destDir, "pdf.worker.min.mjs");

mkdirSync(destDir, { recursive: true });
copyFileSync(source, dest);
console.log("Copied pdf.worker.min.mjs to public/");
