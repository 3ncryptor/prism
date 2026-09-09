/**
 * Grauity's rootThemeScopeTheme is pinned to "light" (app/layout.tsx), so
 * any page rendering Grauity components must stay light regardless of the
 * OS/browser color scheme — otherwise our own dark-mode CSS vars
 * (globals.css) paint a dark background behind Grauity's light-theme
 * (dark) text, making it unreadable. Use these static values instead of
 * our `--muted`/`--surface` vars, which do flip with prefers-color-scheme.
 * Shared across every Grauity-using page (student dashboard, admin pages).
 */
export const MUTED_TEXT_COLOR = "var(--neutral-700, #5B6271)";
