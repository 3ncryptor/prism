import { NextResponse } from "next/server";
import { requireRole, UnauthorizedError, ForbiddenError } from "@/lib/auth/guard";
import { resumeRepository } from "@/lib/db/repositories/resumeRepository";
import { studentProfileRepository } from "@/lib/db/repositories/studentProfileRepository";

/** docs/screens.md §4.6 (feature 27d): "View parsed profile" for a specific resume. */
export async function GET(_request: Request, ctx: RouteContext<"/api/resumes/[id]/profile">) {
  try {
    const session = await requireRole("STUDENT");
    const { id } = await ctx.params;

    const resume = await resumeRepository.get(id);
    if (!resume || resume.studentId !== session.user.id) {
      return NextResponse.json({ error: "Resume not found" }, { status: 404 });
    }

    const profile = await studentProfileRepository.getByResumeId(id);
    return NextResponse.json({ profile });
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
