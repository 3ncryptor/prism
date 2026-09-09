import { NextResponse } from "next/server";
import { requireRole, UnauthorizedError, ForbiddenError } from "@/lib/auth/guard";
import { matchRunRepository } from "@/lib/db/repositories/matchRunRepository";
import { matchResultRepository } from "@/lib/db/repositories/matchResultRepository";
import type { FitBucket } from "@/lib/matching/types";

const VALID_BUCKETS: FitBucket[] = ["BEST_FIT", "MODERATE_FIT", "LOW_FIT"];

/**
 * buildPlan.md §51: GET /api/admin/jobs/:id/results. Minimal read surface
 * for feature #21 (the browsable admin UI is feature #22) — defaults to
 * the job's most recent match run when ?runId isn't given.
 */
export async function GET(request: Request, ctx: RouteContext<"/api/admin/jobs/[id]/results">) {
  try {
    await requireRole("ADMIN");
    const { id } = await ctx.params;
    const url = new URL(request.url);
    const requestedRunId = url.searchParams.get("runId");
    const bucketParam = url.searchParams.get("bucket");
    const includeIneligible = url.searchParams.get("includeIneligible") === "true";

    let runId = requestedRunId;
    if (!runId) {
      const runs = await matchRunRepository.listByJob(id);
      if (runs.length === 0) {
        return NextResponse.json({ error: "No match runs found for this job" }, { status: 404 });
      }
      runId = runs[0]._id;
    }

    const run = await matchRunRepository.get(runId);
    if (!run || run.jobId !== id) {
      return NextResponse.json({ error: "Match run not found for this job" }, { status: 404 });
    }

    const bucket = bucketParam && VALID_BUCKETS.includes(bucketParam as FitBucket) ? (bucketParam as FitBucket) : undefined;
    const results = await matchResultRepository.listByRun(runId, { bucket, includeIneligible });

    return NextResponse.json({ run, results });
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
