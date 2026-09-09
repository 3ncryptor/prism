import { NextResponse } from "next/server";
import { requireRole, UnauthorizedError, ForbiddenError } from "@/lib/auth/guard";
import { hideResults, JobNotFoundError } from "@/lib/services/jobService";
import { recordAuditLog } from "@/lib/services/auditLogService";

/** buildPlan.md §113.2. */
export async function POST(_request: Request, ctx: RouteContext<"/api/admin/jobs/[id]/hide-results">) {
  try {
    const session = await requireRole("ADMIN");
    const { id } = await ctx.params;

    const job = await hideResults(id);

    await recordAuditLog({
      actorId: session.user.id,
      actorRole: "ADMIN",
      action: "RESULTS_HIDDEN",
      targetType: "job",
      targetId: id,
    });

    return NextResponse.json({ jobId: job._id, publishedMatchRunId: job.publishedMatchRunId });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    if (error instanceof ForbiddenError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    if (error instanceof JobNotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    throw error;
  }
}
