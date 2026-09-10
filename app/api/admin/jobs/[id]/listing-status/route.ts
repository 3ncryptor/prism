import { NextResponse } from "next/server";
import { requireRole, UnauthorizedError, ForbiddenError } from "@/lib/auth/guard";
import { setListingStatus, JobNotFoundError } from "@/lib/services/jobService";
import { jobListingStatusSchema } from "@/lib/schemas/job";
import { recordAuditLog } from "@/lib/services/auditLogService";

/** docs/screens.md §4.10 (feature 27c): admin Draft <-> Live toggle. */
export async function POST(request: Request, ctx: RouteContext<"/api/admin/jobs/[id]/listing-status">) {
  try {
    const session = await requireRole("ADMIN");
    const { id } = await ctx.params;
    const body = await request.json().catch(() => ({}));
    const parsed = jobListingStatusSchema.safeParse(body.listingStatus);
    if (!parsed.success) {
      return NextResponse.json({ error: "listingStatus must be DRAFT or LIVE" }, { status: 400 });
    }

    const job = await setListingStatus(id, parsed.data);

    await recordAuditLog({
      actorId: session.user.id,
      actorRole: "ADMIN",
      action: "JOB_LISTING_STATUS_CHANGED",
      targetType: "job",
      targetId: id,
      metadata: { listingStatus: parsed.data },
    });

    return NextResponse.json({ jobId: job._id, listingStatus: job.listingStatus });
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
