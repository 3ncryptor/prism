## Backend Handoff: Project Foundation

### What was built
- **`package.json` reconciled** with `buildPlan.md` §111/§118: removed
  `@pinecone-database/pinecone`; added `@qdrant/js-client-rest`, `openai`,
  `@anthropic-ai/sdk`. Added `jest`, `@types/jest`, `pino-pretty`,
  `@playwright/test` as dev dependencies (Chromium browser installed via
  `npx playwright install --with-deps chromium`).
- **Scripts added:** `typecheck`, `test`, `test:watch`, `test:e2e`.
- **`lib/config/env.ts`** — Zod-validated env loader (`loadEnv()`), lazy
  (only validates on first call, not at import time, so `next build` doesn't
  require secrets). Conditionally requires `GEMINI_API_KEY` /
  `ANTHROPIC_API_KEY` / `OPENAI_API_KEY` based on `EXTRACTION_PROVIDER` /
  `EMBEDDING_PROVIDER`, per `BACKEND_ARCHITECTURE.md` §4/§10.
- **`lib/logger.ts`** — Pino instance, pretty-printed in dev, JSON in prod.
- **`.env.example`** — every var from `BACKEND_ARCHITECTURE.md` §10 with a
  one-line comment; `.gitignore` updated to keep `.env*` ignored except this
  file.
- **Testing setup:** `jest.config.mjs` (via `next/jest`, `.mjs` not `.ts`
  since Jest requires `ts-node` to parse TS config files, which this project
  doesn't otherwise need — see Deviations); `playwright.config.ts`.
  `tests/{unit,integration,evaluation}` created (`.gitkeep` in the two
  currently-empty ones); `tests/e2e/` added (see Deviations).
- **Homepage/layout** replaced create-next-app template content with the
  grayscale design-system tokens (`app/globals.css`: `--muted`, `--border`,
  `--surface`, `--status-*` custom properties + Tailwind `@theme` mappings)
  and a minimal Prism landing page.

### Deviations from spec (and from buildPlan.md/BACKEND_ARCHITECTURE.md)
- **`jest.config.mjs` instead of `.ts`**: Jest 30 requires `ts-node` to load
  a TypeScript config file; adding `ts-node` solely for this felt like an
  unnecessary dependency when a plain `.mjs` config does the same job with
  zero extra installs. Functionally identical.
- **Added `tests/e2e/`**, not listed in `BACKEND_ARCHITECTURE.md` §1's tree
  (which only shows `tests/{unit,integration,evaluation}`). Playwright specs
  need their own directory distinct from Jest's `tests/integration`
  (buildPlan.md §76's "integration tests" are Jest-based against test
  databases, not full-browser E2E per §77) — otherwise Jest would try to
  execute `.spec.ts` Playwright files. Small, additive; flagging per
  `AGENTS.md` Rule 3 (no silent scope changes).
- **Playwright's dev server runs on port 3100**, not 3000: port 3000 is
  permanently occupied on this machine by an unrelated project
  (`RU-Web/apps/admin`). `npm run dev` itself is untouched (still defaults to
  3000) — only the E2E test's ephemeral server uses 3100, via
  `playwright.config.ts`'s `webServer.command`.
- **`AGENTS.md` gained an auto-generated block** ("This is NOT the Next.js
  you know...") from Next.js 16 itself during `next dev`/`next build` — not
  something I wrote. Left in place per its own instruction ("committing it
  with your work keeps the tree clean").

### Tests written
- `tests/unit/env.test.ts` — 4 tests covering `loadEnv()`: throws with a
  clear multi-line error when required vars are missing; validates
  successfully when `EXTRACTION_PROVIDER=gemini` + `GEMINI_API_KEY` present;
  throws when `EXTRACTION_PROVIDER=claude` but `ANTHROPIC_API_KEY` is
  missing; caches the validated result across calls.
- `tests/e2e/homepage.spec.ts` — 1 Playwright test confirming the homepage
  renders the Prism heading (proves the E2E pipeline works end-to-end:
  starts a dev server, loads a real browser, asserts on rendered content).

### How to run
```bash
npm run lint        # ESLint
npm run typecheck   # tsc --noEmit
npm test            # Jest (unit/integration)
npm run test:e2e    # Playwright (starts its own dev server on :3100)
npm run build       # next build (Turbopack)
```
All five pass clean as of this handoff.

### Known limitations / things Frontend needs to know
- No Frontend-specific work was needed for this feature — no user-facing
  capability exists yet (per `spec.md`'s explicit out-of-scope list). The
  homepage update is cosmetic/design-token verification only, done as part
  of this Backend pass.
- `lib/db/`, `lib/services/`, `lib/matching/`, `lib/extraction/`,
  `lib/embeddings/`, `lib/qdrant/`, `lib/queue/`, `lib/auth/` do **not**
  exist yet — intentionally, per spec's out-of-scope list (YAGNI). They get
  created by the feature that actually populates them (#2 Auth, #3 MongoDB
  models, etc.), per `docs/BACKEND_ARCHITECTURE.md` §1's target tree.
- `.env` still does not exist locally — `MONGODB_URI`/`REDIS_URL`/
  `QDRANT_URL`/S3 credentials are pending your account setup (cloud
  free-tier + AWS S3, per your last answers). Nothing in this feature
  requires them; Feature #2 (Auth) only needs `AUTH_SECRET`, which can be
  generated locally with `npx auth secret` and doesn't depend on any
  external account.
