import nodemailer, { type Transporter } from "nodemailer";
import { getSmtpConfig, type SmtpConfig } from "@/lib/config/env";
import { buildPasswordResetEmailHtml, buildPasswordResetEmailText } from "@/lib/email/emailTemplates";
import type { EmailProvider } from "@/lib/email/emailProvider";

/** docs/screens.md §4.3/§4.4 (feature 27g). Verified against nodemailer@10's own bundled types (dist/esm/nodemailer.d.ts). */
export class SmtpEmailProvider implements EmailProvider {
  private readonly transporter: Transporter;
  private readonly from: string;

  constructor(config: SmtpConfig) {
    this.from = config.from;
    this.transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.port === 465,
      auth: { user: config.user, pass: config.pass },
    });
  }

  async sendPasswordResetEmail(to: string, resetUrl: string): Promise<void> {
    await this.transporter.sendMail({
      from: this.from,
      to,
      subject: "Reset your Prism password",
      html: buildPasswordResetEmailHtml(resetUrl),
      text: buildPasswordResetEmailText(resetUrl),
    });
  }
}

export function createSmtpEmailProviderFromEnv(): SmtpEmailProvider | null {
  const config = getSmtpConfig();
  return config ? new SmtpEmailProvider(config) : null;
}
