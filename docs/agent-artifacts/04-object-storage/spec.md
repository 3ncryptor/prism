## Task: Object Storage

### Goal
S3-compatible client for storing/retrieving resume and JD files, per
`buildPlan.md` §5.1. Unblocks feature #5 (resume upload needs to store the
file) and feature #7 (resume worker needs to download it).

### In scope
- `lib/storage/s3Client.ts`: `uploadFile`, `downloadFile`,
  `getPresignedDownloadUrl` (buildPlan.md §80: signed/private URLs, not
  public file access), `buildResumeKey`/`buildJobKey` following §5.1's
  `/resumes/{studentId}/{resumeId}/original.{ext}` convention.
- Real S3-API integration testing via a MinIO Docker container (same
  pattern established in feature #3 for MongoDB — buildPlan.md §93's
  Docker-for-testing exception applies equally here: MinIO speaks the real
  S3 API, giving higher-confidence tests than mocking the AWS SDK).

### Out of scope
- The actual upload API route / resume upload flow (feature #5).
- File type/size validation (feature #5, per buildPlan.md §82 — this
  feature only stores/retrieves bytes it's given).
- Delete/lifecycle management (not needed by any near-term feature; add
  when one actually needs it).

### Acceptance Criteria
- [ ] `uploadFile` + `downloadFile` round-trip real bytes correctly against
      MinIO
- [ ] `getPresignedDownloadUrl` produces a URL that actually works (fetches
      the uploaded content) and is time-limited
- [ ] Key builders match buildPlan.md §5.1's path convention
- [ ] `npm run build`, `npm run lint`, `npm test` all pass
