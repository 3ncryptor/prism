## Frontend Handoff: Feature #10 (Student Dashboard)

First real `@newtonschool/grauity` integration in this codebase, replacing
the feature #2 placeholder at `/student`.

### Components/pages built

- `app/student/page.tsx` (Server Component) — `requireRole("STUDENT")`,
  fetches the student's active `StudentProfile` + `Resume` directly via
  `studentProfileRepository`/`getActiveResume` (same data `GET /api/profile`
  serves), passes it to the dashboard.
- `app/student/ClientOnlyDashboard.tsx` — see "Known gaps" below for why
  this exists; wraps `StudentDashboard` in `next/dynamic(..., {ssr:false})`.
- `app/student/StudentDashboard.tsx` (client) — header (name/email/sign-out),
  polls `GET /api/profile` every 4s while the resume is in a non-terminal
  status, stops once `READY`/`FAILED`.
- `app/student/ResumeStatusCard.tsx` (client) — status badge (`NSPill`,
  color-coded: success/warning/error), upload button wired to
  `POST /api/resumes`, `NSAlert` on `FAILED` showing the stored error
  message.
- `app/student/ProfileSummary.tsx` — skills (grouped by category via
  `skillCategoryLabels.ts`), projects, experience, education,
  certifications, each section only rendered if non-empty.
- One-time Next.js/Grauity wiring: `next.config.ts`
  (`compiler.styledComponents`), `lib/styledComponentsRegistry.tsx` (SSR
  style flushing), `lib/grauityProviders.tsx` (theme provider client
  boundary), `app/grauity.scss` + `tokens.css` import in `globals.css`.

### Backend endpoints consumed

- `GET /api/profile`, `POST /api/resumes` (both pre-existing, unchanged).

### States handled

- [x] Loading — polling silently updates in place; no resume yet shows the
      empty-state copy instead of a spinner (nothing to load on first paint
      since data is fetched server-side before render).
- [x] Error — `FAILED` resume status shows an `NSAlert` with the stored
      error message; a failed upload attempt itself shows a separate alert.
- [x] Empty — no resume uploaded yet; no profile yet (resume still
      processing).
- [x] Success — full profile display once `READY`.

### Manual test notes

Verified live end-to-end via a real browser (chrome-devtools MCP), a real
Docker MongoDB/Redis, real S3, and a real Gemini API call — not just
build/lint/test:
- Signed in as a seeded student, hit the empty state, uploaded a synthetic
  PDF, watched the status badge move from Processing to Ready via the
  polling loop, and confirmed the real extracted skills/projects/
  experience/education rendered correctly grouped.
- Verified per-student data isolation directly against MongoDB while
  testing (two different seeded students' resumes stayed correctly
  scoped to their own `studentId` — no cross-account leakage).

### Known gaps / issues found and fixed during this feature

- **Dark-mode contrast bug (fixed):** the page inherited the site's
  OS-driven dark-mode background (`globals.css`'s `prefers-color-scheme`
  override) while Grauity's theme is intentionally pinned to `"light"`
  (per its own `rootThemeScopeTheme` API — Grauity doesn't currently
  support tracking OS scheme dynamically without extra wiring), producing
  invisible dark-on-dark text. Fixed by giving the dashboard an explicit
  light background/static neutral colors (`app/student/theme.ts`) instead
  of the site's scheme-reactive CSS vars.
- **SSR hydration mismatch (fixed, real library limitation):** Grauity's
  published `dist` bundle has no styled-components `componentId`/
  `data-styled` metadata (built via `tsup`/esbuild, not the
  styled-components Babel/SWC macro — confirmed by reading
  `node_modules/@newtonschool/grauity/dist/chunk-*.mjs` directly), so
  every `styled()` call it makes gets a non-deterministic class name per
  JS environment. Under Next.js SSR this produced a real hydration
  mismatch across nearly every Grauity component (`NSTypography`,
  `NSButton`, etc.), not an isolated misuse on our part. Rather than patch
  each mismatch individually, `/student` renders the entire Grauity-styled
  subtree client-only (`ClientOnlyDashboard.tsx`, `next/dynamic` with
  `ssr:false`) so there's no server/client markup to diverge. Trade-off:
  this page's content now has a brief client-mount flash instead of true
  SSR — acceptable for an authenticated private dashboard with no SEO
  need. **This limitation applies to any future page using Grauity under
  SSR**, not just this one — worth keeping in mind for future features
  that add Grauity UI to server-rendered pages.
- No "applications"/match-results section — explicitly deferred to
  feature #21+ per spec.md.
- No multi-resume management UI (upload history, switching active resume)
  or a persistent sidebar/nav — user has asked for a more "professional
  dashboard" shell (sidebar, profile menu, multi-resume support) as a
  follow-up UI pass, explicitly deprioritized behind the Gemini
  reliability fix (see qa-report-dashboard.md and the Gemini retry fix
  commit). Tracked as a known gap for a future iteration, not part of
  this feature's original acceptance criteria.
