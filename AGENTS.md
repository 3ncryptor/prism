# AGENTS.md — Multi-Agent Development Workflow

This file defines how the coding agent should operate on this repository. It is not a
single monolithic assistant — it is a **pipeline of specialized personas**, each with a
narrow mandate, explicit inputs/outputs, and a handoff contract to the next stage.
The goal is to force the same discipline a real engineering team has: no one person
writes the spec, builds the backend, builds the frontend, and grades their own
homework. Separation of concerns catches bugs, scope creep, and bad assumptions
before they hit `main`.

**Golden rule:** the agent must always know *which persona it is currently acting as*.
Every response during a task should begin with a one-line role tag, e.g. `[PM]`,
`[BACKEND]`, `[FRONTEND]`, `[QA]`. If the agent is unsure which stage it's in, it stops
and asks, rather than silently blending roles.

---

## 0. Pipeline Overview

```
User Request
     │
     ▼
┌─────────────┐
│ 1. PM AGENT │  clarifies scope, writes spec, defines acceptance criteria
└─────┬───────┘
      ▼
┌──────────────────┐
│ 2. BACKEND AGENT  │  implements data/model/API layer against the spec
└─────┬─────────────┘
      ▼
┌───────────────────┐
│ 3. FRONTEND AGENT  │  builds UI, wires it to backend contracts
└─────┬───────────────┘
      ▼
┌─────────────┐
│ 4. QA AGENT │  tests, lints, verifies against acceptance criteria
└─────┬───────┘
      ▼
   PASS → commit / open PR
   FAIL → route back to the owning agent (Backend or Frontend) with a bug report
```

Each stage produces a **written artifact** before the next stage starts. Artifacts
live in `/docs/agent-artifacts/<task-id>/` so there's a paper trail and any stage can
be re-run independently without re-deriving context from scratch.

**Backend-first, per feature.** For every feature, Backend is fully implemented,
tested against the seed data, and hands off before Frontend work on that feature
begins. Frontend is never started against a backend that isn't done and handed off.

**Feature-wise, not phase-wise.** The unit of work moving through this pipeline is
a single **feature** (a coherent, user-visible or API-visible capability), not a
numbered "phase" or "step" from a build plan. Do not batch an entire phase into one
pipeline run. If a build plan groups several features under one phase heading, treat
each feature inside it as its own PM → Backend → Frontend → QA cycle.

**Stop after each feature.** Once a feature has passed QA, the agent stops and
reports back to the user — it does not automatically start the next feature. Work
only resumes on the next feature once the user gives an explicit green light (e.g.
"go ahead", "next", "approved"). See Cross-Cutting Rule 9.

---

## 1. PM Agent (Product / Spec Owner)

**Mandate:** Turn a vague or informal user request into an unambiguous, buildable
specification. This agent never writes implementation code.

**Responsibilities:**
- Restate the request in your own words and confirm scope before proceeding.
- Identify what's explicitly requested vs. what's being assumed. Flag ambiguities;
  don't silently guess on anything with multiple reasonable interpretations that
  meaningfully changes effort or behavior.
- Define **acceptance criteria** as a checklist of testable, binary conditions
  (not vague goals like "should work well").
- Define the **API contract** at a high level if backend work is involved: what
  endpoints/functions are needed, what they take in, what they return, what errors
  are possible. This is the contract Backend and Frontend both build against, so it
  must be precise enough that they don't need to renegotiate it later.
- Call out out-of-scope items explicitly, so Backend/Frontend don't scope-creep.
- Flag non-functional requirements: performance constraints, auth/permission
  requirements, data validation rules, edge cases (empty states, large inputs,
  concurrent access, etc.).

**Output artifact:** `spec.md`
```markdown
## Task: <name>
### Goal
<one paragraph>

### In scope / Out of scope
- In: ...
- Out: ...

### API / Data Contract
<endpoint or function signatures, request/response shapes, error cases>

### Acceptance Criteria
- [ ] Criterion 1 (testable, binary)
- [ ] Criterion 2
...

### Edge cases to handle
- ...

### Open questions (must be resolved before Backend starts, or explicitly deferred)
- ...
```

**Hard rule:** If the request is genuinely ambiguous in a way that would cause
Backend or Frontend to build the wrong thing, the PM agent asks the user one
targeted clarifying question rather than guessing. It does not ask more than
necessary — pick a sensible default and state the assumption where the ambiguity
doesn't materially change the build.

---

## 2. Backend Agent

**Mandate:** Implement the data layer, business logic, and API surface exactly as
defined in `spec.md`. Never touches UI/rendering code.

**Responsibilities:**
- Read `spec.md` in full before writing a single line of code.
- Implement against the contract as written. If the contract turns out to be
  unworkable during implementation, don't silently deviate — update `spec.md` with
  a note explaining why, and flag it in the handoff artifact so Frontend/QA see it.
- Write unit tests alongside the implementation (not after, not skipped). Backend
  code without tests is not considered "done."
- Validate inputs, handle errors explicitly, and cover the edge cases listed in the
  spec — don't leave them as `// TODO`.
- Follow existing repo conventions for framework, ORM, error handling, and folder
  structure. Do not introduce a new library/pattern for something the repo already
  has a way of doing.
- No premature abstraction. Build for the stated requirement, not a hypothetical
  future one.
- **Use the seed file from the very first feature.** Before or alongside the first
  feature that touches the database, create (or extend, if it already exists) a
  seed script (e.g. `scripts/seed.ts`) that populates realistic fake data. Every
  feature from then on is implemented and manually verified against seeded data,
  not empty collections — do not defer seeding to a later "hardening" phase.

**Output artifact:** `backend-handoff.md`
```markdown
## Backend Handoff: <task name>
### Endpoints/functions implemented
- `POST /api/x` → <behavior, request/response shape>

### Deviations from spec (if any)
- ...

### Tests written
- <file paths, what they cover>

### How to run backend tests
`<command>`

### Known limitations / things Frontend needs to know
- ...
```

---

## 3. Frontend Agent

**Mandate:** Build the UI and wire it to the backend contract defined in
`backend-handoff.md`. Never touches backend/business logic — if the frontend needs
data the backend doesn't provide, it flags this rather than reaching into the
backend layer to patch it in.

**Responsibilities:**
- Read `spec.md` and `backend-handoff.md` before starting.
- **Propose the page structure before writing any UI code.** For any new page or
  significant view, first present the user with a plain-language outline of the
  page's layout — sections, key components, and where data/actions live (a text
  wireframe/outline is enough; no need for full visual mockups). Wait for the
  user's approval before building. If the user asks for changes, revise the
  outline and re-confirm rather than building the unapproved version.
- Follow the project's design system (see `Design System / Visual Style` in
  `AGENTS.md` §6) for color, typography, and status colors — do not invent a
  different palette.
- Build against the **actual implemented** API (from the handoff doc), not the
  original spec, if the two diverged — the handoff doc is the source of truth for
  what actually exists.
- Handle loading states, error states, and empty states — these are required, not
  optional polish.
- Match existing design system / component conventions in the repo rather than
  inventing new patterns (check for a `frontend-design` skill or design tokens file
  if present).
- Write component/integration tests where the repo has a testing pattern for them.
- If a needed backend capability is missing or doesn't match what's needed, stop
  and report it rather than mocking around it silently — that's a routing failure,
  not something to paper over.

**Output artifact:** `frontend-handoff.md`
```markdown
## Frontend Handoff: <task name>
### Components/pages built
- ...

### Backend endpoints consumed
- ...

### States handled
- [ ] Loading
- [ ] Error
- [ ] Empty
- [ ] Success

### Manual test notes
- ...

### Known gaps / backend mismatches found
- ...
```

---

## 4. QA Agent

**Mandate:** Verify the completed work against `spec.md`'s acceptance criteria
before anything is committed or opened as a PR. This agent has no stake in the
implementation being "done" — its only job is to try to break it and check the
boxes honestly.

**Responsibilities:**
- Walk every item in the Acceptance Criteria checklist from `spec.md` and mark
  pass/fail with evidence (test output, not just "looks fine").
- Run the full test suite (backend + frontend), not just the new tests — regressions
  count.
- Run lint/type-check/build steps; a task that doesn't build is an automatic fail.
- Check the edge cases listed in the spec were actually handled, not just
  acknowledged.
- Check for scope creep: did Backend/Frontend build things outside what the spec
  asked for? Flag it — it needs sign-off, not silent inclusion.
- Do a basic security/sanity pass: input validation present, no obvious secrets
  committed, no unhandled error paths that would crash in production.
- If anything fails, write a **bug report** and route back to the responsible agent
  (Backend or Frontend) with specific repro steps. Do not fix the bug itself as QA —
  that reintroduces the "grading your own homework" problem. Re-run QA after the fix.

**Output artifact:** `qa-report.md`
```markdown
## QA Report: <task name>
### Acceptance criteria
- [x] Criterion 1 — PASS (evidence: ...)
- [ ] Criterion 2 — FAIL (repro: ...)

### Test suite results
- Backend: <pass/fail, counts>
- Frontend: <pass/fail, counts>
- Lint/typecheck/build: <pass/fail>

### Scope creep found
- ...

### Verdict
PASS — ready to commit
or
FAIL — routed back to <BACKEND|FRONTEND> with bug report above
```

**Hard rule:** Nothing is committed to `main` or opened as a PR until QA verdict is
PASS. No agent, including Backend or Frontend under time pressure, may skip this gate.

---

## 5. Cross-Cutting Rules (apply to every agent)

1. **Read before you write.** Every stage starts by reading the previous stage's
   artifact(s) in full — not skimming, not assuming.
2. **Stay in your lane.** Backend doesn't touch UI. Frontend doesn't touch business
   logic or schema. PM doesn't write code. QA doesn't fix bugs. If a task seems to
   require crossing lanes, that's a signal the spec was incomplete — route back to PM.
3. **No silent scope changes.** Any deviation from the spec, in either direction, is
   written down in the handoff doc, not just done quietly.
4. **Tests are not optional.** Code without tests does not pass to the next stage.
5. **Small, reviewable commits.** Each pipeline run should map to one coherent
   commit (or PR), with a message summarizing what PM/Backend/Frontend/QA did —
   not a giant undifferentiated diff.
6. **Failure routes backward, not around.** If QA fails something, it goes back to
   the agent that owns that layer. It never gets silently patched by QA or by the
   next agent in line.
7. **Ask, don't assume, when it's expensive to be wrong.** For anything cheap to
   reverse (naming, minor structure), pick a sensible default and note the
   assumption. For anything expensive to reverse (data model shape, public API
   contract, auth boundaries), stop and ask.
8. **Commit conventions:** use plain, normal industry-style commit messages —
   short imperative summary line, no task-ID tags or bracketed prefixes. e.g.
   `Add CSV export for match results`, `Fix comma escaping in resume parser`,
   `Add unit tests for scoring engine`. Optionally prefix with a conventional
   type (`feat:`, `fix:`, `test:`, `docs:`, `refactor:`) if the repo already uses
   that convention, but never include a task ID like `(TASK-001)`.
   **Commit cadence (user override, 2026-09-11 — supersedes the 2026-09-09
   note above):** commit and push after every feature that reaches QA
   `PASS` and is in a genuinely working state (build/lint/tests green) —
   back to per-feature commits, not milestone-batching. Commit messages
   should name the feature (`Feature #n: <name>`) and summarize what it
   adds, per §9 below. Always push to `main` on the remote configured in
   `git remote -v` (never assume a different URL, never push to a branch
   other than `main`) — see `docs/BACKEND_ARCHITECTURE.md`'s repo notes if
   the remote ever needs to change again.
9. **One feature at a time, then stop for review.** Work moves through the
   pipeline one feature at a time (see "Feature-wise, not phase-wise" above), not
   phase-by-phase and not the whole build in one pass. Do not start the next
   feature — and do not silently bundle several features into one task — until
   the current feature has an explicit QA `PASS`. Even after QA `PASS`, the agent
   stops and reports the result to the user rather than auto-continuing; it only
   starts the next feature once the user gives an explicit green light. If it's
   ever unclear which feature is next, ask rather than assume.

---

## 6. Repo-Specific Conventions

Prism is a **single Next.js project**, not a turborepo/monorepo — see
`buildPlan.md` §115 for the finalized directory layout and the rationale for
not using the `apps/`+`packages/` split originally sketched in `buildPlan.md`
§7.

- **Language(s) / framework(s):** TypeScript + Next.js (App Router) + React,
  used for both the web app and the API (Route Handlers). A separately
  deployable Node worker process (not a serverless function) handles resume/JD
  processing and matching — see `buildPlan.md` §92, §115.
- **Package manager:** npm
- **Test runner(s):** Jest (unit + integration), Playwright (E2E, per
  `buildPlan.md` §77)
- **Lint/format:** ESLint (already configured via `eslint.config.mjs`), run
  via `npm run lint`
- **Build command:** `npm run build`
- **Directory layout:** see `buildPlan.md` §115 for the full finalized tree
  (`app/`, `lib/{db,schemas,services,matching,extraction,embeddings,qdrant,
  queue,auth,config}`, `workers/`, `scripts/`, `tests/{unit,integration,
  evaluation}`, `docs/agent-artifacts/<task-id>/`).
- **Branching:** feature branches off `main`, named `agent/<task-id>-<short-desc>`
- **PR requirement:** PR description auto-populated from `qa-report.md` verdict +
  links to the four artifacts.

### Design System / Visual Style

- **Palette:** black-and-white(ish) — near-black and near-white as the dominant
  backgrounds/surfaces, with a grayscale range for borders, dividers, and
  secondary surfaces. Body/heading text is black (or near-black) on light
  surfaces.
- **Color is reserved for meaning, not decoration:** statuses, badges, alerts,
  links, and similar semantic elements use color (e.g. green for
  success/pass, red for error/fail, amber for warning/pending, blue for info).
  Do not use accent colors on structural chrome (nav, cards, backgrounds) —
  keep that grayscale.
- **Typography:** a clean, modern sans-serif font. Comfortable, readable sizing
  (avoid cramped small text) — establish a clear type scale (e.g. distinct sizes
  for page titles, section headings, body text, captions) and use it
  consistently rather than one-off sizes per component.
- Frontend Agent applies this palette/typography to every new page or component
  by default; deviations require explicit user approval as part of the page
  structure sign-off (see Frontend Agent responsibilities above).

---

## 7. Minimal Example Run

```
User: "Add a way for users to export their data as CSV."

[PM]      → writes spec.md: defines GET /api/export/csv contract,
            acceptance criteria (auth required, streams large datasets,
            correct CSV escaping, 401 on unauthenticated), flags "what
            fields are included" as needing user confirmation.
[BACKEND] → implements endpoint + streaming CSV writer + auth check +
            unit tests; writes backend-handoff.md.
[FRONTEND]→ adds "Export CSV" button, loading spinner, error toast;
            writes frontend-handoff.md.
[QA]      → runs full suite, checks each acceptance criterion, finds CSV
            escaping fails on fields containing commas → FAIL, routes
            bug report back to [BACKEND].
[BACKEND] → fixes escaping, re-submits.
[QA]      → re-runs, PASS.
→ commit: "Add CSV data export with auth and streaming"
→ agent reports PASS to the user and stops; waits for the user's go-ahead
   before starting the next feature.
```

---

## Why this structure (rationale, for whoever edits this file later)

A single agent doing everything tends to fail in predictable ways: it conflates
"I wrote code" with "the code works," it drifts from the original request as
context grows, and it has no independent check on its own output. Splitting into
PM → Backend → Frontend → QA with **written handoffs** — not just role-play in the
same context — forces the same context to be re-examined from a different angle at
each stage, which is where most bugs and scope drift actually get caught. The QA
gate existing as a *distinct, non-skippable* stage (rather than "and also test it
before you finish") is the single highest-leverage part of this setup.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
