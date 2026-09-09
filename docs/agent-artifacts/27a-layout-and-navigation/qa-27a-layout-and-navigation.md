## QA Report: Feature 27a — Layout shell + navigation

### Acceptance criteria
- [x] Every `/admin/*` page renders inside a shared layout with a persistent sidebar (Jobs / Skill Taxonomy / Scoring Config) — PASS (live-verified: all 3 sections navigable, sidebar persists across navigation)
- [x] The current section is visually indicated as active — PASS (live-verified: dark pill + white text on the active item; correctly stays on "Jobs" for the nested `/admin/jobs/[id]` route via `matchPrefixes`, without falsely lighting up on Skill Taxonomy/Scoring Config)
- [x] Admin identity + sign-out appear exactly once, not duplicated per page — PASS (moved into `TopBar`, removed from all 4 admin dashboard components)
- [x] `/student` renders inside a shared student layout with the same treatment — PASS (live-verified as student1@prism.dev: Dashboard/Applications sidebar, correct active state, working sign-out)
- [x] No regression: job upload, skill taxonomy CRUD, scoring config CRUD, resume dashboard, and applications all continue to work — PASS (live-verified real data on every page: job list, job detail with real match results + working evidence expand, scoring config active version + history, student profile with real skills/experience/education, applications list with a real Low Fit result)
- [x] `AdminDashboard`, `JobDetailDashboard`, `SkillTaxonomyDashboard`, `ScoringConfigDashboard`, `StudentDashboard` no longer contain their own header/sign-out markup — PASS
- [x] Layout respects the existing Grauity light-mode-pinning constraints — PASS (no visual regression, same `MUTED_TEXT_COLOR`/`bg-white` pattern reused)

### Additional work beyond the original spec (discovered during build)
- **`ApplicationsSection` promoted to its own page** (`/student/applications`), matching the nav item added for it — was previously embedded directly in the dashboard.
- **New shared primitives**, as planned: `AppShell`, `Sidebar`, `TopBar`, `PageHeader`, `Card` (polymorphic via `as`), `BucketPill`, `EmptyState`. `BucketPill` eliminated a real pre-existing duplication (`BUCKET_COLOR`/`BUCKET_LABEL` were separately defined in `ResultTable.tsx` and `ApplicationsSection.tsx`).
- **Lenis smooth scroll** wired into the shell's content area (`SmoothScrollProvider`), scoped to that container only (sidebar/top bar stay fixed), skipped entirely under `prefers-reduced-motion`.
- **GSAP** (`useGSAP` + `@gsap/react`) drives a subtle fade/slide-in on the content area on each navigation (250ms, `power2.out`, per the emil-design-eng skill's frequency/duration guidance for "occasional" UI changes).
- **Global button press-feedback** (`scale(0.97)` on `:active`, transform/opacity only) added to `globals.css`, plus a `prefers-reduced-motion` override disabling all transitions/animations app-wide.
- **A real, previously-latent bug found and fixed**: Grauity's CSS is imported unlayered (plain `@import`, not inside a Tailwind `@layer`). Per the CSS cascade-layers spec, unlayered rules always beat layered ones regardless of specificity — Grauity ships a semantic-element reset (`nav`, `header`, `section`, `main` → `display: block`) that was silently overriding Tailwind's layered `flex`/`grid` utilities on those exact tags everywhere in the app, not just in new 27a code. This was invisible for pure vertical stacking (block vs. flex-col look similar) but broke `gap` spacing (which only applies to flex/grid, never plain block) and completely broke row-layouts like the new sidebar/top bar. Fixed by replacing every layout-critical `<nav>`/`<header>`/`<section>`/`<main>` in the codebase with `<div role="...">` (10 occurrences across 7 files, including 5 pre-existing ones unrelated to 27a's new code), and using an inline `style` for the sidebar's active-item background specifically, since Grauity also resets anchor-tag `background-color` to transparent, unlayered, the same way.

### Test suite results
- No new unit tests — this is a presentation-layer restructuring feature with no new business logic (matches the spec's own "Backend stage not needed" note).
- Full suite: `npm test` → 166/167 passing; the one failure (`geminiExtractionProvider.test.ts`) is the same pre-existing, unrelated Gemini free-tier quota exhaustion seen throughout this session — not a regression.
- Lint/typecheck/build: **PASS** — all clean.

### Live verification (browser, both roles)
- Admin: navigated Jobs → Job Detail → Skill Taxonomy → Scoring Config → back to Jobs; confirmed active-state correctness on every hop, zero console errors on any page, real data intact throughout (real job, real match result with evidence expand still working, real scoring config version history).
- Student: signed in as student1@prism.dev; confirmed Dashboard (real resume/skills/experience/education) and the new dedicated Applications page (real Low Fit result, evidence link) both render correctly inside the shell with correct active-nav state and zero console errors.

### Scope creep found
- The Grauity cascade-layer bug fix touched 5 files outside what 27a's own new code needed (`app/page.tsx`, `app/student/ProfileSummary.tsx`, `app/student/ResumeStatusCard.tsx` — none of which were otherwise in scope for this feature). Flagging this explicitly per AGENTS.md rather than silently including it: this was a genuine, previously-invisible bug (broken `gap` spacing app-wide) directly caused by the same root cause this feature's own components hit, and leaving it unfixed while fixing it in new code would have left an inconsistent, confusing half-state. Judged in-scope as a bug fix, not a feature addition — no new functionality was added to any of those 3 files.

### Security/sanity pass
- No new routes, no new data exposure — presentation layer only.
- No secrets or debug output introduced.
- `requireRole()` gates remain exactly where they were (each page still calls it for its own data-fetching); the new `layout.tsx` files add an additional `requireRole()` call for identity display, which is redundant with each page's own call but harmless (cheap session read, no double-auth risk).

### Verdict
PASS — ready to commit
