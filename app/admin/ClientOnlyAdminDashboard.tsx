"use client";

import { withClientOnlyGrauity } from "@/lib/withClientOnlyGrauity";
import type { AdminDashboard } from "@/app/admin/AdminDashboard";

export const ClientOnlyAdminDashboard = withClientOnlyGrauity<React.ComponentProps<typeof AdminDashboard>>(() =>
  import("@/app/admin/AdminDashboard").then((mod) => mod.AdminDashboard),
);
