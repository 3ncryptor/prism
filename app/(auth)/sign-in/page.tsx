import Link from "next/link";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { AuthError, CredentialsSignin } from "next-auth";
import { signIn } from "@/lib/auth/config";
import { resendVerification } from "@/lib/services/signupService";
import { checkResendVerificationLimit, RateLimitExceededError } from "@/lib/services/rateLimitService";
import { getClientIp } from "@/lib/http/getClientIp";
import { BRAND_COLOR } from "@/lib/designTokens";
import { Input } from "@/lib/ui/Input";
import { Button } from "@/lib/ui/Button";

async function authenticate(formData: FormData) {
  "use server";

  try {
    await signIn("credentials", {
      email: formData.get("email"),
      password: formData.get("password"),
      redirectTo: "/",
    });
  } catch (error) {
    if (error instanceof CredentialsSignin && error.code === "email-not-verified") {
      redirect("/sign-in?error=2");
    }
    if (error instanceof AuthError) {
      redirect("/sign-in?error=1");
    }
    throw error;
  }
}

/** docs/screens.md §7.4/§7.7 (feature 28). */
async function resendVerificationAction(formData: FormData) {
  "use server";

  const email = formData.get("email");
  if (typeof email === "string" && email) {
    try {
      const ip = getClientIp({ headers: await headers() });
      await checkResendVerificationLimit(email, ip);
      await resendVerification(email);
    } catch (error) {
      if (!(error instanceof RateLimitExceededError)) throw error;
    }
  }
  redirect("/sign-in?resent=1");
}

/** docs/screens.md §4.2 (feature 27b, extended by feature 28 §7.4): centered card inside AuthLayout's shell. */
export default async function SignInPage(props: PageProps<"/sign-in">) {
  const { error, resent } = await props.searchParams;

  return (
    <div className="flex w-full max-w-sm flex-col gap-6 rounded-lg border border-gray-200 bg-white p-8 shadow-sm">
      <h1 className="text-xl font-semibold text-gray-900">Sign in</h1>

      {error === "2" ? (
        <div id="signin-error" role="alert" className="flex flex-col gap-2 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          <p>Your email isn&apos;t verified yet.</p>
          <form action={resendVerificationAction} className="flex flex-col gap-2">
            <Input name="email" type="email" placeholder="Your email" required className="border-red-200 bg-white" />
            <Button type="submit" variant="link" className="self-start">
              Resend verification email
            </Button>
          </form>
        </div>
      ) : error ? (
        <p id="signin-error" role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          Invalid email or password.
        </p>
      ) : null}

      {resent && (
        <p role="status" className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-700">
          If that account needs verifying, we&apos;ve sent a new link.
        </p>
      )}

      <form action={authenticate} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1 text-sm text-gray-700">
          Email
          <Input
            name="email"
            type="email"
            autoComplete="email"
            required
            aria-invalid={Boolean(error)}
            aria-describedby={error ? "signin-error" : undefined}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm text-gray-700">
          Password
          <Input
            name="password"
            type="password"
            autoComplete="current-password"
            required
            aria-invalid={Boolean(error)}
            aria-describedby={error ? "signin-error" : undefined}
          />
        </label>
        <Button type="submit" className="mt-2">
          Sign in
        </Button>
      </form>

      <div className="flex flex-col gap-2">
        <Link href="/forgot-password" className="text-sm font-medium" style={{ color: BRAND_COLOR }}>
          Forgot password?
        </Link>
        <p className="text-sm text-gray-600">
          Don&apos;t have an account?{" "}
          <Link href="/sign-up" className="font-medium" style={{ color: BRAND_COLOR }}>
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}
