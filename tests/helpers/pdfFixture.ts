/**
 * Builds a minimal, valid, real PDF (not a fake byte string) so tests
 * exercise the actual `pdf-parse` library rather than mocking it away.
 * Byte offsets are computed from actual string lengths, not hand-counted.
 */
export function buildMinimalPdf(lines: string[]): Buffer {
  const objects: Record<number, string> = {};
  objects[1] = "<< /Type /Catalog /Pages 2 0 R >>";
  objects[2] = "<< /Type /Pages /Kids [3 0 R] /Count 1 >>";
  objects[3] =
    "<< /Type /Page /Parent 2 0 R /Resources << /Font << /F1 4 0 R >> >> /MediaBox [0 0 612 792] /Contents 5 0 R >>";
  objects[4] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>";

  const streamLines = lines
    .map((line, i) => `${i === 0 ? "50 700" : "0 -20"} Td (${line}) Tj`)
    .join("\n");
  const streamContent = `BT /F1 12 Tf\n${streamLines}\nET`;
  objects[5] = `<< /Length ${streamContent.length} >>\nstream\n${streamContent}\nendstream`;

  let pdf = "%PDF-1.4\n";
  const offsets: number[] = [0];
  for (let i = 1; i <= 5; i++) {
    offsets[i] = Buffer.byteLength(pdf, "latin1");
    pdf += `${i} 0 obj\n${objects[i]}\nendobj\n`;
  }
  const xrefOffset = Buffer.byteLength(pdf, "latin1");
  pdf += `xref\n0 6\n0000000000 65535 f \n`;
  for (let i = 1; i <= 5; i++) {
    pdf += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  return Buffer.from(pdf, "latin1");
}
