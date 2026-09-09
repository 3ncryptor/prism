import { NextResponse } from "next/server";
import { requireRole, UnauthorizedError, ForbiddenError } from "@/lib/auth/guard";
import { listSkillsWithUsage, createSkill, DuplicateCanonicalNameError } from "@/lib/services/skillTaxonomyService";
import { skillCategorySchema } from "@/lib/schemas/studentProfile";

/** buildPlan.md §116. */
export async function GET() {
  try {
    await requireRole("ADMIN");
    const skills = await listSkillsWithUsage();
    return NextResponse.json({ skills });
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

    const canonicalName = typeof body.canonicalName === "string" ? body.canonicalName.trim().toLowerCase() : "";
    const displayName = typeof body.displayName === "string" ? body.displayName.trim() : "";
    const categoryResult = skillCategorySchema.safeParse(body.category);
    const aliases = Array.isArray(body.aliases) ? body.aliases.filter((a: unknown) => typeof a === "string") : [];

    if (!canonicalName || !displayName || !categoryResult.success) {
      return NextResponse.json(
        { error: "canonicalName, displayName, and a valid category are required" },
        { status: 400 },
      );
    }

    const skill = await createSkill({
      canonicalName,
      displayName,
      category: categoryResult.data,
      aliases,
      createdBy: session.user.id,
    });
    return NextResponse.json({ skill }, { status: 201 });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    if (error instanceof ForbiddenError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    if (error instanceof DuplicateCanonicalNameError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    throw error;
  }
}
