import { requireRole } from "@/lib/auth/guard";
import { signOut } from "@/lib/auth/config";

async function handleSignOut() {
  "use server";
  await signOut({ redirectTo: "/" });
}

/**
 * Placeholder only — the real student dashboard is feature #10
 * (buildPlan.md §106, §97). This exists so Auth (feature #2) is
 * demonstrable end-to-end: session + role-gating actually work.
 */
export default async function StudentHome() {
  const session = await requireRole("STUDENT");

  return (
    <div className="flex flex-1 flex-col items-start gap-4 bg-background px-6 py-16">
      <p className="text-sm font-medium tracking-wide text-muted uppercase">
        Student
      </p>
      <h1 className="text-2xl font-semibold text-foreground">
        Signed in as {session.user.name} ({session.user.email})
      </h1>
      <p className="text-muted">
        This is a placeholder — the real dashboard is a later feature.
      </p>
      <form action={handleSignOut}>
        <button
          type="submit"
          className="rounded border border-border px-4 py-2 text-foreground transition-colors hover:bg-surface"
        >
          Sign out
        </button>
      </form>
    </div>
  );
}
