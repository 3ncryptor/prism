import { Badge } from "@/lib/ui/Badge";
import type { FitBucket } from "@/lib/matching/types";

const BUCKET_TONE: Record<FitBucket, "success" | "warning" | "error"> = {
  BEST_FIT: "success",
  MODERATE_FIT: "warning",
  LOW_FIT: "error",
};

const BUCKET_LABEL: Record<FitBucket, string> = {
  BEST_FIT: "Best Fit",
  MODERATE_FIT: "Moderate",
  LOW_FIT: "Low Fit",
};

interface BucketPillProps {
  bucket: FitBucket;
}

/** buildPlan.md §120 (feature 27j): migrated off Grauity's NSPill onto lib/ui/Badge. */
export function BucketPill({ bucket }: BucketPillProps) {
  return <Badge tone={BUCKET_TONE[bucket]}>{BUCKET_LABEL[bucket]}</Badge>;
}
