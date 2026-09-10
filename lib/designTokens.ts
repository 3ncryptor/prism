/**
 * buildPlan.md §120 (feature 27i). Single source for brand tokens read by
 * lib/ui/ primitives — component code never hardcodes these hex values
 * (soft-motion-ui-v2 §6's "no literal hex in component code" rule).
 * Supersedes lib/grauityTheme.ts page-by-page as each page migrates off
 * Grauity (27j-27o); grauityTheme.ts is deleted once nothing imports it.
 */
export const BRAND_COLOR = "#4F46E5";
export const BRAND_HOVER_COLOR = "#4338CA";
export const BRAND_TINT_COLOR = "#EEF2FF";
export const MUTED_TEXT_COLOR = "#5B6271";

export const SHADOW_CARD_REST = "0 8px 30px rgb(15 23 42 / 0.05)";
export const SHADOW_CARD_HOVER = "0 20px 45px rgb(15 23 42 / 0.10)";

export interface RoleColor {
  text: string;
  bg: string;
  border: string;
}

/**
 * Color-as-data (soft-motion-ui-v2 §6): a stable derived color per job
 * role, so "Data Science" reads the same color everywhere it appears
 * (resume cards, job cards, dashboard coverage rows) without needing a
 * per-role color field in the database.
 */
const ROLE_PALETTE: RoleColor[] = [
  { text: "#4F46E5", bg: "#EEF2FF", border: "#C7D2FE" }, // indigo
  { text: "#0891B2", bg: "#ECFEFF", border: "#A5F3FC" }, // cyan
  { text: "#059669", bg: "#ECFDF5", border: "#A7F3D0" }, // emerald
  { text: "#C026D3", bg: "#FDF4FF", border: "#F0ABFC" }, // fuchsia
  { text: "#EA580C", bg: "#FFF7ED", border: "#FED7AA" }, // orange
  { text: "#0D9488", bg: "#F0FDFA", border: "#99F6E4" }, // teal
  { text: "#7C3AED", bg: "#F5F3FF", border: "#DDD6FE" }, // violet
  { text: "#DB2777", bg: "#FDF2F8", border: "#FBCFE8" }, // pink
];

export function getRoleColor(canonicalName: string): RoleColor {
  let hash = 0;
  for (let i = 0; i < canonicalName.length; i++) {
    hash = (hash * 31 + canonicalName.charCodeAt(i)) | 0;
  }
  const index = Math.abs(hash) % ROLE_PALETTE.length;
  return ROLE_PALETTE[index];
}
