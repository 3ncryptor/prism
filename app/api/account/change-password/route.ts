import { NextResponse } from "next/server";
import { requireRole, UnauthorizedError, ForbiddenError } from "@/lib/auth/guard";
import {
  changePassword,
  UserNotFoundError,
  IncorrectPasswordError,
  PasswordTooShortError,
} from "@/lib/services/profileService";

/** docs/screens.md §4.8 (feature 27f): "Account settings" → Change password. */
export async function POST(request: Request) {
  try {
    const session = await requireRole("STUDENT");
    const body = await request.json().catch(() => ({}));

    if (typeof body.currentPassword !== "string" || typeof body.newPassword !== "string") {
      return NextResponse.json({ error: "currentPassword and newPassword are required" }, { status: 400 });
    }

    await changePassword(session.user.id, body.currentPassword, body.newPassword);

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    if (error instanceof ForbiddenError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    if (error instanceof UserNotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    if (error instanceof IncorrectPasswordError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    if (error instanceof PasswordTooShortError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    throw error;
  }
}
