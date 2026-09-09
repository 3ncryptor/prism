import { NextResponse } from "next/server";
import { requireRole, UnauthorizedError, ForbiddenError } from "@/lib/auth/guard";
import { studentProfileRepository } from "@/lib/db/repositories/studentProfileRepository";
import { getActiveResume } from "@/lib/services/resumeService";

export async function GET() {
  try {
    const session = await requireRole("STUDENT");

    const [profile, resume] = await Promise.all([
      studentProfileRepository.getActiveByStudent(session.user.id),
      getActiveResume(session.user.id),
    ]);

    return NextResponse.json({ profile, resume });
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
