import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";

export default async function Home() {
  const session = await getSession();
  if (session?.user.role === "STUDENT") {
    redirect("/student");
  }
  if (session?.user.role === "ADMIN") {
    redirect("/admin");
  }

  return (
    <div className="flex flex-1 items-center justify-center bg-background px-6">
      <main className="flex max-w-xl flex-col items-start gap-4 text-left">
        <p className="text-sm font-medium tracking-wide text-muted uppercase">
          Prism
        </p>
        <h1 className="text-4xl font-semibold leading-tight tracking-tight text-foreground">
          Explainable resume-to-JD matching
        </h1>
        <p className="text-lg leading-8 text-muted">
          Every fit score is traceable to the evidence behind it — built for
          placement cells that need to know why, not just how much.
        </p>
        <Link
          href="/sign-in"
          className="mt-2 rounded bg-foreground px-4 py-2 text-background transition-colors hover:opacity-90"
        >
          Sign in
        </Link>
      </main>
    </div>
  );
}
