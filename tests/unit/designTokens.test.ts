import { getRoleColor } from "@/lib/designTokens";

describe("getRoleColor", () => {
  it("is deterministic — the same canonical name always returns the same color", () => {
    const first = getRoleColor("data science");
    const second = getRoleColor("data science");
    expect(second).toEqual(first);
  });

  it("returns a complete color object", () => {
    const color = getRoleColor("software development");
    expect(color).toEqual(
      expect.objectContaining({
        text: expect.stringMatching(/^#[0-9A-Fa-f]{6}$/),
        bg: expect.stringMatching(/^#[0-9A-Fa-f]{6}$/),
        border: expect.stringMatching(/^#[0-9A-Fa-f]{6}$/),
      }),
    );
  });

  it("distributes different names across more than one color", () => {
    const names = ["data science", "software development", "product management", "design", "marketing", "sales"];
    const colors = new Set(names.map((name) => getRoleColor(name).text));
    expect(colors.size).toBeGreaterThan(1);
  });
});
