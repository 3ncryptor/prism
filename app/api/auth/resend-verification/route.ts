import { NextResponse } from "next/server";
import { z } from "zod";
import { resendVerification } from "@/lib/services/signupService";
import { checkResendVerificationLimit, RateLimitExceededError } from "@/lib/services/rateLimitService";
import { getClientIp } from "@/lib/http/getClientIp";

const bodySchema = z.object({ email: z.email() });

/**
 * docs/screens.md §7.3/§7.6 (feature 28). Always returns the same generic
 * message regardless of whether `email` belongs to an account or is
 * already verified — same non-enumerating shape as forgot-password.
 */
const GENERIC_MESSAGE = "If that account needs verifying, we've sent a new link.";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "A valid email is required" }, { status: 400 });
    }

    await checkResendVerificationLimit(parsed.data.email, getClientIp(request));
    await resendVerification(parsed.data.email);

    return NextResponse.json({ message: GENERIC_MESSAGE });
  } catch (error) {
    if (error instanceof RateLimitExceededError) {
      return NextResponse.json(
        { error: error.message },
        { status: 429, headers: { "Retry-After": String(error.retryAfterSeconds) } },
      );
    }
    throw error;
  }
}
