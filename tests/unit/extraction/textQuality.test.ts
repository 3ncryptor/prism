import { checkTextQuality } from "@/lib/extraction/textQuality";

const GOOD_TEXT = `
John Doe
Software Engineer
Experience: Built REST APIs using Node.js and MongoDB for three years.
Education: B.Tech Computer Science, graduated 2024.
Skills: TypeScript, React, Node.js, MongoDB, AWS.
`.repeat(2);

describe("checkTextQuality", () => {
  it("accepts realistic resume text", () => {
    expect(checkTextQuality(GOOD_TEXT)).toEqual({ insufficient: false });
  });

  it("rejects text that is too short", () => {
    const result = checkTextQuality("Hi.");
    expect(result.insufficient).toBe(true);
    expect(result.reason).toMatch(/too short/);
  });

  it("rejects text with too few lines", () => {
    const oneLine = "a".repeat(150);
    const result = checkTextQuality(oneLine);
    expect(result.insufficient).toBe(true);
    expect(result.reason).toMatch(/too few lines/);
  });

  it("rejects text with too many non-printable characters (OCR-garbage proxy)", () => {
    const garbageLine = "�".repeat(40);
    const garbage = [garbageLine, garbageLine, garbageLine].join("\n");
    const result = checkTextQuality(garbage);
    expect(result.insufficient).toBe(true);
    expect(result.reason).toMatch(/non-printable/);
  });
});
