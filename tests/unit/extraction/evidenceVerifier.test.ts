import { verifyEvidence } from "@/lib/extraction/evidenceVerifier";

const SOURCE = `
Built backend APIs using Node.js and Express for a real-time chat application.
Deployed the application on AWS EC2 with a MongoDB database.
Led a team of three engineers during the final semester project.
`;

describe("verifyEvidence", () => {
  it("returns EXACT for a claim that appears verbatim (after normalization)", () => {
    const result = verifyEvidence("Built backend APIs using Node.js and Express", SOURCE);
    expect(result).toEqual({ verified: true, method: "EXACT" });
  });

  it("returns EXACT ignoring case and punctuation differences", () => {
    const result = verifyEvidence("deployed the application on aws ec2", SOURCE);
    expect(result).toEqual({ verified: true, method: "EXACT" });
  });

  it("returns FUZZY for a close paraphrase not present verbatim", () => {
    // one word changed ("led a team" -> "leading a team") from the source
    // sentence, high token overlap but not an exact substring match
    const result = verifyEvidence(
      "Leading a team of three engineers during the final semester project",
      SOURCE,
    );
    expect(result.method).toBe("FUZZY");
    expect(result.verified).toBe(true);
  });

  it("returns UNVERIFIED for a claim unrelated to the source text", () => {
    const result = verifyEvidence("Certified AWS Solutions Architect Professional", SOURCE);
    expect(result).toEqual({ verified: false, method: "UNVERIFIED" });
  });

  it("returns UNVERIFIED for an empty claim", () => {
    expect(verifyEvidence("", SOURCE)).toEqual({ verified: false, method: "UNVERIFIED" });
  });
});
