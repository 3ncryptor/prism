import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthError } from "next-auth";
import { signIn } from "@/lib/auth/config";
import { BRAND_COLOR } from "@/lib/grauityTheme";

async function authenticate(formData: FormData) {
  "use server";

  try {
    await signIn("credentials", {
      email: formData.get("email"),
      password: formData.get("password"),
      redirectTo: "/",
    });
  } catch (error) {
    if (error instanceof AuthError) {
      redirect("/sign-in?error=1");
    }
    throw error;
  }
}

/** docs/screens.md §4.2 (feature 27b): centered card inside AuthLayout's shell. */
export default async function SignInPage(props: PageProps<"/sign-in">) {
  const { error } = await props.searchParams;

  return (
    <div className="flex w-full max-w-sm flex-col gap-6 rounded-lg border border-gray-200 bg-white p-8 shadow-sm">
      <h1 className="text-xl font-semibold text-gray-900">Sign in</h1>

      {error && (
        <p id="signin-error" role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          Invalid email or password.
        </p>
      )}

      <form action={authenticate} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1 text-sm text-gray-700">
          Email
          <input
            name="email"
            type="email"
            autoComplete="email"
            required
            aria-invalid={Boolean(error)}
            aria-describedby={error ? "signin-error" : undefined}
            className="rounded-md border border-gray-300 px-3 py-2 text-gray-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
            style={{ outlineColor: BRAND_COLOR }}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm text-gray-700">
          Password
          <input
            name="password"
            type="password"
            autoComplete="current-password"
            required
            aria-invalid={Boolean(error)}
            aria-describedby={error ? "signin-error" : undefined}
            className="rounded-md border border-gray-300 px-3 py-2 text-gray-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
            style={{ outlineColor: BRAND_COLOR }}
          />
        </label>
        <button
          type="submit"
          style={{ backgroundColor: BRAND_COLOR }}
          className="mt-2 rounded-md px-4 py-2 font-medium text-white transition-opacity hover:opacity-90"
        >
          Sign in
        </button>
      </form>

      <Link href="/forgot-password" className="text-sm font-medium" style={{ color: BRAND_COLOR }}>
        Forgot password?
      </Link>
    </div>
  );
}
