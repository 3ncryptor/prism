import { NextResponse } from "next/server";
import { requireRole, UnauthorizedError, ForbiddenError } from "@/lib/auth/guard";
import {
  uploadJob,
  listJobs,
  InvalidFileTypeError,
  FileTooLargeError,
  MAX_JD_SIZE_BYTES,
} from "@/lib/services/jobService";
import { checkJdUploadLimit, RateLimitExceededError } from "@/lib/services/rateLimitService";
import { recordAuditLog } from "@/lib/services/auditLogService";
import { jobRoleTaxonomyRepository } from "@/lib/db/repositories/jobRoleTaxonomyRepository";
import { rejectIfOversized } from "@/lib/http/rejectIfOversized";

export async function POST(request: Request) {
  try {
    const session = await requireRole("ADMIN");
    await checkJdUploadLimit(session.user.id);

    const oversized = rejectIfOversized(request, MAX_JD_SIZE_BYTES);
    if (oversized) return oversized;

    const formData = await request.formData();
    const file = formData.get("file");
    const title = formData.get("title");
    const company = formData.get("company");
    const jobRole = formData.get("jobRole");
    if (!(file instanceof File) || typeof title !== "string" || !title.trim()) {
      return NextResponse.json({ error: "Missing file or title" }, { status: 400 });
    }
    if (typeof jobRole !== "string" || jobRole.trim().length === 0) {
      return NextResponse.json({ error: "A job role is required" }, { status: 400 });
    }
    // docs/screens.md §3 decision #1 (feature 27e): select-only — never a free-text-creatable tag.
    const activeRoles = await jobRoleTaxonomyRepository.listActive();
    const matchedRole = activeRoles.find((role) => role.canonicalName === jobRole.trim());
    if (!matchedRole) {
      return NextResponse.json({ error: "jobRole must be an existing, active job role" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const result = await uploadJob(session.user.id, {
      buffer,
      originalName: file.name,
      mimeType: file.type,
      size: file.size,
      title,
      company: typeof company === "string" && company.trim() ? company : undefined,
      jobRole: matchedRole.canonicalName,
    });

    await recordAuditLog({
      actorId: session.user.id,
      actorRole: "ADMIN",
      action: "JD_UPLOAD",
      targetType: "job",
      targetId: result.jobId,
    });

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    return handleError(error);
  }
}

export async function GET() {
  try {
    await requireRole("ADMIN");
    const jobs = await listJobs();
    return NextResponse.json({ jobs });
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
