import { NextResponse } from "next/server";
import { requireRole, UnauthorizedError, ForbiddenError } from "@/lib/auth/guard";
import { resumeRepository } from "@/lib/db/repositories/resumeRepository";
import { getPresignedDownloadUrl } from "@/lib/storage/s3Client";
import { recordAuditLog } from "@/lib/services/auditLogService";

/**
 * docs/screens.md §4.10 (feature 27c, revised 27e): "View resume file" on a
 * leaderboard row. Resume-scoped (not student-scoped): once a student can
 * have more than one published resume at once (one per role, feature 27e),
 * "the student's active resume" is no longer well-defined — MatchResult
 * now records exactly which resumeId selectResumeForJob picked for this
 * job, so this opens the file that actually produced the score. Replaces
 * the studentId-scoped /api/admin/students/[id]/resume-url. Never returns
 * a public/permanent URL (buildPlan.md §80).
 */
export async function GET(_request: Request, ctx: RouteContext<"/api/admin/resumes/[id]/file-url">) {
  try {
    const session = await requireRole("ADMIN");
    const { id: resumeId } = await ctx.params;

    const resume = await resumeRepository.get(resumeId);
    if (!resume) {
      return NextResponse.json({ error: "Resume not found" }, { status: 404 });
    }

    const url = await getPresignedDownloadUrl(resume.fileKey);

    await recordAuditLog({
      actorId: session.user.id,
      actorRole: "ADMIN",
      action: "RESUME_VIEWED",
      targetType: "resume",
      targetId: resume._id,
      metadata: { studentId: resume.studentId },
    });

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
