import { NextResponse } from "next/server";
import { requireRole, UnauthorizedError, ForbiddenError } from "@/lib/auth/guard";
import { activateScoringConfigVersion, ScoringConfigNotFoundError } from "@/lib/services/scoringConfigService";

/** buildPlan.md §113.3 — feature #22c. */
export async function POST(_request: Request, ctx: RouteContext<"/api/admin/scoring-configs/[id]/activate">) {
  try {
    await requireRole("ADMIN");
    const { id } = await ctx.params;
    await activateScoringConfigVersion(id);
    return NextResponse.json({ id, isActive: true });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    if (error instanceof ForbiddenError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    if (error instanceof ScoringConfigNotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    throw error;
  }
}
