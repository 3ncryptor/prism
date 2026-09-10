"use client";

import { useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(useGSAP);

export type RetraceTrigger = "hover" | "mount" | "loop";
export type RetraceMode = "retrace" | "draw-in" | "erase";

interface UseStrokeRetraceOptions {
  trigger?: RetraceTrigger;
  mode?: RetraceMode;
  duration?: number;
  staggerStep?: number;
}

const STROKE_SELECTOR = "path, circle, ellipse, line, polyline, polygon, rect";

/**
 * buildPlan.md §120 (feature 27i). Ports the animated-svg-retrace skill's
 * stroke-drawing technique to GSAP: the free `pathLength="1"` normalization
 * trick (no DrawSVGPlugin — that's a paid Club GreenSock plugin) tweened
 * with core GSAP. Reserved for the few load-bearing SVG moments this
 * project actually has (docs/screens.md §8.2) — not a general icon system;
 * AGENTS.md's no-icons rule stays in force for nav/status/buttons.
 */
export function useStrokeRetrace<T extends SVGSVGElement = SVGSVGElement>({
  trigger = "hover",
  mode = "retrace",
  duration = 0.6,
  staggerStep = 0.06,
}: UseStrokeRetraceOptions = {}) {
  const ref = useRef<T>(null);

  useGSAP(() => {
    const svg = ref.current;
    if (!svg) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const elements = Array.from(svg.querySelectorAll<SVGGeometryElement>(STROKE_SELECTOR));
    if (!elements.length) return;

    elements.forEach((el) => el.setAttribute("pathLength", "1"));
    gsap.set(elements, { strokeDasharray: 1, strokeDashoffset: 0 });

    function play() {
      if (mode === "retrace") {
        gsap.to(elements, {
          keyframes: { strokeDashoffset: [0, 1, 0] },
          duration,
          stagger: staggerStep,
          ease: "power2.inOut",
        });
      } else if (mode === "draw-in") {
        gsap.fromTo(
          elements,
          { strokeDashoffset: 1 },
          { strokeDashoffset: 0, duration, stagger: staggerStep, ease: "power3.out" },
        );
      } else {
        gsap.to(elements, { strokeDashoffset: 1, duration, stagger: staggerStep, ease: "power2.in" });
      }
    }

    if (trigger === "mount") {
      play();
      return;
    }

    if (trigger === "loop") {
      play();
      const cycleMs = (duration + staggerStep * elements.length + 0.4) * 1000;
      const interval = setInterval(play, cycleMs);
      return () => clearInterval(interval);
    }

    svg.addEventListener("mouseenter", play);
    return () => svg.removeEventListener("mouseenter", play);
  }, [trigger, mode, duration, staggerStep]);

  return ref;
}
