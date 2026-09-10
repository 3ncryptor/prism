import { NextResponse } from "next/server";
import { z } from "zod";
import {
  resetPassword,
  PasswordTooShortError,
  InvalidOrExpiredTokenError,
} from "@/lib/services/passwordResetService";

const bodySchema = z.object({
  token: z.string().min(1),
  newPassword: z.string().min(1),
});

/** docs/screens.md §4.4 (feature 27g). */
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "token and newPassword are required" }, { status: 400 });
    }

    await resetPassword(parsed.data.token, parsed.data.newPassword);

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof PasswordTooShortError || error instanceof InvalidOrExpiredTokenError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    throw error;
  }
}
