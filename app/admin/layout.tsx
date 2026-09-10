import { requireRole } from "@/lib/auth/guard";
import { signOut } from "@/lib/auth/config";
import { ClientOnlyAppShell } from "@/lib/layout/ClientOnlyAppShell";
import type { SidebarNavItem } from "@/lib/layout/Sidebar";

const ADMIN_NAV_ITEMS: SidebarNavItem[] = [
  { label: "Jobs", href: "/admin", matchPrefixes: ["/admin/jobs"] },
  { label: "Job Roles", href: "/admin/job-roles" },
  { label: "Skill Taxonomy", href: "/admin/skill-taxonomy" },
  { label: "Scoring Config", href: "/admin/scoring-configs" },
];

async function handleSignOut() {
  "use server";
  await signOut({ redirectTo: "/" });
}

/** docs/screens.md §2 — feature 27a: shared shell for every /admin/* page. */
export default async function AdminRootLayout({ children }: LayoutProps<"/admin">) {
  const session = await requireRole("ADMIN");

  return (
    <ClientOnlyAppShell
      navItems={ADMIN_NAV_ITEMS}
      name={session.user.name ?? ""}
      email={session.user.email ?? ""}
      onSignOut={handleSignOut}
    >
      {children}
    </ClientOnlyAppShell>
  );
}
