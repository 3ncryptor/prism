import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Removes the `X-Powered-By: Next.js` response header — a minor
  // information-disclosure reduction (don't advertise the framework/version).
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          // Only takes effect over HTTPS (browsers ignore it on plain HTTP);
          // harmless to send unconditionally. No CSP here — this app uses
          // per-brand inline `style` props throughout, and a CSP tight
          // enough to be meaningful would need real per-page auditing to
          // avoid breaking the UI; not worth guessing at blind.
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
        ],
      },
    ];
  },
};

export default nextConfig;
