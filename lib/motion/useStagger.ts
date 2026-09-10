"use client";

import { useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(useGSAP, ScrollTrigger);

/**
 * buildPlan.md §120 (feature 27i). Cascades a container's direct children
 * in, 60ms apart, on scroll into view. `deps` should include whatever
 * causes the list's item count to change (e.g. fetched data), so the
 * animation re-triggers correctly for content that loads after mount.
 */
export function useStagger<T extends HTMLElement = HTMLDivElement>(deps: unknown[] = []) {
  const ref = useRef<T>(null);

  useGSAP(() => {
    if (!ref.current) return;
    const children = ref.current.children;
    if (!children.length) return;
    const mm = gsap.matchMedia();

    mm.add("(prefers-reduced-motion: no-preference)", () => {
      gsap.from(children, {
        opacity: 0,
        y: 12,
        duration: 0.35,
        stagger: 0.06,
        ease: "power2.out",
        scrollTrigger: { trigger: ref.current, start: "top 85%" },
      });
    });

    mm.add("(prefers-reduced-motion: reduce)", () => {
      gsap.from(children, {
        opacity: 0,
        duration: 0.25,
        stagger: 0.03,
        scrollTrigger: { trigger: ref.current, start: "top 85%" },
      });
    });

    return () => mm.revert();
  }, deps);

  return ref;
}
