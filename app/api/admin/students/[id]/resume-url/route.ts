import { NextResponse } from "next/server";
import { requireRole, UnauthorizedError, ForbiddenError } from "@/lib/auth/guard";
import { resumeRepository } from "@/lib/db/repositories/resumeRepository";
import { getPresignedDownloadUrl } from "@/lib/storage/s3Client";
import { recordAuditLog } from "@/lib/services/auditLogService";

/**
 * docs/screens.md §4.10 (feature 27c): "View resume file" on a leaderboard
 * row — wires up the previously-built-but-unused getPresignedDownloadUrl().
 * Student-scoped (not job-scoped): pre-multi-resume (27d), a student has at
 * most one active resume, so this is the one used for every job they were
 * matched against. Never returns a public/permanent URL (buildPlan.md §80).
 */
export async function GET(_request: Request, ctx: RouteContext<"/api/admin/students/[id]/resume-url">) {
  try {
    const session = await requireRole("ADMIN");
    const { id: studentId } = await ctx.params;

    const resume = await resumeRepository.getActiveByStudent(studentId);
    if (!resume) {
      return NextResponse.json({ error: "No resume found for this student" }, { status: 404 });
    }

    const url = await getPresignedDownloadUrl(resume.fileKey);

    await recordAuditLog({
      actorId: session.user.id,
      actorRole: "ADMIN",
      action: "RESUME_VIEWED",
      targetType: "resume",
      targetId: resume._id,
      metadata: { studentId },
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
