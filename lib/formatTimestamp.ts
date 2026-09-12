/**
 * `Date.prototype.toLocaleString()` with no locale/timeZone resolves both
 * to the *runtime's own* default — which differs between the Node server
 * (this app's Docker image, defaults to UTC) and the browser (the
 * viewer's own system timezone). Confirmed live: the same timestamp
 * server-rendered as "10:41 AM" and client-rendered as "4:11 PM" — same
 * date, times 5:30 apart (exactly the UTC-to-IST offset) — a real,
 * reproducible hydration mismatch (React error #418) on both the admin
 * dashboard's "Recent activity" and Scoring Config's "Version history"
 * timestamps. Pinning both an explicit locale and timeZone makes the
 * output deterministic regardless of either environment's own default.
 * This app is a single university placement cell (not a multi-timezone
 * product), so a fixed institutional timezone is the right call here —
 * not a per-viewer one, which would need a client-only render pass.
 */
export function formatTimestamp(date: Date | string): string {
  return new Date(date).toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Kolkata",
  });
}
