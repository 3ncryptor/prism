/**
 * Best-effort client IP extraction from standard reverse-proxy headers.
 * Next.js Route Handlers get a plain `Request` with no built-in `.ip` —
 * that was a Pages-Router/edge-runtime-only convenience. `x-forwarded-for`
 * can carry a client-supplied value when there's no trusted proxy in front
 * of the app, so this is a rate-limiting signal (coarser, harder to spoof
 * *consistently* than to spoof once), not an authorization decision.
 */
export function getClientIp(request: Request): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    const firstIp = forwardedFor.split(",")[0]?.trim();
    if (firstIp) return firstIp;
  }

  const realIp = request.headers.get("x-real-ip");
  if (realIp) return realIp.trim();

  return "unknown";
}
