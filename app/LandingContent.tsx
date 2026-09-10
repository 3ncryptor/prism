"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BRAND_COLOR } from "@/lib/designTokens";
import { useRevealSection } from "@/lib/motion/useRevealSection";
import { useStagger } from "@/lib/motion/useStagger";
import { HeroDiagram } from "@/app/HeroDiagram";
import { Logo } from "@/lib/ui/Logo";

const HOW_IT_WORKS = [
  "Students upload resumes",
  "Admins post job descriptions",
  "Prism scores every candidate, evidence-backed",
];

const VALUE_CARDS = [
  {
    title: "For faculty",
    body: "See a ranked, evidence-backed shortlist for every JD — never a blind pile of PDFs.",
    accent: { text: "#4F46E5", bg: "#EEF2FF" },
  },
  {
    title: "For students",
    body: "Upload one resume per role you're targeting. No job board to browse — Prism routes the right resume to the right JD.",
    accent: { text: "#0891B2", bg: "#ECFEFF" },
  },
  {
    title: "For the matching engine",
    body: "Deterministic scoring, not a single cosine similarity — hard requirements, skills, experience, and projects each weighed and shown with evidence.",
    accent: { text: "#059669", bg: "#ECFDF5" },
  },
];

/**
 * buildPlan.md §120 (feature 27k); docs/screens.md §8.3. Rebuilt as
 * stacked ScrollTrigger-revealed sections (lib/motion) instead of one
 * inline mount-only GSAP timeline — a visitor loads this page rarely
 * (emil-design-eng's "occasional" tier), which is exactly where a
 * noticeable entrance animation earns its keep.
 */
export function LandingContent() {
  const [isScrolled, setIsScrolled] = useState(false);
  const heroRef = useRevealSection<HTMLDivElement>();
  const howItWorksLabelRef = useRevealSection<HTMLParagraphElement>();
  const stepsRef = useStagger<HTMLOListElement>();
  const valueLabelRef = useRevealSection<HTMLParagraphElement>();
  const valueGridRef = useStagger<HTMLDivElement>();

  useEffect(() => {
    function onScroll() {
      setIsScrolled(window.scrollY > 8);
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className="flex flex-1 flex-col bg-white">
      <div
        role="banner"
        className={`sticky top-0 z-50 flex items-center justify-between border-b px-6 py-4 transition-[background-color,backdrop-filter,border-color] duration-200 ${
          isScrolled ? "border-gray-200 bg-white/90 backdrop-blur-md" : "border-transparent bg-white"
        }`}
      >
        <Logo />
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
      <div role="main" className="flex flex-1 flex-col">
        <section className="relative overflow-hidden px-6 py-20">
          <div aria-hidden className="pointer-events-none absolute -left-24 top-10 h-72 w-72 rounded-full bg-brand-tint blur-3xl" />
          <div aria-hidden className="pointer-events-none absolute -right-24 bottom-0 h-72 w-72 rounded-full bg-brand-tint blur-3xl" />

          <div ref={heroRef} className="relative mx-auto flex max-w-xl flex-col items-center gap-4 text-center">
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
            <div className="mt-6">
              <HeroDiagram />
            </div>
          </div>
        </section>

        <section className="px-6 py-12">
          <div className="mx-auto flex w-full max-w-md flex-col items-center gap-4">
            <p ref={howItWorksLabelRef} className="text-sm font-medium uppercase tracking-wide text-gray-500">
              How it works
            </p>
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
        </section>

        <section className="border-t border-gray-100 bg-gray-50/50 px-6 py-16">
          <div className="mx-auto flex max-w-4xl flex-col items-center gap-8">
            <p ref={valueLabelRef} className="text-sm font-medium uppercase tracking-wide text-gray-500">
              Built for placement cells, not job boards
            </p>
            <div ref={valueGridRef} className="grid w-full gap-4 sm:grid-cols-3">
              {VALUE_CARDS.map((card) => (
                <div
                  key={card.title}
                  className="rounded-card border border-gray-200 bg-white p-6 shadow-[var(--shadow-card-rest)]"
                >
                  <p className="mb-2 text-sm font-semibold" style={{ color: card.accent.text }}>
                    {card.title}
                  </p>
                  <p className="text-sm leading-6 text-gray-600">{card.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <footer className="flex items-center justify-center gap-2 border-t border-gray-100 px-6 py-8">
          <Logo className="h-5 w-auto" />
          <span className="text-sm text-gray-500">·</span>
          <Link href="/sign-in" className="text-sm font-medium" style={{ color: BRAND_COLOR }}>
            Sign in
          </Link>
        </footer>
      </div>
    </div>
  );
}
