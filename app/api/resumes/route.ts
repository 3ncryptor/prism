import { NextResponse } from "next/server";
import { requireRole, UnauthorizedError, ForbiddenError } from "@/lib/auth/guard";
import {
  uploadResume,
  listResumes,
  InvalidFileTypeError,
  FileTooLargeError,
} from "@/lib/services/resumeService";
import { checkResumeUploadLimit, RateLimitExceededError } from "@/lib/services/rateLimitService";
import { jobRoleTaxonomyRepository } from "@/lib/db/repositories/jobRoleTaxonomyRepository";

export async function POST(request: Request) {
  try {
    const session = await requireRole("STUDENT");
    await checkResumeUploadLimit(session.user.id);

    const formData = await request.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Missing file" }, { status: 400 });
    }
    const label = formData.get("label");
    if (typeof label !== "string" || label.trim().length === 0) {
      return NextResponse.json({ error: "A label is required (e.g. \"Data Science Resume\")" }, { status: 400 });
    }

    // docs/screens.md §3 decision #1 (feature 27e): a select-only tag —
    // empty/missing means the explicit "general resume" choice, but a
    // non-empty value must be a real, currently-active canonical role.
    const rawJobRole = formData.get("jobRole");
    let jobRole: string | null = null;
    if (typeof rawJobRole === "string" && rawJobRole.trim().length > 0) {
      const activeRoles = await jobRoleTaxonomyRepository.listActive();
      const match = activeRoles.find((role) => role.canonicalName === rawJobRole.trim());
      if (!match) {
        return NextResponse.json({ error: "jobRole must be an existing, active job role" }, { status: 400 });
      }
      jobRole = match.canonicalName;
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const result = await uploadResume(session.user.id, {
      buffer,
      label: label.trim(),
      jobRole,
      originalName: file.name,
      mimeType: file.type,
      size: file.size,
    });

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    return handleError(error);
  }
}

export async function GET() {
  try {
    const session = await requireRole("STUDENT");
    const resumes = await listResumes(session.user.id);
    return NextResponse.json({ resumes });
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
  if (error instanceof InvalidFileTypeError || error instanceof FileTooLargeError) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  if (error instanceof RateLimitExceededError) {
    return NextResponse.json(
      { error: error.message },
      { status: 429, headers: { "Retry-After": String(error.retryAfterSeconds) } },
    );
  }
  throw error;
}
