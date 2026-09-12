import { formatTimestamp } from "@/lib/formatTimestamp";

describe("formatTimestamp", () => {
  // Regression for a live hydration-mismatch bug (React error #418): the
  // same Date rendered as "10:41 AM" on the server (Docker, UTC) and
  // "4:11 PM" on the client (the viewer's local/IST timezone) because
  // neither locale nor timeZone was pinned. Both must now be fixed
  // regardless of the environment's own default.
  it("renders the same output no matter what the environment's default timezone is", () => {
    const date = new Date("2026-09-11T05:11:00.000Z");
    expect(formatTimestamp(date)).toBe("Sep 11, 2026, 10:41 AM");
  });

  it("accepts a date string as well as a Date instance", () => {
    expect(formatTimestamp("2026-09-11T05:11:00.000Z")).toBe(formatTimestamp(new Date("2026-09-11T05:11:00.000Z")));
  });
});
