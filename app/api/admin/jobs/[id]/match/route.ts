import { NextResponse } from "next/server";
import { requireRole, UnauthorizedError, ForbiddenError } from "@/lib/auth/guard";
import {
  startMatchRun,
  JobNotFoundError,
  JobNotReadyError,
  JobNotLiveError,
  NoActiveScoringConfigError,
  MatchRunAlreadyInProgressError,
} from "@/lib/services/matchingService";
import { checkMatchRunBurstLimit, RateLimitExceededError } from "@/lib/services/rateLimitService";
import { recordAuditLog } from "@/lib/services/auditLogService";

/** buildPlan.md §51/§113.3 / BACKEND_ARCHITECTURE.md §8. */
export async function POST(_request: Request, ctx: RouteContext<"/api/admin/jobs/[id]/match">) {
  try {
    const session = await requireRole("ADMIN");
    await checkMatchRunBurstLimit(session.user.id);
    const { id } = await ctx.params;

    const result = await startMatchRun(id);

    await recordAuditLog({
      actorId: session.user.id,
      actorRole: "ADMIN",
      action: "MATCH_RUN_TRIGGERED",
      targetType: "job",
      targetId: id,
      metadata: { matchRunId: result.matchRunId },
    });

    return NextResponse.json({ ...result, status: "QUEUED" }, { status: 202 });
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
    if (
      error instanceof JobNotReadyError ||
      error instanceof JobNotLiveError ||
      error instanceof NoActiveScoringConfigError ||
      error instanceof MatchRunAlreadyInProgressError
    ) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    if (error instanceof RateLimitExceededError) {
      return NextResponse.json(
        { error: error.message },
        { status: 429, headers: { "Retry-After": String(error.retryAfterSeconds) } },
      );
    }
    throw error;
  }
}
