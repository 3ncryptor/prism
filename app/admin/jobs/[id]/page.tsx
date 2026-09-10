import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth/guard";
import { jobRepository } from "@/lib/db/repositories/jobRepository";
import { jobProfileRepository } from "@/lib/db/repositories/jobProfileRepository";
import { matchRunRepository } from "@/lib/db/repositories/matchRunRepository";
import { matchResultRepository } from "@/lib/db/repositories/matchResultRepository";
import { ClientOnlyJobDetail } from "@/app/admin/jobs/[id]/ClientOnlyJobDetail";
import type { FitBucket } from "@/lib/matching/types";

/** buildPlan.md §84/§85 — feature #22. Shell (identity/sign-out) lives in app/admin/layout.tsx (feature 27a). */
export default async function JobDetailPage({ params }: PageProps<"/admin/jobs/[id]">) {
  await requireRole("ADMIN");
  const { id } = await params;

  const job = await jobRepository.get(id);
  if (!job) notFound();

  const jobProfile = await jobProfileRepository.getByJobId(id);

  const matchRuns = await matchRunRepository.listByJob(id);
  const latestRun = matchRuns[0] ?? null;

  let bucketCounts: Record<FitBucket, number> | null = null;
  if (latestRun && latestRun.status === "COMPLETED") {
    const results = await matchResultRepository.listByRun(latestRun._id, { includeIneligible: true });
    bucketCounts = { BEST_FIT: 0, MODERATE_FIT: 0, LOW_FIT: 0 };
    for (const result of results) bucketCounts[result.bucket] += 1;
  }

  return (
    <ClientOnlyJobDetail
      job={job}
      jobProfile={jobProfile}
      initialLatestRun={latestRun}
      initialBucketCounts={bucketCounts}
    />
  );
}
