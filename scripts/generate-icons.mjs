// Generates placeholder PWA icons (a simple teal rounded-square with a
// white medical cross) so the app is installable out of the box. Swap
// these for real branded artwork whenever it's ready -- just replace the
// files this script writes into public/icons/, no code changes needed.
// Run manually with `node scripts/generate-icons.mjs` (not wired into
// postinstall, since these are meant to be committed once and then
// replaced by hand, not regenerated on every install).
import sharp from "sharp";
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = join(__dirname, "..", "public", "icons");
mkdirSync(outDir, { recursive: true });

function svgIcon(size, cornerRadius) {
  const cross = size * 0.22;
  const thickness = size * 0.09;
  const c = size / 2;
  return `
<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${size}" height="${size}" rx="${cornerRadius}" fill="#0d9488"/>
  <rect x="${c - thickness / 2}" y="${c - cross}" width="${thickness}" height="${cross * 2}" rx="${thickness / 2}" fill="white"/>
  <rect x="${c - cross}" y="${c - thickness / 2}" width="${cross * 2}" height="${thickness}" rx="${thickness / 2}" fill="white"/>
</svg>`;
}

const targets = [
  { file: "icon-192.png", size: 192, radius: 40 },
  { file: "icon-512.png", size: 512, radius: 100 },
  // Maskable icons need the safe content well inside the edges since OSes
  // crop them to varying shapes -- same artwork, no corner rounding
  // (the OS handles masking), full-bleed background instead.
  { file: "icon-512-maskable.png", size: 512, radius: 0 },
  { file: "apple-touch-icon.png", size: 180, radius: 40 },
];

for (const { file, size, radius } of targets) {
  await sharp(Buffer.from(svgIcon(size, radius)))
    .png()
    .toFile(join(outDir, file));
  console.log(`Generated ${file}`);
}
