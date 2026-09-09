import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth/guard";
import { signOut } from "@/lib/auth/config";
import { jobRepository } from "@/lib/db/repositories/jobRepository";
import { matchRunRepository } from "@/lib/db/repositories/matchRunRepository";
import { matchResultRepository } from "@/lib/db/repositories/matchResultRepository";
import { ClientOnlyJobDetail } from "@/app/admin/jobs/[id]/ClientOnlyJobDetail";
import type { FitBucket } from "@/lib/matching/types";

async function handleSignOut() {
  "use server";
  await signOut({ redirectTo: "/" });
}

/** buildPlan.md §84/§85 — feature #22. */
export default async function JobDetailPage({ params }: PageProps<"/admin/jobs/[id]">) {
  const session = await requireRole("ADMIN");
  const { id } = await params;

  const job = await jobRepository.get(id);
  if (!job) notFound();

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
      adminName={session.user.name ?? ""}
      adminEmail={session.user.email ?? ""}
      job={job}
      initialLatestRun={latestRun}
      initialBucketCounts={bucketCounts}
      onSignOut={handleSignOut}
    />
  );
}
