import { NextResponse } from "next/server";
import { requireRole, UnauthorizedError, ForbiddenError } from "@/lib/auth/guard";
import { userRepository } from "@/lib/db/repositories/userRepository";
import { updateProfile, UserNotFoundError } from "@/lib/services/profileService";
import type { User } from "@/lib/schemas/user";

/**
 * docs/screens.md §4.8 (feature 27f): the User-account profile — distinct
 * from /api/profile, which serves the extracted resume StudentProfile for
 * the Dashboard. Never returns passwordHash.
 */
function toSafeUser(user: User): Omit<User, "passwordHash"> {
  return {
    _id: user._id,
    email: user.email,
    name: user.name,
    role: user.role,
    phone: user.phone,
    linkedinUrl: user.linkedinUrl,
    githubUrl: user.githubUrl,
    portfolioUrl: user.portfolioUrl,
    rollNumber: user.rollNumber,
    branch: user.branch,
    batchYear: user.batchYear,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

export async function GET() {
  try {
    const session = await requireRole("STUDENT");
    const user = await userRepository.findById(session.user.id);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    return NextResponse.json({ user: toSafeUser(user) });
  } catch (error) {
    return handleError(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await requireRole("STUDENT");
    const body = await request.json().catch(() => ({}));

    const patch: Record<string, unknown> = {};
    if (typeof body.name === "string" && body.name.trim()) patch.name = body.name.trim();
    for (const field of ["phone", "linkedinUrl", "githubUrl", "portfolioUrl", "rollNumber", "branch"] as const) {
      if (typeof body[field] === "string") patch[field] = body[field].trim() || undefined;
    }
    if (body.batchYear !== undefined) {
      const year = Number(body.batchYear);
      patch.batchYear = Number.isFinite(year) ? year : undefined;
    }

    const updated = await updateProfile(session.user.id, patch);
    return NextResponse.json({ user: toSafeUser(updated) });
  } catch (error) {
    return handleError(error);
  }
}

function handleError(error: unknown) {
  if (error instanceof UnauthorizedError) {
    return NextResponse.json({ error: error.message }, { status: 401 });
  }
  if (error instanceof ForbiddenError) {
    return NextResponse.json({ error: error.message }, { status: 403 });
  }
  if (error instanceof UserNotFoundError) {
    return NextResponse.json({ error: error.message }, { status: 404 });
  }
  throw error;
}
