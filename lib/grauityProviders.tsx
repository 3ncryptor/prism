"use client";

import { GrauityThemeProvider } from "@newtonschool/grauity";

/**
 * Grauity's exports aren't marked "use client" (not built with Next.js RSC
 * awareness), so importing GrauityThemeProvider directly into a Server
 * Component (app/layout.tsx) bundles it under React's server-only
 * condition, which has no createContext — crashes with "createContext is
 * not a function". This client-boundary wrapper fixes it.
 *
 * GrauityInit is intentionally NOT used here: its own implementation calls
 * `styled.div.attrs(...)` inside its render function (a violation of
 * styled-components' own "don't define styled components inside render"
 * rule — verified in node_modules/@newtonschool/grauity's GrauityInit
 * source), which creates a differently-hashed class name on every render.
 * Under Next.js SSR this produces a genuine hydration mismatch (server and
 * client end up with different `sc-*` class names on the same element).
 * GrauityInit's only real effect is this wrapper div with a font-size and
 * `--multiplier` CSS var (its defaults), which we reproduce directly.
 */
export function GrauityProviders({ children }: { children: React.ReactNode }) {
  return (
    <GrauityThemeProvider rootThemeScopeTheme="light" injectGlobalStyle={false}>
      <div className="grauity-init" style={{ fontSize: "16px", ["--multiplier" as string]: 1 }}>
        {children}
      </div>
    </GrauityThemeProvider>
  );
}
