"use client";

import { withClientOnlyGrauity } from "@/lib/withClientOnlyGrauity";
import type { AppShell } from "@/lib/layout/AppShell";

export const ClientOnlyAppShell = withClientOnlyGrauity<React.ComponentProps<typeof AppShell>>(() =>
  import("@/lib/layout/AppShell").then((mod) => mod.AppShell),
);
