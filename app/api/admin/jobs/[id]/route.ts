import { NextResponse } from "next/server";
import { requireRole, UnauthorizedError, ForbiddenError } from "@/lib/auth/guard";
import { jobRepository } from "@/lib/db/repositories/jobRepository";
import { jobProfileRepository } from "@/lib/db/repositories/jobProfileRepository";
import { matchRunRepository } from "@/lib/db/repositories/matchRunRepository";
import { matchResultRepository } from "@/lib/db/repositories/matchResultRepository";
import type { FitBucket } from "@/lib/matching/types";

const BUCKETS: FitBucket[] = ["BEST_FIT", "MODERATE_FIT", "LOW_FIT"];

/** buildPlan.md §84's job detail header (candidate count, bucket breakdown, publish state). */
export async function GET(_request: Request, ctx: RouteContext<"/api/admin/jobs/[id]">) {
  try {
    await requireRole("ADMIN");
    const { id } = await ctx.params;

    const job = await jobRepository.get(id);
    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    const [jobProfile, matchRuns] = await Promise.all([
      jobProfileRepository.getByJobId(id),
      matchRunRepository.listByJob(id),
    ]);

    const latestRun = matchRuns[0] ?? null;
    let bucketCounts: Record<FitBucket, number> | null = null;
    if (latestRun && latestRun.status === "COMPLETED") {
      const results = await matchResultRepository.listByRun(latestRun._id, { includeIneligible: true });
      bucketCounts = { BEST_FIT: 0, MODERATE_FIT: 0, LOW_FIT: 0 };
      for (const result of results) {
        bucketCounts[result.bucket] += 1;
      }
    }

    return NextResponse.json({
      job,
      jobProfile,
      latestRun,
      matchRuns,
      bucketCounts,
      buckets: BUCKETS,
    });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    if (error instanceof ForbiddenError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    throw error;
  }
}
