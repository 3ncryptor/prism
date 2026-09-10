import { logger } from "@/lib/logger";
import type { EmailProvider } from "@/lib/email/emailProvider";

/**
 * docs/screens.md §4.3 (feature 27g). Dev/CI fallback when SMTP_HOST/USER/
 * PASS aren't configured — logs the reset link instead of failing, so
 * local development never needs real email credentials to exercise the
 * forgot-password flow end to end.
 */
export class ConsoleEmailProvider implements EmailProvider {
  async sendPasswordResetEmail(to: string, resetUrl: string): Promise<void> {
    logger.info({ to, resetUrl }, "SMTP not configured — logging password reset link instead of sending it");
  }

  async sendVerificationEmail(to: string, verifyUrl: string): Promise<void> {
    logger.info({ to, verifyUrl }, "SMTP not configured — logging verification link instead of sending it");
  }
}
