"use client";

import { createContext, useContext, type RefObject } from "react";

/**
 * The actual scrolling element a ScrollTrigger-based hook should watch.
 * `null` (the default, used by pages that scroll the plain `window` — the
 * marketing landing page, auth pages) means "use ScrollTrigger's default
 * (window)". lib/layout/SmoothScrollProvider provides its Lenis wrapper
 * element here for anything rendered inside it (every /student/* and
 * /admin/* page via AppShell) — without this, ScrollTrigger watches
 * `window` scroll position while the actual scrolling happens inside that
 * wrapper div, so its "enter" callbacks never fire and elements stay
 * stuck at their initial (opacity: 0) state indefinitely.
 */
export const ScrollerContext = createContext<RefObject<HTMLElement | null> | null>(null);

/**
 * Returns the ref object itself, not `.current` — reading `.current`
 * belongs inside an effect (e.g. the useGSAP callback that builds a
 * ScrollTrigger config), never during render (react-hooks/refs).
 */
export function useScrollerRef(): RefObject<HTMLElement | null> | null {
  return useContext(ScrollerContext);
}
