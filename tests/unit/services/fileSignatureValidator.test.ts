import { matchesFileSignature } from "@/lib/services/fileSignatureValidator";

describe("matchesFileSignature", () => {
  test("accepts a real PDF signature", () => {
    const buffer = Buffer.from("%PDF-1.4\n%âãÏÓ\n");
    expect(matchesFileSignature(buffer, "pdf")).toBe(true);
  });

  test("rejects a non-PDF buffer claiming to be a PDF", () => {
    const buffer = Buffer.from("This is just plain text, not a PDF.");
    expect(matchesFileSignature(buffer, "pdf")).toBe(false);
  });

  test("accepts a real DOCX (ZIP local-file-header) signature", () => {
    const buffer = Buffer.from([0x50, 0x4b, 0x03, 0x04, 0x14, 0x00, 0x00, 0x00]);
    expect(matchesFileSignature(buffer, "docx")).toBe(true);
  });

  test("accepts an empty-archive ZIP signature for DOCX", () => {
    const buffer = Buffer.from([0x50, 0x4b, 0x05, 0x06, 0x00, 0x00]);
    expect(matchesFileSignature(buffer, "docx")).toBe(true);
  });

  test("rejects a non-ZIP buffer claiming to be a DOCX", () => {
    const buffer = Buffer.from("Not a real docx file at all.");
    expect(matchesFileSignature(buffer, "docx")).toBe(false);
  });

  test("rejects a PDF-signed buffer claiming to be a DOCX and vice versa", () => {
    const pdfBuffer = Buffer.from("%PDF-1.7");
    const zipBuffer = Buffer.from([0x50, 0x4b, 0x03, 0x04]);
    expect(matchesFileSignature(pdfBuffer, "docx")).toBe(false);
    expect(matchesFileSignature(zipBuffer, "pdf")).toBe(false);
  });

  test("rejects a buffer shorter than the expected magic number", () => {
    expect(matchesFileSignature(Buffer.from([0x25]), "pdf")).toBe(false);
    expect(matchesFileSignature(Buffer.alloc(0), "docx")).toBe(false);
  });
});
