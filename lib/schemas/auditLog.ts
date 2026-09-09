import { z } from "zod";
import { nullish } from "@/lib/schemas/zodHelpers";

/**
 * buildPlan.md §80: "audit logs" for sensitive admin actions (JD upload,
 * matching run, publish/hide results, skill taxonomy and scoring config
 * mutations) — a trail of who did what, not a general application log
 * (see lib/logger.ts for that).
 */
export const auditLogSchema = z.object({
  _id: z.string(),
  actorId: z.string(),
  actorRole: z.enum(["ADMIN", "STUDENT"]),
  action: z.string(),
  targetType: z.string(),
  targetId: z.string(),
  metadata: nullish(z.record(z.string(), z.unknown())),
  createdAt: z.date(),
});
export type AuditLog = z.infer<typeof auditLogSchema>;
