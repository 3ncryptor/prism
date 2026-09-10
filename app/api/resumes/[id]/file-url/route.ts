import { NextResponse } from "next/server";
import { requireRole, UnauthorizedError, ForbiddenError } from "@/lib/auth/guard";
import { resumeRepository } from "@/lib/db/repositories/resumeRepository";
import { getPresignedDownloadUrl } from "@/lib/storage/s3Client";

/**
 * docs/screens.md §4.6 (feature 27d): "View file" — a student's own
 * student-facing counterpart to the admin resume-url route. Never returns
 * a public/permanent URL (buildPlan.md §80).
 */
export async function GET(_request: Request, ctx: RouteContext<"/api/resumes/[id]/file-url">) {
  try {
    const session = await requireRole("STUDENT");
    const { id } = await ctx.params;

    const resume = await resumeRepository.get(id);
    if (!resume || resume.studentId !== session.user.id) {
      return NextResponse.json({ error: "Resume not found" }, { status: 404 });
    }

    const url = await getPresignedDownloadUrl(resume.fileKey);
    return NextResponse.json({ url });
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
