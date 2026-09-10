import { NextResponse } from "next/server";
import { requireRole, UnauthorizedError, ForbiddenError } from "@/lib/auth/guard";
import {
  uploadResume,
  listResumes,
  InvalidFileTypeError,
  FileTooLargeError,
} from "@/lib/services/resumeService";
import { checkRateLimit, RateLimitExceededError, RATE_LIMITS } from "@/lib/services/rateLimitService";

export async function POST(request: Request) {
  try {
    const session = await requireRole("STUDENT");
    await checkRateLimit(RATE_LIMITS.resumeUpload(session.user.id));

    const formData = await request.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Missing file" }, { status: 400 });
    }
    const label = formData.get("label");
    if (typeof label !== "string" || label.trim().length === 0) {
      return NextResponse.json({ error: "A label is required (e.g. \"Data Science Resume\")" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const result = await uploadResume(session.user.id, {
      buffer,
      label: label.trim(),
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
