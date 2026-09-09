## Task: Layout shell + navigation (admin + student)

### Goal
Replace the current per-page duplicated header markup across every admin/student
page with one shared, persistent layout shell (sidebar navigation + top bar) per
panel, so users can navigate between sections without knowing URLs, and future
pages inherit consistent structure automatically instead of re-declaring it.

### In scope / Out of scope
**In:**
- One shared `AdminLayout` wrapping every `/admin/*` page: persistent sidebar
  (Jobs, Skill Taxonomy, Scoring Config — the 3 existing admin sections) + a top
  bar (admin name/email, sign out).
- One shared `StudentLayout` wrapping `/student` (and future student sub-pages):
  sidebar (Dashboard, Applications today; Resumes/Profile added when 27d/27f
  land) + top bar.
- Active-route highlighting in the sidebar.
- Retrofitting the 5 existing dashboard components (`AdminDashboard`,
  `JobDetailDashboard`, `SkillTaxonomyDashboard`, `ScoringConfigDashboard`,
  `StudentDashboard`) to render inside the new layout instead of each declaring
  its own header/sign-out markup.
- Reasonable behavior on a narrow viewport (collapses or stacks; not a full
  responsive redesign).

**Out:**
- Any new visual redesign — stays inside the existing grayscale design system
  (AGENTS.md §6). This is a structural fix, not a re-skin.
- Landing/sign-in pages (feature 27b).
- Nav items for features that don't exist yet — added when 27d/27f ship, but the
  nav structure should make adding them trivial.
- Breadcrumbs, in-nav search, or anything beyond a static link list.

### API / Data Contract
None — presentation layer only, no schema or route changes.

### Acceptance Criteria
- [ ] Every `/admin/*` page renders inside a shared layout with a persistent
      sidebar (Jobs / Skill Taxonomy / Scoring Config).
- [ ] The current section is visually indicated as active in the sidebar.
- [ ] Admin identity + sign-out appear exactly once (in the layout), not
      duplicated per page.
- [ ] `/student` renders inside a shared student layout with the same treatment.
- [ ] No regression: job upload, skill taxonomy CRUD, scoring config CRUD,
      resume upload, and the applications view all continue to work exactly as
      before.
- [ ] `AdminDashboard.tsx`, `JobDetailDashboard.tsx`, `SkillTaxonomyDashboard.tsx`,
      `ScoringConfigDashboard.tsx`, `StudentDashboard.tsx` no longer contain their
      own header/sign-out markup — that logic lives only in the layout.
- [ ] Layout respects this codebase's existing Grauity light-mode-pinning
      constraints (`MUTED_TEXT_COLOR`, explicit `bg-white`) already documented
      and used on every current page.

### Edge cases to handle
- A nested route like `/admin/jobs/[id]` still shows the sidebar, with "Jobs"
  read as active (or a sensible parent-active state).
- Narrow viewport doesn't make the page unusable.
- Unauthenticated/wrong-role access is still gated server-side by the existing
  `requireRole()` calls before the layout renders — the layout itself assumes
  an authenticated session and does no auth logic of its own.

### Open questions
None blocking. One assumption carried into the Frontend structure proposal:
sidebar nav rather than a horizontal top nav bar, since it scales better as
more sections are added (Resumes/Profile in 27d/27f) — flagged here so it can
be confirmed or overridden before building.

### Pipeline note
Backend stage is not needed for this feature — no API/schema changes. Skipped
explicitly per AGENTS.md Cross-Cutting Rule 9 rather than silently omitted.
