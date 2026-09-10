import { NextResponse } from "next/server";
import { requireRole, UnauthorizedError, ForbiddenError } from "@/lib/auth/guard";
import {
  setLeaderboardSize,
  JobNotFoundError,
  InvalidLeaderboardSizeError,
} from "@/lib/services/jobService";

/** docs/screens.md §4.10 (feature 27c): admin-configurable "Show top [N]" leaderboard size. */
export async function POST(request: Request, ctx: RouteContext<"/api/admin/jobs/[id]/leaderboard-size">) {
  try {
    await requireRole("ADMIN");
    const { id } = await ctx.params;
    const body = await request.json().catch(() => ({}));

    const job = await setLeaderboardSize(id, body.leaderboardSize);

    return NextResponse.json({ jobId: job._id, leaderboardSize: job.leaderboardSize });
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
    if (error instanceof InvalidLeaderboardSizeError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    throw error;
  }
}
