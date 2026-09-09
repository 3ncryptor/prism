# Evaluation fixtures

Run with `npm run evaluate`.

These are **synthetic, hand-authored fixtures** — not the real labeled
dataset described in buildPlan.md §67 (100 students / 20 JDs, labeled by
placement staff). No such dataset exists yet. This directory exists to:

1. Give `scripts/evaluate.ts` something to run against so the harness
   itself is exercised end-to-end.
2. Catch regressions in the deterministic matching engine (skills,
   experience, education, hard requirements, bucketing, mandatory-skill
   penalty) — every expected value in `labels/labels.json` was computed
   by hand-tracing `lib/matching/*` against these fixtures, so a mismatch
   means the matching logic changed, not that the dataset is noisy.

What this does **not** measure: extraction accuracy or embedding/semantic
match quality. All fixtures use empty `responsibilities`/
`semanticRequirements` and an empty retrieval map, so project/semantic
scoring always defaults to 100 (no responsibilities to match) rather than
exercising the embedding path. Extraction F1 and NDCG@20 (buildPlan.md
§78) require real extracted resumes/JDs and a real ranked candidate pool
— they are reported as "not computed" until that data exists, rather
than faked from this synthetic set.

- `resumes/*.json` — `StudentProfile`-shaped fixtures
- `jobs/*.json` — `JobProfile`-shaped fixtures
- `labels/labels.json` — `{resumeFile, jobFile, expectedBucket, expectedSkills}[]`
