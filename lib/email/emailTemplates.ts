const BRAND_COLOR = "#4F46E5";

/**
 * docs/screens.md §4.3 (feature 27g). Plain inline styles throughout — most
 * email clients strip <style> blocks or ignore external CSS, so anything
 * that must render consistently (brand color, button, spacing) has to be
 * inline. Kept to a single column, no external assets, matching the same
 * light/grayscale-plus-brand-accent system used across the app (AGENTS.md
 * §6).
 */
export function buildPasswordResetEmailHtml(resetUrl: string): string {
  return `
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background-color: #ffffff; color: #171717; max-width: 480px; margin: 0 auto; padding: 32px 24px;">
  <p style="font-size: 18px; font-weight: 600; margin: 0 0 24px;">Prism</p>
  <h1 style="font-size: 20px; font-weight: 600; margin: 0 0 16px;">Reset your password</h1>
  <p style="font-size: 14px; line-height: 22px; color: #5B6271; margin: 0 0 24px;">
    We received a request to reset the password for your Prism account. Click the button below to choose a new one. This link expires in 30 minutes.
  </p>
  <a href="${resetUrl}" style="display: inline-block; background-color: ${BRAND_COLOR}; color: #ffffff; text-decoration: none; font-size: 14px; font-weight: 600; padding: 10px 24px; border-radius: 6px; margin-bottom: 24px;">
    Reset password
  </a>
  <p style="font-size: 13px; line-height: 20px; color: #5B6271; margin: 0 0 8px;">
    If you didn't request this, you can safely ignore this email — your password will not change.
  </p>
  <p style="font-size: 12px; color: #9CA3AF; margin: 24px 0 0; word-break: break-all;">
    If the button above doesn't work, copy and paste this link into your browser:<br />${resetUrl}
  </p>
</div>
`.trim();
}

export function buildPasswordResetEmailText(resetUrl: string): string {
  return `Reset your Prism password\n\nWe received a request to reset your password. Open this link within 30 minutes to choose a new one:\n${resetUrl}\n\nIf you didn't request this, you can safely ignore this email.`;
}
