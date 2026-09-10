import { NextResponse } from "next/server";
import { z } from "zod";
import { requestPasswordReset } from "@/lib/services/passwordResetService";
import { checkForgotPasswordLimit, RateLimitExceededError } from "@/lib/services/rateLimitService";
import { getClientIp } from "@/lib/http/getClientIp";

const bodySchema = z.object({ email: z.email() });

/**
 * docs/screens.md §4.3 (feature 27g). Always returns the same generic
 * message regardless of whether `email` belongs to an account, so this
 * endpoint can't be used to enumerate registered emails.
 */
const GENERIC_MESSAGE = "If that email address is registered, a password reset link has been sent.";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "A valid email is required" }, { status: 400 });
    }

    await checkForgotPasswordLimit(parsed.data.email, getClientIp(request));
    await requestPasswordReset(parsed.data.email);

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
