"use client";

import dynamic from "next/dynamic";
import type { ComponentType } from "react";

/**
 * Generalizes the client-only wrapper first introduced for the student
 * dashboard (feature #10) — Grauity's dist bundle has no styled-components
 * componentId metadata (built via tsup, not the styled-components Babel/
 * SWC macro), so its class names are non-deterministic across server/
 * client renders. Any page rendering Grauity components under Next.js SSR
 * hits the same hydration mismatch; this factory avoids re-solving it
 * per-page. `ssr: false` isn't allowed directly in a Server Component,
 * hence this "use client" wrapper.
 */
export function withClientOnlyGrauity<P extends object>(
  loader: () => Promise<ComponentType<P>>,
) {
  return dynamic(loader, { ssr: false });
}
