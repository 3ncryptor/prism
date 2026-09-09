export interface TextQualityResult {
  insufficient: boolean;
  reason?: string;
}

const MIN_LENGTH = 100;
const MIN_LINES = 3;
const MIN_PRINTABLE_RATIO = 0.7;

/**
 * buildPlan.md §18: detect unusable extracted text (scanned/image-only
 * PDFs, extraction failures) before sending it to the LLM, rather than
 * silently generating a bad profile from garbage input.
 */
export function checkTextQuality(text: string): TextQualityResult {
  const trimmed = text.trim();

  if (trimmed.length < MIN_LENGTH) {
    return { insufficient: true, reason: `Extracted text is too short (${trimmed.length} chars)` };
  }

  const lineCount = trimmed.split(/\r?\n/).filter((line) => line.trim().length > 0).length;
  if (lineCount < MIN_LINES) {
    return { insufficient: true, reason: `Extracted text has too few lines (${lineCount})` };
  }

  const printableChars = trimmed.replace(/[^\x20-\x7E\n\r\t]/g, "").length;
  const printableRatio = printableChars / trimmed.length;
  if (printableRatio < MIN_PRINTABLE_RATIO) {
    return {
      insufficient: true,
      reason: `Extracted text has too many non-printable characters (${(printableRatio * 100).toFixed(0)}% printable)`,
    };
  }

  return { insufficient: false };
}
