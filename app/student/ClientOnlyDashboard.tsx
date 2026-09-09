"use client";

import dynamic from "next/dynamic";

/**
 * Grauity's dist bundle has no styled-components componentId/data-styled
 * metadata (built via tsup/esbuild, not the styled-components Babel/SWC
 * macro — verified in node_modules/@newtonschool/grauity/dist/chunk-*.mjs),
 * so every styled() call it makes gets a non-deterministic auto-generated
 * class name per JS environment. Under Next.js SSR this produces a real
 * hydration mismatch on nearly every Grauity component's className
 * (confirmed via the dev overlay across NSTypography, NSButton, etc.),
 * not just one component's misuse.
 *
 * Rather than patch each mismatch (impossible to guarantee exhaustively
 * against a library we don't control), we stop SSR-rendering this subtree
 * entirely: with `ssr: false`, the server emits nothing for it and the
 * client mounts it fresh, so there's no server/client markup to diverge.
 * `ssr: false` isn't allowed directly in a Server Component, hence this
 * tiny "use client" wrapper — see
 * https://nextjs.org/docs/app/building-your-application/rendering/client-components#examples
 */
export const ClientOnlyStudentDashboard = dynamic(
  () => import("@/app/student/StudentDashboard").then((mod) => mod.StudentDashboard),
  { ssr: false },
);
