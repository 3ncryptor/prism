import { NextResponse } from "next/server";

/** Slack above the real file-size limit for multipart boundaries/other form fields (label, title, jobRole). */
const MULTIPART_OVERHEAD_BYTES = 1024 * 1024;

/**
 * App Router Route Handlers have no built-in request body size limit —
 * unlike Server Actions (`serverActions.bodySizeLimit`) or the legacy
 * Pages API (`bodyParser.sizeLimit`), there is no config for this. Without
 * a check, `request.formData()` buffers the *entire* body into memory
 * before any application-level size validation (e.g. FileTooLargeError)
 * ever runs, so a large or repeated-large upload can spike or exhaust
 * process memory before it's ever rejected.
 *
 * This is a fast, header-only pre-check — it runs before the expensive
 * part of the request (formData parsing) is ever read. It only catches a
 * request that honestly declares its size via Content-Length; a client
 * using chunked transfer encoding to omit it isn't caught here — that's a
 * reverse proxy's job in a real deployment (e.g. nginx client_max_body_size),
 * out of scope for this codebase-level guard.
 */
export function rejectIfOversized(request: Request, maxBodyBytes: number): NextResponse | null {
  const contentLength = request.headers.get("content-length");
  if (!contentLength) return null;

  const declaredBytes = Number(contentLength);
  if (Number.isFinite(declaredBytes) && declaredBytes > maxBodyBytes + MULTIPART_OVERHEAD_BYTES) {
    return NextResponse.json({ error: "Request body too large" }, { status: 413 });
  }
  return null;
}
