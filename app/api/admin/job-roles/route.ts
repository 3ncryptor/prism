import { NextResponse } from "next/server";
import { requireRole, UnauthorizedError, ForbiddenError } from "@/lib/auth/guard";
import { listRolesWithUsage, createRole, DuplicateRoleNameError } from "@/lib/services/jobRoleTaxonomyService";
import { recordAuditLog } from "@/lib/services/auditLogService";

/** docs/screens.md §4.11 (feature 27e). Mirrors /api/admin/skill-taxonomy. */
export async function GET() {
  try {
    await requireRole("ADMIN");
    const roles = await listRolesWithUsage();
    return NextResponse.json({ roles });
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

export async function POST(request: Request) {
  try {
    const session = await requireRole("ADMIN");
    const body = await request.json().catch(() => ({}));

    // Standardization the user explicitly asked for: trim+lowercase so
    // "Data Science" and "DATA SCIENCE" can never coexist as two tags.
    const canonicalName = typeof body.canonicalName === "string" ? body.canonicalName.trim().toLowerCase() : "";
    const displayName = typeof body.displayName === "string" ? body.displayName.trim() : "";

    if (!canonicalName || !displayName) {
      return NextResponse.json({ error: "canonicalName and displayName are required" }, { status: 400 });
    }

    const role = await createRole({ canonicalName, displayName, createdBy: session.user.id });

    await recordAuditLog({
      actorId: session.user.id,
      actorRole: "ADMIN",
      action: "JOB_ROLE_CREATED",
      targetType: "jobRole",
      targetId: role._id,
      metadata: { canonicalName },
    });

    return NextResponse.json({ role }, { status: 201 });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    if (error instanceof ForbiddenError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    if (error instanceof DuplicateRoleNameError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    throw error;
  }
}
