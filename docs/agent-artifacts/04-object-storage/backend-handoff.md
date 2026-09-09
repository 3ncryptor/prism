## Backend Handoff: Object Storage

### What was built
- `lib/storage/s3Client.ts`: `uploadFile`, `downloadFile`,
  `getPresignedDownloadUrl` (5-minute default expiry), `buildResumeKey`/
  `buildJobKey` matching buildPlan.md §5.1's path convention. Works against
  both real AWS S3 (no `S3_ENDPOINT` set) and S3-compatible services like
  MinIO/R2 (`S3_ENDPOINT` set → `forcePathStyle: true`, required for those).
- `tests/integration/minioContainer.ts`: same Docker-driven pattern as
  `mongoContainer.ts` — starts a real MinIO container, creates a test
  bucket via its bundled `mc` client.

### Deviations
None. Went smoothly — no environment incompatibilities this time (unlike
feature #3's Mongo driver/testcontainers issues).

### Tests written
`tests/integration/storage/s3Client.docker.test.ts` — 3 tests against a
real MinIO container: key-builder convention, upload→download byte-exact
round-trip, and a presigned URL that's actually fetched over HTTP and
verified to return the right content.

### How to run
Same as before (Docker must be running for integration tests). All green:
39/39 tests, lint, typecheck, build.

### Known limitations / things Frontend needs to know
No frontend work in this feature (client library only). Nothing calls this
yet — feature #5 (resume upload) is the first real caller.
