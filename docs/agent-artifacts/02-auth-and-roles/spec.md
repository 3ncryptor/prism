## Task: Auth + Roles

### Goal
Students and admins can sign in with email/password; the server enforces
role-based access (`STUDENT` / `ADMIN`) on every protected route, never
trusting a client-supplied role. This is `buildPlan.md` §106 feature #2.

### In scope
- NextAuth v5 + Credentials provider + `bcryptjs`, per `buildPlan.md` §5.6.
- `lib/db/client.ts`: MongoDB connection singleton (only the connection —
  the broader domain-model collections/repositories are feature #3). Needed
  now because Auth cannot function without a `users` collection.
- `lib/schemas/user.ts`, `lib/db/repositories/userRepository.ts`
  (`findByEmail`, `findById`, `create`).
- `lib/auth/config.ts`, `lib/auth/session.ts`, `lib/auth/guard.ts`
  (`requireRole`), per `docs/BACKEND_ARCHITECTURE.md` §9 — adjusted for the
  real NextAuth v5 API (`auth()`, not v4's `getServerSession()` as originally
  sketched; verified against the installed `next-auth@5.0.0-beta.32` types).
- `middleware.ts`: unauthenticated → redirect to `/sign-in`; authenticated
  but wrong role for `/student/**` or `/admin/**` → redirect to their own
  home.
- `scripts/seed.ts`: creates one `ADMIN` user and a few `STUDENT` users with
  known dev credentials (bcrypt-hashed), idempotent (safe to re-run).
- Sign-in page (`app/(auth)/sign-in/page.tsx`) — email/password form, server
  action, error message on invalid credentials.
- **No public sign-up route** — confirmed with the user: accounts are
  seed-provisioned only for V1, matching `buildPlan.md` §2.1/§2.2 (only
  "sign in" is a listed capability for either role).
- Minimal placeholder pages at `/student` and `/admin` showing session info
  + sign-out, so the auth flow is demonstrable end-to-end. **These are not
  the real dashboards** (features #10 and #22 replace them) — explicitly
  temporary, flagged so nobody mistakes them for finished UI.

### Out of scope
- Public self-service sign-up (explicit user decision, see above).
- University SSO (deferred per `buildPlan.md` §5.6).
- The real student/admin dashboards (features #10, #22).
- The broader domain-model collections beyond `users` (feature #3).
- Rate limiting on sign-in attempts (feature #27 Security/hardening,
  `buildPlan.md` §83) — noted as a gap, not silently addressed here.

### API / Data Contract
```text
POST /api/auth/signin (NextAuth-managed)
POST /api/auth/signout (NextAuth-managed)
GET  /api/auth/session (NextAuth-managed)
```
`User` document: `{ _id, email, name, role: "STUDENT"|"ADMIN", passwordHash,
createdAt, updatedAt }` per `buildPlan.md` §8, with `passwordHash` added
(not shown in §8's example but required for Credentials auth).

### Acceptance Criteria
- [ ] A seeded ADMIN can sign in and lands on `/admin`
- [ ] A seeded STUDENT can sign in and lands on `/student`
- [ ] Wrong password → sign-in page shows an error, no session created
- [ ] Unauthenticated request to `/student` or `/admin` → redirected to
      `/sign-in`
- [ ] A signed-in STUDENT visiting `/admin` → redirected away (not granted
      access), and vice versa
- [ ] Role is never read from anything client-supplied — `requireRole()`
      reads only from the server-side session
- [ ] `scripts/seed.ts` is idempotent — running it twice does not error or
      duplicate users
- [ ] `npm run build`, `npm run lint`, `npm test` all pass

### Edge cases to handle
- Missing/malformed credentials in the sign-in form → clear error, not a
  500.
- `userRepository.findByEmail` for a non-existent email must behave
  identically (timing/response-wise, as much as practical) to a wrong
  password, to avoid trivially confirming which emails have accounts.

### Open questions
None — self-service sign-up question resolved with the user before this
spec was written.
