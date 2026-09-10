import { NextResponse } from "next/server";
import { z } from "zod";
import {
  registerUser,
  EmailDomainNotAllowedError,
  EmailAlreadyRegisteredError,
  PasswordTooShortError,
} from "@/lib/services/signupService";
import { checkSignupLimit, RateLimitExceededError } from "@/lib/services/rateLimitService";
import { getClientIp } from "@/lib/http/getClientIp";

const bodySchema = z.object({
  name: z.string().min(1),
  email: z.email(),
  password: z.string().min(1),
});

const GENERIC_MESSAGE = "Check your email to verify your account.";

/** docs/screens.md §7.1/§7.6 (feature 28). */
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Name, a valid email, and a password are required" }, { status: 400 });
    }

    await checkSignupLimit(getClientIp(request));
    await registerUser(parsed.data.name, parsed.data.email, parsed.data.password);

    return NextResponse.json({ message: GENERIC_MESSAGE });
  } catch (error) {
    if (
      error instanceof EmailDomainNotAllowedError ||
      error instanceof EmailAlreadyRegisteredError ||
      error instanceof PasswordTooShortError
    ) {
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
}
