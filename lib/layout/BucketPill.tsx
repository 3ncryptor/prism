import { NSPill } from "@newtonschool/grauity";
import type { FitBucket } from "@/lib/matching/types";

const BUCKET_COLOR: Record<FitBucket, "success" | "warning" | "error"> = {
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

/** docs/screens.md §1: consolidates the BUCKET_COLOR/LABEL map duplicated across ResultTable and ApplicationsSection. */
export function BucketPill({ bucket }: BucketPillProps) {
  return (
    <NSPill color={BUCKET_COLOR[bucket]} isActive>
      {BUCKET_LABEL[bucket]}
    </NSPill>
  );
}
