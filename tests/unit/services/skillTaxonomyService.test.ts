import { canonicalizeSkillName } from "@/lib/services/skillTaxonomyService";
import type { SkillTaxonomyEntry } from "@/lib/schemas/skillTaxonomy";

function makeEntry(overrides: Partial<SkillTaxonomyEntry> = {}): SkillTaxonomyEntry {
  return {
    _id: "taxonomy-1",
    canonicalName: "node.js",
    displayName: "Node.js",
    category: "FRAMEWORK",
    aliases: ["nodejs", "node"],
    isActive: true,
    createdBy: "admin-1",
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe("canonicalizeSkillName", () => {
  it("matches on canonicalName case-insensitively", () => {
    expect(canonicalizeSkillName("Node.JS", [makeEntry()])).toBe("node.js");
  });

  it("matches on displayName case-insensitively", () => {
    expect(canonicalizeSkillName("node.js", [makeEntry()])).toBe("node.js");
  });

  it("matches on an alias", () => {
    expect(canonicalizeSkillName("NodeJS", [makeEntry()])).toBe("node.js");
    expect(canonicalizeSkillName("node", [makeEntry()])).toBe("node.js");
  });

  it("ignores inactive entries", () => {
    expect(canonicalizeSkillName("nodejs", [makeEntry({ isActive: false })])).toBe("nodejs");
  });

  it("falls back to a trimmed/lowercased form when nothing matches", () => {
    expect(canonicalizeSkillName("  Rust  ", [makeEntry()])).toBe("rust");
  });

  it("falls back to a trimmed/lowercased form with an empty taxonomy", () => {
    expect(canonicalizeSkillName("Python", [])).toBe("python");
  });
});
