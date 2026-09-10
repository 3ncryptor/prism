import { requireRole } from "@/lib/auth/guard";
import { signOut } from "@/lib/auth/config";
import { AppShell } from "@/lib/layout/AppShell";
import type { SidebarNavItem } from "@/lib/layout/Sidebar";

const STUDENT_NAV_ITEMS: SidebarNavItem[] = [
  { label: "Dashboard", href: "/student" },
  { label: "Resumes", href: "/student/resumes" },
  { label: "Applications", href: "/student/applications" },
  { label: "Profile", href: "/student/profile" },
];

async function handleSignOut() {
  "use server";
  await signOut({ redirectTo: "/" });
}

/** docs/screens.md §2 — feature 27a: shared shell for every /student/* page. */
export default async function StudentRootLayout({ children }: LayoutProps<"/student">) {
  const session = await requireRole("STUDENT");

  return (
    <AppShell
      navItems={STUDENT_NAV_ITEMS}
      name={session.user.name ?? ""}
      email={session.user.email ?? ""}
      onSignOut={handleSignOut}
    >
      {children}
    </AppShell>
  );
}
