import { redirect } from "next/navigation";
import { AuthError } from "next-auth";
import { signIn } from "@/lib/auth/config";

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

export default async function SignInPage(props: PageProps<"/sign-in">) {
  const { error } = await props.searchParams;

  return (
    <div className="flex flex-1 items-center justify-center bg-background px-6">
      <form action={authenticate} className="flex w-full max-w-sm flex-col gap-4">
        <h1 className="text-2xl font-semibold text-foreground">Sign in</h1>
        {error && (
          <p className="text-sm text-status-error">Invalid email or password.</p>
        )}
        <label className="flex flex-col gap-1 text-sm text-foreground">
          Email
          <input
            name="email"
            type="email"
            required
            className="rounded border border-border bg-surface px-3 py-2 text-foreground"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm text-foreground">
          Password
          <input
            name="password"
            type="password"
            required
            className="rounded border border-border bg-surface px-3 py-2 text-foreground"
          />
        </label>
        <button
          type="submit"
          className="rounded bg-foreground px-4 py-2 text-background transition-colors hover:opacity-90"
        >
          Sign in
        </button>
      </form>
    </div>
  );
}
