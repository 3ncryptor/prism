"use client";

import { useEffect, useRef, type ReactNode } from "react";
import Lenis from "lenis";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ScrollerContext } from "@/lib/motion/ScrollerContext";

gsap.registerPlugin(ScrollTrigger);

interface SmoothScrollProviderProps {
  children: ReactNode;
  className?: string;
}

/**
 * Scoped Lenis smooth scroll for the shell's content area only — the
 * sidebar and top bar stay fixed and never scroll. Skipped entirely when
 * the user prefers reduced motion: inertia/momentum scrolling is itself a
 * motion effect, not just a decorative animation, so the correct
 * accessible behavior is native scroll, not a "gentler" smooth scroll.
 *
 * Provides its wrapper element via ScrollerContext and keeps ScrollTrigger
 * synced to Lenis's scroll position (lenis.on("scroll", ...)) — without
 * this, every ScrollTrigger-based reveal (useRevealSection/useStagger)
 * inside this pane watches `window` scrolling, which never happens here
 * since Lenis owns this div's own overflow instead, so those animations
 * would never fire and their content would stay stuck at opacity: 0.
 */
export function SmoothScrollProvider({ children, className = "" }: SmoothScrollProviderProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReducedMotion || !wrapperRef.current || !contentRef.current) return;

    const lenis = new Lenis({
      wrapper: wrapperRef.current,
      content: contentRef.current,
      duration: 1.0,
      smoothWheel: true,
    });

    lenis.on("scroll", ScrollTrigger.update);

    let frameId: number;
    function raf(time: number) {
      lenis.raf(time);
      frameId = requestAnimationFrame(raf);
    }
    frameId = requestAnimationFrame(raf);

    // Content mounted before this effect runs may already have registered
    // ScrollTriggers scoped to this wrapper as their scroller (see
    // ScrollerContext) — recalculate their positions now that Lenis (and
    // its native scrollTop-based container) is actually active.
    ScrollTrigger.refresh();

    return () => {
      cancelAnimationFrame(frameId);
      lenis.destroy();
    };
  }, []);

  return (
    <ScrollerContext.Provider value={wrapperRef}>
      <div ref={wrapperRef} className={`overflow-y-auto ${className}`}>
        <div ref={contentRef}>{children}</div>
      </div>
    </ScrollerContext.Provider>
  );
}
