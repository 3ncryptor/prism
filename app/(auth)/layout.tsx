import type { ReactNode } from "react";
import Link from "next/link";

/**
 * docs/screens.md §4.2-4.4 (feature 27b, extended by 27g): shared shell for
 * every unauthenticated auth page (sign-in, and forgot/reset-password once
 * 27g adds them) — a centered wordmark + card, always light regardless of
 * OS theme. Plain hardcoded Tailwind classes (not the `--background`/
 * `--foreground` vars in globals.css), matching every other page in the
 * app: those vars flip under `prefers-color-scheme: dark`, which is what
 * made this page render as an unstyled dark page before this fix — the
 * rest of the product is intentionally light-only.
 */
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-8 bg-white px-6 py-12">
      <Link href="/" className="text-lg font-semibold text-gray-900">
        Prism
      </Link>
      {/* role="main", not a literal <main>: Grauity's globally-imported CSS
          resets semantic elements (main/nav/header) to display:block,
          unlayered, which beats Tailwind's layered flex utilities — same
          bug documented in lib/layout/Sidebar.tsx/TopBar.tsx. */}
      <div role="main" className="flex w-full flex-col items-center">
        {children}
      </div>
    </div>
  );
}
