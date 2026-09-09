## QA: Feature #22 (Admin Dashboard)

### Acceptance criteria
- [x] `/admin` lists jobs with status, has a JD upload form — verified live.
- [x] `/admin/jobs/[id]` shows title/company, bucket counts, Run/Re-run
      Matching button, result table (Rank/Student/Score/Confidence/Bucket/
      Missing requirements) — verified live against the real test job from
      the #14-21 batch.
- [x] `npm run build`/`lint`/`typecheck` all pass.

### Bugs found and fixed during live testing
- **Results table stayed empty for an already-`COMPLETED` run on page
  load.** The polling `useEffect` only fetched while the run was
  QUEUED/RUNNING, so a page load against a run that finished earlier never
  populated the table (bucket counts alone came from the server-rendered
  props). Fixed by always fetching once per run (deferred via `setTimeout`
  rather than a synchronous effect-body call, per the
  `react-hooks/set-state-in-effect` lint rule — caught by `npm run lint`,
  not guessed).

### Live verification
Signed in as the seeded admin, viewed the real test job ("Machine Learning
Engineer" / DataCorp) created during the #14-21 batch verification.
Confirmed correct bucket counts (1 Best Fit / 0 Moderate / 2 Low Fit) and
result row (Student Three, 90.9, 79%, Best Fit) matching the previously
-verified match data exactly. Clicked "Re-run Matching" twice; confirmed
two new real `MatchRun` documents were created and completed in MongoDB
(not a cached re-display) — `docker exec` query against the real database
shows 3 total runs for this job, all `COMPLETED`.

### Scope notes
Publish/Hide and Export CSV are intentionally not in this page yet — they
land with #22a and #24 respectively, to keep each commit scoped to
exactly one feature (per the user's explicit "commit after each feature"
instruction).

### Verdict
PASS.
