const LOGO_URL = "https://d3dyfaf3iutrxo.cloudfront.net/general/upload/f966abf737734a13852e407e3faeb421.avif";

interface LogoProps {
  className?: string;
}

/**
 * buildPlan.md §120. User-provided brand logo asset (2026-09-11) —
 * replaces the plain "Prism" text wordmark everywhere it was rendered
 * (auth layout, landing nav/footer). Always external, so a plain <img>
 * (not next/image, which would need this CloudFront host allow-listed in
 * next.config.ts for one small wordmark image).
 */
export function Logo({ className = "h-7 w-auto" }: LogoProps) {
  // eslint-disable-next-line @next/next/no-img-element -- always-external logo asset
  return <img src={LOGO_URL} alt="Prism" className={className} />;
}
