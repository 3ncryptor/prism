import { NextResponse } from "next/server";
import { requireRole, UnauthorizedError, ForbiddenError } from "@/lib/auth/guard";
import { updateRole, deactivateRole, RoleNotFoundError } from "@/lib/services/jobRoleTaxonomyService";
import { recordAuditLog } from "@/lib/services/auditLogService";

/** docs/screens.md §4.11 (feature 27e): edit displayName, or deactivate via `{ isActive: false }`. */
export async function PATCH(request: Request, ctx: RouteContext<"/api/admin/job-roles/[id]">) {
  try {
    const session = await requireRole("ADMIN");
    const { id } = await ctx.params;
    const body = await request.json().catch(() => ({}));

    if (body.isActive === false) {
      await deactivateRole(id);
      await recordAuditLog({
        actorId: session.user.id,
        actorRole: "ADMIN",
        action: "JOB_ROLE_DEACTIVATED",
        targetType: "jobRole",
        targetId: id,
      });
      return NextResponse.json({ id, isActive: false });
    }

    const patch: { displayName?: string } = {};
    if (typeof body.displayName === "string" && body.displayName.trim()) {
      patch.displayName = body.displayName.trim();
    }

    const role = await updateRole(id, patch);

    await recordAuditLog({
      actorId: session.user.id,
      actorRole: "ADMIN",
      action: "JOB_ROLE_UPDATED",
      targetType: "jobRole",
      targetId: id,
    });

    return NextResponse.json({ role });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    if (error instanceof ForbiddenError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    if (error instanceof RoleNotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    throw error;
  }
}
