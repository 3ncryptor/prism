import { NextResponse } from "next/server";
import { requireRole, UnauthorizedError, ForbiddenError } from "@/lib/auth/guard";
import {
  uploadJob,
  listJobs,
  InvalidFileTypeError,
  FileTooLargeError,
} from "@/lib/services/jobService";

export async function POST(request: Request) {
  try {
    const session = await requireRole("ADMIN");

    const formData = await request.formData();
    const file = formData.get("file");
    const title = formData.get("title");
    const company = formData.get("company");
    if (!(file instanceof File) || typeof title !== "string" || !title.trim()) {
      return NextResponse.json({ error: "Missing file or title" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const result = await uploadJob(session.user.id, {
      buffer,
      originalName: file.name,
      mimeType: file.type,
      size: file.size,
      title,
      company: typeof company === "string" && company.trim() ? company : undefined,
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
  throw error;
}
