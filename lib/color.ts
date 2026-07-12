// Picks black or white text for a given background color, so an admin
// choosing a very light primary color (e.g. a pale yellow) doesn't end up
// with unreadable white-on-white button text. Uses the standard relative
// luminance formula (not perfectly perceptual, but good enough for a
// binary black/white choice).
export function getContrastColor(hex: string): "#000000" | "#ffffff" {
  const normalized = hex.replace("#", "");
  if (normalized.length !== 6) return "#ffffff";

  const r = parseInt(normalized.slice(0, 2), 16);
  const g = parseInt(normalized.slice(2, 4), 16);
  const b = parseInt(normalized.slice(4, 6), 16);
  if ([r, g, b].some(Number.isNaN)) return "#ffffff";

  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.6 ? "#000000" : "#ffffff";
}
