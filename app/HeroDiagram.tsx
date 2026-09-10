"use client";

import { useStrokeRetrace } from "@/lib/motion/useStrokeRetrace";
import { BRAND_COLOR } from "@/lib/designTokens";

/**
 * buildPlan.md §120 (feature 27k); docs/screens.md §8.3. The one meaningful
 * SVG illustration moment this rebuild uses the retrace technique for —
 * a load-bearing diagram, not decoration, so it doesn't conflict with
 * AGENTS.md's no-icons rule (that rule targets nav/status/button glyphs).
 * Captions live outside the SVG as plain text, not inside it — pathLength
 * retrace shouldn't be applied to <text> elements (animated-svg-retrace
 * skill §5).
 */
export function HeroDiagram() {
  const svgRef = useStrokeRetrace<SVGSVGElement>({ trigger: "mount", mode: "draw-in", duration: 0.8, staggerStep: 0.12 });

  return (
    <div className="flex flex-col items-center gap-3">
      <svg
        ref={svgRef}
        viewBox="0 0 320 80"
        width={320}
        height={80}
        fill="none"
        stroke={BRAND_COLOR}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        role="img"
        aria-label="A resume and a job description are matched to produce a score"
      >
        <rect x="8" y="20" width="80" height="40" rx="10" />
        <line x1="96" y1="40" x2="134" y2="40" />
        <rect x="140" y="20" width="80" height="40" rx="10" />
        <line x1="228" y1="40" x2="266" y2="40" />
        <circle cx="296" cy="40" r="16" />
      </svg>
      <div className="flex w-full max-w-[320px] justify-between text-xs font-medium text-gray-500">
        <span>Resume</span>
        <span>Job description</span>
        <span>Score</span>
      </div>
    </div>
  );
}
