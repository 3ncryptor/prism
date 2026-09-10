import Link from "next/link";
import { ResetPasswordForm } from "@/app/(auth)/reset-password/ResetPasswordForm";
import { BRAND_COLOR } from "@/lib/grauityTheme";

/** docs/screens.md §4.4 (feature 27g): centered card inside AuthLayout's shell. */
export default async function ResetPasswordPage(props: PageProps<"/reset-password">) {
  const { token } = await props.searchParams;
  const rawToken = typeof token === "string" ? token : null;

  if (!rawToken) {
    return (
      <div className="flex w-full max-w-sm flex-col gap-6 rounded-lg border border-gray-200 bg-white p-8 shadow-sm">
        <h1 className="text-xl font-semibold text-gray-900">Reset password</h1>
        <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          This password reset link is invalid or has expired.
        </p>
        <Link href="/forgot-password" className="text-sm font-medium" style={{ color: BRAND_COLOR }}>
          Request a new link
        </Link>
      </div>
    );
  }

  return <ResetPasswordForm token={rawToken} />;
}
