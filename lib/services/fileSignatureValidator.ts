/**
 * buildPlan.md §82: "do not trust filename, MIME type, extension alone."
 * A client can set any Content-Type header it wants — this checks the
 * file's actual leading bytes instead. Pure, deterministic, no I/O.
 */
const PDF_MAGIC = Buffer.from("%PDF");

// A .docx is a ZIP archive; ZIP has three valid local-file-header magic
// numbers depending on whether the archive is empty/spanned.
const DOCX_MAGIC_VARIANTS = [
  Buffer.from([0x50, 0x4b, 0x03, 0x04]),
  Buffer.from([0x50, 0x4b, 0x05, 0x06]),
  Buffer.from([0x50, 0x4b, 0x07, 0x08]),
];

export type ValidatedFileExtension = "pdf" | "docx";

export function matchesFileSignature(buffer: Buffer, extension: ValidatedFileExtension): boolean {
  if (extension === "pdf") {
    return buffer.subarray(0, PDF_MAGIC.length).equals(PDF_MAGIC);
  }
  return DOCX_MAGIC_VARIANTS.some((magic) => buffer.subarray(0, magic.length).equals(magic));
}
