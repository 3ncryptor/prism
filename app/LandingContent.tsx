"use client";

import { useRef } from "react";
import Link from "next/link";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { BRAND_COLOR } from "@/lib/grauityTheme";

gsap.registerPlugin(useGSAP);

const HOW_IT_WORKS = [
  "Students upload resumes",
  "Admins post job descriptions",
  "Prism scores every candidate, evidence-backed",
];

/**
 * docs/screens.md §4.1 (feature 27b). A visitor loads this page rarely
 * (once, maybe a handful of times) — per the emil-design-eng skill's
 * frequency table that's exactly the "occasional" tier where a standard,
 * noticeable entrance animation earns its keep rather than becoming
 * annoying on repeat views. Hero fades/slides in first, the three
 * how-it-works steps stagger in right after — same easing/duration
 * language (power2.out, <300ms per element) already established in
 * AppShell's content transition.
 */
export function LandingContent() {
  const heroRef = useRef<HTMLDivElement>(null);
  const stepsRef = useRef<HTMLOListElement>(null);

  useGSAP(() => {
    const tl = gsap.timeline();
    tl.fromTo(heroRef.current, { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 0.4, ease: "power2.out" });
    if (stepsRef.current) {
      tl.fromTo(
        stepsRef.current.children,
        { opacity: 0, y: 8 },
        { opacity: 1, y: 0, duration: 0.3, ease: "power2.out", stagger: 0.08 },
        "-=0.15",
      );
    }
  });

  return (
    <div className="flex flex-1 flex-col bg-white">
      <div role="banner" className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
        <span className="text-lg font-semibold text-gray-900">Prism</span>
        <Link
          href="/sign-in"
          className="rounded-md border border-gray-200 px-4 py-1.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
        >
          Sign in
        </Link>
      </div>

      {/* role="main", not a literal <main>: see the same note in
          app/(auth)/layout.tsx — Grauity's globally-imported CSS resets
          semantic elements to display:block, unlayered. */}
      <div role="main" className="flex flex-1 flex-col items-center justify-center gap-12 px-6 py-16">
        <div ref={heroRef} className="flex max-w-xl flex-col items-center gap-4 text-center">
          <h1 className="text-4xl font-semibold leading-tight tracking-tight text-gray-900">
            Match every resume to every role.
          </h1>
          <p className="text-lg leading-8 text-gray-600">
            AI-assisted placement matching for campus placement cells.
          </p>
          <div className="mt-2 flex items-center gap-3">
            <Link
              href="/sign-in"
              style={{ backgroundColor: BRAND_COLOR }}
              className="rounded-md px-6 py-2.5 font-medium text-white transition-opacity hover:opacity-90"
            >
              Sign in to continue
            </Link>
            <Link
              href="/sign-up"
              style={{ borderColor: BRAND_COLOR, color: BRAND_COLOR }}
              className="rounded-md border px-6 py-2.5 font-medium transition-colors hover:bg-indigo-50"
            >
              Create an account
            </Link>
          </div>
        </div>

        <div className="flex w-full max-w-md flex-col items-center gap-4">
          <p className="text-sm font-medium uppercase tracking-wide text-gray-500">How it works</p>
          <ol ref={stepsRef} className="flex w-full flex-col gap-3">
            {HOW_IT_WORKS.map((step, index) => (
              <li key={step} className="flex items-center gap-3 rounded-lg border border-gray-100 bg-gray-50 px-4 py-3">
                <span
                  aria-hidden="true"
                  className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white"
                  style={{ backgroundColor: BRAND_COLOR }}
                >
                  {index + 1}
                </span>
                <span className="text-sm text-gray-700">{step}</span>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </div>
  );
}
