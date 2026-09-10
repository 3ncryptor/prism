import { selectResumeForJob } from "@/lib/matching/selectResumeForJob";

describe("selectResumeForJob", () => {
  it("prefers the role-tagged candidate when the job has a role and a match exists", () => {
    const candidates = [{ id: "global", jobRole: null }, { id: "data-science", jobRole: "data science" }];
    expect(selectResumeForJob("data science", candidates)).toEqual({ id: "data-science", jobRole: "data science" });
  });

  it("falls back to the global candidate when the job has a role but no role-specific match exists", () => {
    const candidates = [{ id: "global", jobRole: null }, { id: "software-dev", jobRole: "software development" }];
    expect(selectResumeForJob("data science", candidates)).toEqual({ id: "global", jobRole: null });
  });

  it("returns null when neither a role match nor a global candidate exists", () => {
    const candidates = [{ id: "software-dev", jobRole: "software development" }];
    expect(selectResumeForJob("data science", candidates)).toBeNull();
  });

  it("returns null when the student has published nothing at all", () => {
    expect(selectResumeForJob("data science", [])).toBeNull();
  });

  it("matches only the global candidate when the job itself has no role assigned (legacy job)", () => {
    const candidates = [{ id: "data-science", jobRole: "data science" }, { id: "global", jobRole: null }];
    expect(selectResumeForJob(null, candidates)).toEqual({ id: "global", jobRole: null });
  });

  it("returns null for a role-less job when the student has no global candidate", () => {
    const candidates = [{ id: "data-science", jobRole: "data science" }];
    expect(selectResumeForJob(null, candidates)).toBeNull();
  });
});
