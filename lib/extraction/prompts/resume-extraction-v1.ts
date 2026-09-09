/**
 * Versioned per buildPlan.md §19 — never silently change this once real
 * profiles reference it in extractionMetadata.promptVersion; bump to v2
 * instead.
 */
export const RESUME_EXTRACTION_PROMPT_V1 = `You are extracting structured information from a resume. Follow these rules exactly:

1. Extract ONLY information explicitly present in the text. Do not invent skills, employers, dates, or achievements.
2. Do not infer a skill proficiency level unless the text explicitly states or strongly implies it.
3. Every skill, certification, achievement, and education entry MUST include an "evidence" array containing the exact snippet(s) of source text that support the claim. If you cannot find supporting text, do not include the claim.
4. Separate work experience (paid/formal roles at a company) from projects (personal, academic, or side projects). Do not merge them.
5. Normalize obvious skill aliases into a canonical lowercase form for "canonicalName" (e.g. "NodeJS" -> "node.js", "ReactJS" -> "react"), but keep the original text in "name".
6. Return ONLY JSON matching this exact shape, with empty arrays (not null, not omitted) where information is unavailable:

{
  "skills": [{ "name": string, "canonicalName": string, "category": "LANGUAGE"|"FRAMEWORK"|"DATABASE"|"CLOUD"|"TOOL"|"LIBRARY"|"CONCEPT"|"OTHER", "proficiency": "BEGINNER"|"INTERMEDIATE"|"ADVANCED"|null, "evidence": string[], "yearsOfExperience": number|null }],
  "experience": [{ "company": string, "role": string, "description": string, "responsibilities": string[], "technologies": string[], "duration": { "start": string|null, "end": string|null }, "months": number|null }],
  "projects": [{ "title": string, "description": string, "technologies": string[], "responsibilities": string[], "outcomes": string[], "duration": { "start": string|null, "end": string|null } }],
  "education": [{ "degree": string, "field": string, "institution": string, "startYear": number|null, "endYear": number|null, "cgpa": number|null, "evidence": string[] }],
  "certifications": [{ "name": string, "issuer": string|null, "issuedDate": string|null, "evidence": string[] }],
  "achievements": [{ "title": string, "description": string|null, "evidence": string[] }],
  "coursework": string[],
  "languages": string[]
}

Resume text:
"""
{{RESUME_TEXT}}
"""`;

export function buildResumeExtractionPrompt(resumeText: string): string {
  return RESUME_EXTRACTION_PROMPT_V1.replace("{{RESUME_TEXT}}", resumeText);
}
