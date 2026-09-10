import { NextResponse } from "next/server";
import { requireRole, UnauthorizedError, ForbiddenError } from "@/lib/auth/guard";
import {
  setResumePublishStatus,
  ResumeNotFoundError,
  ResumeAccessDeniedError,
  ResumeNotReadyError,
  ConflictingRolePublishedError,
} from "@/lib/services/resumeService";

/** docs/screens.md §4.6 (feature 27d): the student-controlled "Publish for matching" toggle. */
export async function POST(request: Request, ctx: RouteContext<"/api/resumes/[id]/publish">) {
  try {
    const session = await requireRole("STUDENT");
    const { id } = await ctx.params;
    const body = await request.json().catch(() => ({}));
    if (typeof body.isPublished !== "boolean") {
      return NextResponse.json({ error: "isPublished must be a boolean" }, { status: 400 });
    }

    const resume = await setResumePublishStatus(id, session.user.id, body.isPublished);

    return NextResponse.json({ resume });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    if (error instanceof ForbiddenError || error instanceof ResumeAccessDeniedError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    if (error instanceof ResumeNotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    if (error instanceof ResumeNotReadyError || error instanceof ConflictingRolePublishedError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    throw error;
  }
}
