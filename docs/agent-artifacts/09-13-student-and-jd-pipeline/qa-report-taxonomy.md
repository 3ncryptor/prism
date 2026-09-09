## QA Report: Feature #13 (Skill Taxonomy)

### Acceptance criteria (from spec.md)

- [x] `skillTaxonomyService.canonicalize("NodeJS")` resolves to `"node.js"`
      via the seeded alias table — PASS. Verified two ways: (1) the pure
      `canonicalizeSkillName("NodeJS", [...])` unit test asserts this exact
      case; (2) the real seed data (`lib/db/seed/seedSkillTaxonomy.ts`)
      includes a `node.js` entry with `aliases: ["nodejs", "node"]`, so the
      same lookup resolves against real seeded data, not just a test
      fixture.
- [x] `npm run build`, `npm run lint`, `npm run typecheck` all pass — PASS,
      evidence below.

### Test suite results

- New/updated unit tests: `npx jest tests/unit` → 13 suites, 66 tests, all
  pass (includes the new `skillTaxonomyService.test.ts` — 6 tests covering
  canonicalName/displayName/alias matches, inactive-entry exclusion, and
  the no-match fallback — plus updated `normalizeProfile.test.ts` cases for
  taxonomy-based canonicalization vs. the fallback path).
- Lint: `npm run lint` → clean.
- Typecheck: `npm run typecheck` → clean.
- Build: `npm run build` → succeeds, all routes compile.
- Real-infra verification: `npm run seed` run twice against the real
  Docker MongoDB (`prism-mongo`) — first run seeded 46 skill taxonomy
  entries, second run reported the same count (46) and
  `db.skillTaxonomy.countDocuments()` confirmed no duplicates —
  `upsertByCanonicalName`'s idempotency holds against a real database, not
  just mocked repos.

### Scope creep found

- None. Feature stayed within spec.md §13's boundary: schema + repository +
  service + wiring into `normalizeProfile.ts` (resume side only) + seed
  data. `normalizeJobProfile.ts` (JD side) was explicitly left untouched —
  spec.md only names `normalizeProfile.ts`, and JD requirement
  canonicalization is a matching-engine-time concern (buildPlan.md §27),
  not an extraction-time one for JDs.
- No admin CRUD UI was built — spec.md explicitly defers that to feature
  #22b.

### Security/sanity pass

- No secrets involved (this feature has no external API calls).
- `skillTaxonomyRepository.upsertByCanonicalName` scopes its update to
  `{ canonicalName }` and never trusts caller-supplied `_id`/`createdAt` —
  no injection surface (all values come from a hardcoded seed list, not
  user input, in this feature).

### Verdict

PASS — ready to commit.
