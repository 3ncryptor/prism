## QA Report: Auth + Roles

### Acceptance criteria
- [~] A seeded ADMIN can sign in and lands on `/admin` — **PARTIAL.** The
  redirect-after-signin logic (`app/page.tsx` reading session role) and the
  credential-verification logic (`verifyCredentials`) are both unit-tested
  and correct in isolation, but the full browser flow (submit real
  credentials → NextAuth → Mongo lookup → session → redirect) cannot be
  exercised without a real `MONGODB_URI`. Deferred to manual verification
  (steps in `backend-handoff.md`).
- [~] A seeded STUDENT can sign in and lands on `/student` — **PARTIAL**,
  same reason as above.
- [x] Wrong password → error, no session — PASS at the unit level
  (`credentials.test.ts`: wrong password → `null`; sign-in page's catch
  block redirects to `/sign-in?error=1` on any `AuthError`, verified by
  code inspection). Full browser-level wrong-password submission deferred
  with the above (same Mongo dependency).
- [x] Unauthenticated → `/sign-in` — **PASS**, verified two ways: unit
  (`routeGuard.test.ts`, 2 cases) and real-browser E2E
  (`auth-redirects.spec.ts`, both `/admin` and `/student`).
- [x] Wrong role → redirected away — **PASS**, verified via
  `routeGuard.test.ts` (`STUDENT` on `/admin` → `/student`, `ADMIN` on
  `/student` → `/admin`, plus nested-path matching). Not re-verified at the
  browser level since that requires a real authenticated session (Mongo
  dependency), but the redirect *decision* logic itself — the actual thing
  this criterion is testing — is fully covered.
- [x] Role never read from client-supplied data — **PASS**, verified by
  code inspection: `guard.ts` and `proxy.ts` both source role exclusively
  from `getSession()`/`req.auth`, which NextAuth populates from the signed
  JWT session cookie. No code path reads `role` from a request body, query
  param, or header.
- [x] `scripts/seed.ts` is idempotent — **PASS** (`seedUsers.test.ts`:
  running twice produces the same count, no duplicate emails).
- [x] `npm run build`, `npm run lint`, `npm test` all pass — **PASS** (28/28
  unit tests, lint clean, typecheck clean, build clean).

### Test suite results
- Unit: 6 suites, 28 tests, all passing
  - `tests/unit/env.test.ts`: 7
  - `tests/unit/auth/credentials.test.ts`: 4
  - `tests/unit/auth/guard.test.ts`: 3
  - `tests/unit/auth/routeGuard.test.ts`: 8
  - `tests/unit/db/userRepository.test.ts`: 4
  - `tests/unit/db/seedUsers.test.ts`: 2
- E2E (Playwright): 5 tests, all passing (4 new auth-redirect tests + the
  Feature #1 homepage test, confirmed still passing after `app/page.tsx`
  changes).
- Lint/typecheck/build: all clean.

### Scope creep / mid-feature corrections check
Two corrections were made beyond the literal spec, both disclosed in
`backend-handoff.md` and both necessary rather than speculative:
- `lib/config/env.ts` redesign (monolithic → scoped) — this fixes a real
  bug discovered while implementing this feature (Auth would have been
  blocked from running without unrelated Redis/S3/Qdrant/LLM config). Not
  scope creep — a correction to Feature #1's design, required for Feature #2
  to function at all.
- `middleware.ts` → `proxy.ts` rename — required by Next.js 16's actual
  behavior (confirmed via the framework's own bundled docs), not optional.
- `lib/auth/routeGuard.ts` extraction — done specifically to close a test
  coverage gap (the "wrong role redirected away" criterion), not scope
  creep; no new product behavior, same redirect logic, now unit-testable.

No undisclosed scope creep found.

### Security/sanity pass
- No secrets committed; `.env` still does not exist; dev seed password
  (`prism-dev-password`) is clearly labeled dev-only in code comments and
  only ever seeds `@prism.dev` fake accounts.
- Role-based access control verified to read only from the server-side
  session (see acceptance criteria above) — this was the highest-priority
  security check for this feature per `AGENTS.md`'s security review
  triggers (authentication/authorization code).
- Passwords are hashed with bcrypt (`bcryptjs`, cost factor 10) before
  storage; plaintext password never persisted.
- No `console.log` in new code; `logger`/thrown `Error`s used throughout.
- Known, disclosed gap: no rate limiting on `/api/auth/*` yet (explicitly
  deferred to feature #27 in `spec.md` — not a silent omission).

### Verdict
**PASS, with one disclosed limitation carried forward:** the full
credential-submission browser flow (correct login → correct dashboard;
wrong password → visible error) is verified at the unit-test level but not
at the real-browser/real-database level, because `MONGODB_URI` isn't
configured yet. All logic that *can* be verified without a live database has
been, including real-browser E2E coverage of the redirect/access-control
behavior that doesn't depend on Mongo. Recommend manual verification of the
credential flow as soon as Atlas is set up (steps in `backend-handoff.md`);
this does not block moving to the next feature, since Feature #3 (MongoDB
models) is precisely what will make a real connection available to test
against.
