import type { AuditLog } from "@/lib/schemas/auditLog";
import { auditLogRepository, type AuditLogRepository } from "@/lib/db/repositories/auditLogRepository";
import { logger } from "@/lib/logger";

type Deps = {
  auditLogs: Pick<AuditLogRepository, "create">;
};

const defaultDeps: Deps = { auditLogs: auditLogRepository };

/**
 * buildPlan.md §80: records who did a sensitive admin action. Never
 * throws — a logging failure must never block the action it's recording
 * (the primary request already succeeded by the time this is called), but
 * the failure itself is never silently dropped: it's logged via the
 * structured application logger instead.
 */
export async function recordAuditLog(
  entry: Omit<AuditLog, "_id" | "createdAt">,
  deps: Deps = defaultDeps,
): Promise<void> {
  try {
    await deps.auditLogs.create(entry);
  } catch (error) {
    logger.error({ err: error, action: entry.action, actorId: entry.actorId }, "Failed to record audit log");
  }
}
