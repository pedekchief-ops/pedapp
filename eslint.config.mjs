import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Compiled by Serwist from app/sw.ts at build time, not our code.
    "public/sw.js",
    // Vendored copy of Mozilla's prebuilt pdf.js viewer, not our code --
    // see components/blocks/PdfBlock.tsx for why it's here.
    "public/pdfjs-viewer/**",
  ]),
]);

export default eslintConfig;
