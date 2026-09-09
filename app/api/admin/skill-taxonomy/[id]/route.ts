import { NextResponse } from "next/server";
import { requireRole, UnauthorizedError, ForbiddenError } from "@/lib/auth/guard";
import { updateSkill, deactivateSkill, SkillNotFoundError } from "@/lib/services/skillTaxonomyService";
import { skillCategorySchema } from "@/lib/schemas/studentProfile";
import { recordAuditLog } from "@/lib/services/auditLogService";

/** buildPlan.md §116: edit fields, or deactivate via `{ isActive: false }`. */
export async function PATCH(request: Request, ctx: RouteContext<"/api/admin/skill-taxonomy/[id]">) {
  try {
    const session = await requireRole("ADMIN");
    const { id } = await ctx.params;
    const body = await request.json().catch(() => ({}));

    if (body.isActive === false) {
      await deactivateSkill(id);
      await recordAuditLog({
        actorId: session.user.id,
        actorRole: "ADMIN",
        action: "SKILL_DEACTIVATED",
        targetType: "skill",
        targetId: id,
      });
      return NextResponse.json({ id, isActive: false });
    }

    const patch: { displayName?: string; category?: ReturnType<typeof skillCategorySchema.parse>; aliases?: string[] } = {};
    if (typeof body.displayName === "string" && body.displayName.trim()) {
      patch.displayName = body.displayName.trim();
    }
    if (body.category !== undefined) {
      const categoryResult = skillCategorySchema.safeParse(body.category);
      if (!categoryResult.success) {
        return NextResponse.json({ error: "Invalid category" }, { status: 400 });
      }
      patch.category = categoryResult.data;
    }
    if (Array.isArray(body.aliases)) {
      patch.aliases = body.aliases.filter((a: unknown): a is string => typeof a === "string");
    }

    const skill = await updateSkill(id, patch);

    await recordAuditLog({
      actorId: session.user.id,
      actorRole: "ADMIN",
      action: "SKILL_UPDATED",
      targetType: "skill",
      targetId: id,
    });

    return NextResponse.json({ skill });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    if (error instanceof ForbiddenError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    if (error instanceof SkillNotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    throw error;
  }
}
