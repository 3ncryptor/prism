import { NextResponse } from "next/server";
import { z } from "zod";
import { verifyEmail, InvalidOrExpiredTokenError } from "@/lib/services/signupService";

const bodySchema = z.object({ token: z.string().min(1) });

/** docs/screens.md §7.2/§7.6 (feature 28). */
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "token is required" }, { status: 400 });
    }

    await verifyEmail(parsed.data.token);

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof InvalidOrExpiredTokenError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    throw error;
  }
}
