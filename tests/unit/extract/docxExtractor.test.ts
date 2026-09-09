import fs from "node:fs";
import path from "node:path";
import { extractDocxText } from "@/lib/extract/docxExtractor";

describe("extractDocxText (real mammoth library)", () => {
  it("extracts real text from a real DOCX file", async () => {
    // mammoth ships this fixture for its own tests; reusing it here avoids
    // hand-crafting a binary .docx file.
    const fixturePath = path.join(
      process.cwd(),
      "node_modules/mammoth/test/test-data/underline.docx",
    );
    const buffer = fs.readFileSync(fixturePath);

    const text = await extractDocxText(buffer);

    expect(text.trim().length).toBeGreaterThan(0);
  });
});
