## Backend Handoff: Auth + Roles

### What was built
- **`lib/config/env.ts` refactored** from one monolithic `loadEnv()` to
  scoped getters (`getMongoUri`, `getRedisUrl`, `getQdrantConfig`,
  `getS3Config`, `getExtractionProviderName`, `getEmbeddingProviderName`,
  `getGeminiApiKey`, `getAnthropicApiKey`, `getOpenAiApiKey`) — see
  Deviations, this was a necessary correction, not optional polish.
- **`lib/db/client.ts`**: MongoDB connection singleton, cached across dev
  hot-reloads.
- **`lib/schemas/user.ts`**, **`lib/db/repositories/userRepository.ts`**
  (`findByEmail`, `findById`, `create`, `upsertByEmail`) — constructor takes
  an injected `getCollection` function so it's unit-testable without a real
  database.
- **`lib/auth/credentials.ts`**: `verifyCredentials()`, pure logic separated
  from NextAuth's `authorize` callback for testability.
- **`lib/auth/config.ts`**: NextAuth v5 + Credentials provider, JWT session
  strategy, `role` propagated through `jwt`/`session` callbacks.
- **`lib/auth/session.ts`**, **`lib/auth/guard.ts`** (`requireRole`,
  `UnauthorizedError`, `ForbiddenError`).
- **`app/api/auth/[...nextauth]/route.ts`**, **`types/next-auth.d.ts`**
  (Session/User/JWT augmented with `role`/`id`).
- **`proxy.ts`** (not `middleware.ts` — see Deviations): redirects
  unauthenticated visitors to `/sign-in`, and authenticated-but-wrong-role
  visitors away from `/student/**` or `/admin/**`.
- **`app/(auth)/sign-in/page.tsx`**: email/password form, server action,
  error message on invalid credentials. No sign-up route, per your decision.
- **`app/student/page.tsx`, `app/admin/page.tsx`**: explicitly-labeled
  placeholders proving the role-gated flow end-to-end (session info +
  sign-out) — features #10/#22 replace these with real dashboards.
- **`app/page.tsx`**: now redirects signed-in users to `/student` or
  `/admin`; shows a "Sign in" link otherwise.
- **`lib/db/seed/seedUsers.ts`**, **`scripts/seed.ts`** implemented: seeds
  one ADMIN + three STUDENT dev accounts (`admin@prism.dev`,
  `student1-3@prism.dev`, password `prism-dev-password`), idempotent via
  `upsertByEmail`.

### Deviations from spec
- **`lib/config/env.ts` redesigned mid-feature.** The Feature #1 version's
  single `loadEnv()` validated *all* vars atomically — so Auth touching
  Mongo would incorrectly also demand Redis/S3/Qdrant/Gemini keys it never
  uses. Replaced with per-concern getters, each validating only its own
  var(s). `tests/unit/env.test.ts` rewritten to match.
- **`middleware.ts` → `proxy.ts`.** Next.js 16 deprecated the `middleware`
  file convention in favor of `proxy` (confirmed via
  `node_modules/next/dist/docs/.../proxy.md` — the "this is not the Next.js
  you know" warning was correct to heed here). Same `auth()`-wrapped
  request handler, same `config.matcher`, just the file/export convention.
- **`mongodb-memory-server` added then removed.** Used it to get a real
  MongoDB engine for integration tests; it hit a driver/server handshake
  incompatibility ("Missing required sub-document 'driver'") with this
  environment's `mongodb@7.6.0` that I couldn't resolve by pinning a
  different server version in reasonable time. Replaced with a hand-rolled
  `tests/helpers/fakeCollection.ts` — a minimal in-memory `Collection<T>`
  stand-in implementing only the operations the repositories use. Real
  integration testing against an actual MongoDB (Atlas) is deferred until
  `MONGODB_URI` is configured.
- **`tests/e2e/auth-redirects.spec.ts` only covers DB-independent
  behavior** (unauthenticated redirects, sign-in page rendering, homepage
  sign-in link). Actually submitting valid/invalid credentials requires a
  real Mongo connection to look up the seeded user — deferred to manual
  verification once `MONGODB_URI` exists (see qa-report.md).

### Tests written
- `tests/unit/env.test.ts` (rewritten) — 7 tests for the new scoped getters.
- `tests/unit/auth/credentials.test.ts` — 4 tests: missing fields, no user,
  wrong password, correct credentials → mapped `AuthenticatedUser`.
- `tests/unit/auth/guard.test.ts` — 3 tests: no session → Unauthorized,
  wrong role → Forbidden, matching role → returns session.
- `tests/unit/db/userRepository.test.ts` — 4 tests against `FakeCollection`:
  create+findByEmail, findById, findByEmail-miss, upsert-is-idempotent.
- `tests/unit/db/seedUsers.test.ts` — 2 tests: idempotency, role
  distribution (exactly one ADMIN).
- `tests/e2e/auth-redirects.spec.ts` — 4 Playwright tests (see Deviations
  for scope).

### How to run
Same as Feature #1 (`npm run lint/typecheck/test/test:e2e/build`), all
green. `npm run test:e2e` now sets a throwaway `AUTH_SECRET` itself so it
works standalone.

### Known limitations / things Frontend needs to know
- `/student` and `/admin` are placeholders, explicitly marked as such in
  their own file comments — do not build on top of them, replace them
  entirely in features #10/#22.
- The actual "sign in with real seeded credentials" flow is untested at the
  browser level pending `MONGODB_URI`. Once you have Atlas credentials in
  `.env`, run `npm run seed` then manually verify: sign in as
  `admin@prism.dev` / `prism-dev-password` → lands on `/admin`; sign in as
  `student1@prism.dev` / `prism-dev-password` → lands on `/student`; wrong
  password → error shown on `/sign-in`.
- Rate limiting on sign-in attempts is explicitly out of scope (deferred to
  feature #27, per spec.md).
