"use client";

import { useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { useScrollerRef } from "@/lib/motion/ScrollerContext";

gsap.registerPlugin(useGSAP, ScrollTrigger);

/**
 * buildPlan.md §120 (feature 27i). ScrollTrigger-gated fade+rise — the
 * mechanism behind every "stacked section" reveal in the rebuilt pages
 * (docs/screens.md §8). gsap.matchMedia() drops the transform (keeping
 * only opacity) for prefers-reduced-motion, per emil-design-eng's a11y
 * guidance rather than disabling the reveal outright.
 *
 * `scroller` comes from ScrollerContext (undefined outside a
 * SmoothScrollProvider, meaning "use window") — every /student/* and
 * /admin/* page scrolls inside AppShell's Lenis-managed div, not window,
 * so without this the trigger's "enter" condition never fires there and
 * content stays stuck at opacity: 0 indefinitely.
 */
export function useRevealSection<T extends HTMLElement = HTMLDivElement>() {
  const ref = useRef<T>(null);
  const scrollerRef = useScrollerRef();

  useGSAP(() => {
    if (!ref.current) return;
    const scroller = scrollerRef?.current ?? undefined;
    const mm = gsap.matchMedia();

    mm.add("(prefers-reduced-motion: no-preference)", () => {
      gsap.from(ref.current, {
        opacity: 0,
        y: 20,
        duration: 0.45,
        ease: "power3.out",
        scrollTrigger: { trigger: ref.current, scroller, start: "top 85%" },
      });
    });

    mm.add("(prefers-reduced-motion: reduce)", () => {
      gsap.from(ref.current, {
        opacity: 0,
        duration: 0.3,
        scrollTrigger: { trigger: ref.current, scroller, start: "top 85%" },
      });
    });

    return () => mm.revert();
  }, [scrollerRef]);

  return ref;
}
