## QA Report: Feature 27a2 — Visual design system upgrade

Spec source: `docs/screens.md` §6, `buildPlan.md` §119.4 (no separate `spec.md`/
`backend-handoff.md` — same precedent as 27a: a presentation-layer-only pass
with no new business logic, fully specified via the wireframes already
agreed with the user).

### Acceptance criteria (from docs/screens.md §6)
- [x] §6.1 Sidebar active-item uses an indigo-tinted pill instead of
      near-black — PASS (live-verified both panels: `BRAND_TINT_COLOR`
      background + `BRAND_COLOR` text on the active item, `Sidebar.tsx`)
- [x] §6.2 TopBar shows an avatar chip (initial letter, indigo background)
      + name/email, click opens a dropdown containing "Sign out"; no
      notification bell — PASS (live-verified: click opens/closes correctly,
      click-outside closes it, sign-out button present and is the only
      dropdown item)
- [x] §6.3 New `StatCard` primitive (icon badge, large number, optional
      link) replaces the plain `<NSTypography>` counts on Job Detail —
      PASS (live-verified with a real match run: Best Fit/Moderate/Low Fit
      render as three `StatCard`s with real counts 1/0/2)
- [x] §6.4 Skill Taxonomy retrofitted to two-pane master-detail — PASS
      (live-verified: left pane lists all seeded skills, selecting one
      loads it into the right-pane edit form with real usage count,
      "+ Add skill" clears the form; create/edit/deactivate logic unchanged)
- [x] No icons anywhere — SVGs only (new hard constraint from the user's
      go-ahead message, not in the original screens.md spec but folded into
      this build) — PASS: `lib/layout/icons.tsx` holds hand-authored inline
      SVGs (chevron, dashboard/grid badge); grepped the full `app/`+`lib/`
      tree for any icon-library/icon-font/Grauity-`Icon` usage — zero hits
      outside that one file.

### Test suite results
- No new unit tests — pure presentation-layer restructuring, matching 27a's
  own precedent (no new business logic to test).
- Full suite: `npm test` → 166/167 passing; the one failure
  (`geminiExtractionProvider.test.ts`) is the same pre-existing, unrelated
  Gemini free-tier quota exhaustion seen throughout this project — not a
  regression.
- Lint/typecheck/build: **PASS** — all clean (`npx tsc --noEmit`,
  `npm run lint`, `npm run build`).

### Live verification (browser, both roles)
- Admin (`admin@prism.dev`): Jobs list → Job Detail (real `StatCard`s with a
  real match run) → dropdown open/close → Skill Taxonomy master-detail
  (selected "python", saw real usage count and Active pill) → Scoring
  Config (unaffected, confirmed no regression). Zero console errors on any
  page.
- Student (`student1@prism.dev`): Dashboard (avatar chip renders "S",
  indigo) and Applications page (real Low Fit result, evidence link) both
  correct. Zero console errors.

### Scope creep found
- None beyond what the user's own go-ahead message added: the "no icons,
  SVGs only" constraint wasn't in the original `docs/screens.md` §6 spec,
  but it was explicit in this message's own instruction, applied uniformly
  (StatCard's icon badge and TopBar's dropdown chevron both use the new
  `lib/layout/icons.tsx` module), and recorded here rather than silently
  folded in.

### Security/sanity pass
- No new routes, no new data exposure — presentation layer only.
- No secrets or debug output introduced.
- `requireRole()` gates unchanged (still enforced in each `layout.tsx` and
  each page's own data-fetching, as established in 27a).

### Verdict
PASS — ready to commit
