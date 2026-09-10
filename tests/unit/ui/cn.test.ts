import { cn } from "@/lib/ui/cn";

describe("cn", () => {
  it("merges plain class strings", () => {
    expect(cn("a", "b")).toBe("a b");
  });

  it("drops falsy values", () => {
    expect(cn("a", false && "b", undefined, null, "c")).toBe("a c");
  });

  it("resolves conflicting Tailwind classes, keeping the last one", () => {
    expect(cn("px-2", "px-4")).toBe("px-4");
  });

  it("lets a caller-supplied className override a variant's own class", () => {
    expect(cn("bg-brand text-white", "bg-red-50")).toBe("text-white bg-red-50");
  });
});
