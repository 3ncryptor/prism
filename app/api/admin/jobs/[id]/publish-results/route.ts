import { NextResponse } from "next/server";
import { requireRole, UnauthorizedError, ForbiddenError } from "@/lib/auth/guard";
import {
  publishResults,
  JobNotFoundError,
  MatchRunNotFoundError,
  MatchRunNotCompletedError,
} from "@/lib/services/jobService";
import { recordAuditLog } from "@/lib/services/auditLogService";

/** buildPlan.md §113.2. */
export async function POST(request: Request, ctx: RouteContext<"/api/admin/jobs/[id]/publish-results">) {
  try {
    const session = await requireRole("ADMIN");
    const { id } = await ctx.params;
    const body = await request.json().catch(() => ({}));
    const matchRunId = body.matchRunId;
    if (typeof matchRunId !== "string" || !matchRunId) {
      return NextResponse.json({ error: "matchRunId is required" }, { status: 400 });
    }

    const job = await publishResults(id, matchRunId);

    await recordAuditLog({
      actorId: session.user.id,
      actorRole: "ADMIN",
      action: "RESULTS_PUBLISHED",
      targetType: "job",
      targetId: id,
      metadata: { matchRunId },
    });

    return NextResponse.json({
      jobId: job._id,
      publishedMatchRunId: job.publishedMatchRunId,
      publishedAt: job.publishedAt,
    });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    if (error instanceof ForbiddenError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    if (error instanceof JobNotFoundError || error instanceof MatchRunNotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    if (error instanceof MatchRunNotCompletedError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    throw error;
  }
}
