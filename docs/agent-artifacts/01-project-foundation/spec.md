## Task: Project Foundation

### Goal
Reconcile the existing Next.js scaffold with the finalized architecture
(`buildPlan.md`, `docs/BACKEND_ARCHITECTURE.md`) and stand up the tooling
every subsequent feature depends on: correct dependencies, env validation,
logging, testing frameworks, and a baseline UI that reflects the design
system instead of the create-next-app template. This is `buildPlan.md` §106
feature #1.

### In scope
- Remove the Pinecone SDK from `package.json`; add the Qdrant client, OpenAI
  SDK, and Anthropic SDK (per `buildPlan.md` §5.7 provider matrix — installed
  now so later features don't redo dependency setup; not wired into any
  logic yet).
- Add Jest (unit/integration) and Playwright (E2E) as dev dependencies, with
  minimal working config, per `AGENTS.md` §6.
- `lib/config/env.ts`: Zod-validated environment loader (fails fast with a
  clear error listing missing vars, not a runtime crash deep in a request).
- `.env.example` documenting every var from `BACKEND_ARCHITECTURE.md` §10.
- `lib/logger.ts`: a configured Pino instance (no call sites wired yet —
  those come with the features that need them).
- Replace the create-next-app template homepage/layout with a minimal page
  reflecting the grayscale design system (`AGENTS.md` §6 Design System) —
  no product functionality, just confirms the design tokens are wired up.
- `tests/{unit,integration,evaluation}/` directories exist with a trivial
  smoke test in `tests/unit/` proving Jest runs against this project.
- Verify `npm run build`, `npm run lint`, and `npm test` all pass clean.

### Out of scope (explicitly deferred to later features)
- Any MongoDB connection code or repositories (feature #3).
- Any auth code — NextAuth config, sign-in pages (feature #2).
- Any queue/worker code (feature #6, #7).
- Any S3/object-storage code (feature #4).
- Any extraction/embedding/matching code (features #8+).
- Pre-creating empty `lib/matching/`, `lib/extraction/`, `lib/services/`,
  etc. directories with no content — those get created by the feature that
  actually populates them, per the project's YAGNI convention. The target
  shape is already documented in `docs/BACKEND_ARCHITECTURE.md` §1; this
  feature does not duplicate it as empty scaffolding.

### Acceptance Criteria
- [ ] `package.json` has no `@pinecone-database/pinecone` dependency
- [ ] `package.json` has a Qdrant client, OpenAI SDK, and Anthropic SDK
- [ ] `package.json` has Jest + Playwright as dev dependencies with working
      `npm test` / `npm run test:e2e` scripts
- [ ] `npm run build` succeeds
- [ ] `npm run lint` succeeds
- [ ] `npm test` passes (at least one real smoke test)
- [ ] `lib/config/env.ts` throws a clear, listed error when a required var
      is missing, and exports typed, validated env values when present
- [ ] `.env.example` exists and lists every var from `BACKEND_ARCHITECTURE.md`
      §10 with a one-line comment each
- [ ] `lib/logger.ts` exports a working Pino logger instance
- [ ] Homepage no longer shows create-next-app/Vercel template content;
      reflects the grayscale palette + type scale from `AGENTS.md` §6
- [ ] `tests/unit/`, `tests/integration/`, `tests/evaluation/` directories
      exist

### Edge cases to handle
- `lib/config/env.ts` must not throw at *module import* time in a way that
  breaks `npm run build` (Next.js evaluates some modules at build time) —
  validation should run lazily (first access / explicit `loadEnv()` call),
  not at import time, so build doesn't require production secrets to exist.
- `.env.example` must not contain any real secret values, only placeholders.

### Open questions
None — all architecture decisions were resolved in `buildPlan.md` §118 and
`docs/BACKEND_ARCHITECTURE.md` §0 prior to this spec.
