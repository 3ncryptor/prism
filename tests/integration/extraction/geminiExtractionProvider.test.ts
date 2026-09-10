import { GeminiExtractionProvider } from "@/lib/extraction/geminiExtractionProvider";
import { normalizeProfile } from "@/lib/extraction/normalizeProfile";
import type { ExtractionProvider } from "@/lib/extraction/extractionProvider";

const SAMPLE_RESUME_TEXT = `
Jane Smith
Software Engineering Student

Education
B.Tech in Computer Science, National Institute of Technology, 2021-2025, CGPA 8.7

Projects
StudyBuddy - Built a real-time collaborative study platform using Next.js, Node.js,
WebSockets, and MongoDB. Implemented live document editing and chat features.

Experience
Backend Intern, Acme Corp, May 2024 - July 2024
Built REST APIs using Node.js and Express, integrated with a PostgreSQL database.

Skills
JavaScript, TypeScript, React, Node.js, MongoDB, Git
`;

// This hits the real Gemini API and spends a real request against the
// free tier's 20-per-day quota — the same quota real resume/JD uploads
// depend on. Gating on "a key happens to be configured" (as this used to)
// meant plain `npm test` silently burned that shared quota on every run,
// which is the root cause of production uploads failing with 429s even on
// the first upload of the day. Require an explicit opt-in instead.
const shouldRun = process.env.RUN_GEMINI_INTEGRATION_TESTS === "true";
const maybeDescribe = shouldRun ? describe : describe.skip;

maybeDescribe("GeminiExtractionProvider (real Gemini API) — opt-in via RUN_GEMINI_INTEGRATION_TESTS=true", () => {
  it("returns JSON that normalizes into a valid StudentProfile", async () => {
    const provider: ExtractionProvider = new GeminiExtractionProvider();

    const raw = await provider.extractResume(SAMPLE_RESUME_TEXT, "resume-extraction-v1");

    const profile = normalizeProfile(raw, {
      studentId: "student-test",
      resumeId: "resume-test",
      sourceText: SAMPLE_RESUME_TEXT,
      model: provider.modelId,
      promptVersion: "resume-extraction-v1",
      skillTaxonomy: [],
    });

    // The LLM's exact picks can vary run to run; assert on structure and
    // evidence-grounding rather than exact content.
    expect(Array.isArray(profile.skills)).toBe(true);
    expect(profile.skills.length).toBeGreaterThan(0);
    for (const skill of profile.skills) {
      expect(skill.evidence.length).toBeGreaterThan(0);
    }
    expect(profile.projects.length).toBeGreaterThan(0);
    expect(profile.education.length).toBeGreaterThan(0);
  }, 90_000);
});
