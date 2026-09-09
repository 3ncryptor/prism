"use client";

import { useEffect, useRef, type ReactNode } from "react";
import Lenis from "lenis";

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

    let frameId: number;
    function raf(time: number) {
      lenis.raf(time);
      frameId = requestAnimationFrame(raf);
    }
    frameId = requestAnimationFrame(raf);

    return () => {
      cancelAnimationFrame(frameId);
      lenis.destroy();
    };
  }, []);

  return (
    <div ref={wrapperRef} className={`overflow-y-auto ${className}`}>
      <div ref={contentRef}>{children}</div>
    </div>
  );
}
