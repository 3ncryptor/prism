import { createSmtpEmailProviderFromEnv } from "@/lib/email/smtpEmailProvider";
import { ConsoleEmailProvider } from "@/lib/email/consoleEmailProvider";
import type { EmailProvider } from "@/lib/email/emailProvider";

/**
 * docs/screens.md §4.3/§4.4 (feature 27g). Provider selection is an
 * environment-config change (buildPlan.md §5.7): SMTP_HOST/USER/PASS set
 * → real SMTP delivery; unset → console-logged dev fallback. No caller
 * needs to know which one is active.
 */
export function getEmailProvider(): EmailProvider {
  return createSmtpEmailProviderFromEnv() ?? new ConsoleEmailProvider();
}

export type { EmailProvider } from "@/lib/email/emailProvider";
