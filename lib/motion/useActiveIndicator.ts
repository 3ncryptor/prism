"use client";

import { useEffect, useRef, type RefObject } from "react";
import gsap from "gsap";

/**
 * buildPlan.md §120 (feature 27i). GSAP-animated indicator sliding to the
 * active nav item's measured position — ports soft-motion-ui-v2 §8's
 * shared-layout nav underline (Framer's `layoutId`) to GSAP, replacing a
 * flat background-class swap with real motion.
 */
export function useActiveIndicator<T extends HTMLElement>(
  activeItemRef: RefObject<T | null>,
  deps: unknown[],
) {
  const indicatorRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const indicator = indicatorRef.current;
    const activeItem = activeItemRef.current;
    if (!indicator || !activeItem) return;

    const parent = indicator.offsetParent as HTMLElement | null;
    if (!parent) return;
    const parentRect = parent.getBoundingClientRect();
    const itemRect = activeItem.getBoundingClientRect();

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    gsap.to(indicator, {
      top: itemRect.top - parentRect.top,
      height: itemRect.height,
      duration: reduced ? 0 : 0.3,
      ease: "power3.out",
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return indicatorRef;
}
