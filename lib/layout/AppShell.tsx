"use client";

import { useRef, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { Sidebar, type SidebarNavItem } from "@/lib/layout/Sidebar";
import { TopBar } from "@/lib/layout/TopBar";
import { SmoothScrollProvider } from "@/lib/layout/SmoothScrollProvider";

gsap.registerPlugin(useGSAP);

interface AppShellProps {
  navItems: SidebarNavItem[];
  name: string;
  email: string;
  onSignOut: () => Promise<void>;
  children: ReactNode;
}

/**
 * docs/screens.md §1/§2: the generic shell `AdminLayout`/`StudentLayout`
 * configure — sidebar + top bar + a Lenis-smoothed content area. Content
 * fades/slides in on each navigation: per emil-design-eng's frequency
 * table, page content changes are "occasional," which is exactly the
 * tier where a standard, subtle animation is appropriate — kept under
 * 300ms and a small y-offset so it stays out of the way.
 */
export function AppShell({ navItems, name, email, onSignOut, children }: AppShellProps) {
  const pathname = usePathname();
  const contentRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      gsap.fromTo(contentRef.current, { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: 0.25, ease: "power2.out" });
    },
    { scope: contentRef, dependencies: [pathname] },
  );

  return (
    <div className="flex h-screen overflow-hidden bg-white">
      <Sidebar items={navItems} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <TopBar name={name} email={email} onSignOut={onSignOut} />
        <SmoothScrollProvider className="flex-1">
          <div ref={contentRef} className="mx-auto w-full max-w-4xl px-6 py-12">
            {children}
          </div>
        </SmoothScrollProvider>
      </div>
    </div>
  );
}
