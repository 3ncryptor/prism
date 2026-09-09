/** Versioned per buildPlan.md §19's convention, applied to JDs (§21). */
export const JD_EXTRACTION_PROMPT_V1 = `You are extracting structured requirements from a job description. Follow these rules exactly:

1. Extract ONLY requirements explicitly present or clearly implied by the text. Do not invent requirements.
2. Distinguish MANDATORY requirements (the JD says "required", "must have", "minimum") from HIGH/MEDIUM/LOW importance preferred ones.
3. A constraint is "disqualifying" only if the JD explicitly states it as an absolute cutoff (e.g. "candidates must have graduated by 2026", "B.Tech or equivalent required"). Preferences ("nice to have X certification") are never disqualifying.
4. Separate required skills from preferred/nice-to-have skills.
5. Normalize obvious skill aliases into a canonical lowercase form for "canonicalName" (e.g. "NodeJS" -> "node.js").
6. Return ONLY JSON matching this exact shape, with empty arrays (not null, not omitted) where information is unavailable:

{
  "title": string,
  "company": string|null,
  "requiredSkills": [{ "name": string, "canonicalName": string, "category": string, "importance": "MANDATORY"|"HIGH"|"MEDIUM"|"LOW", "evidence": string|null, "yearsRequired": number|null }],
  "preferredSkills": [{ "name": string, "canonicalName": string, "category": string, "importance": "MANDATORY"|"HIGH"|"MEDIUM"|"LOW", "evidence": string|null, "yearsRequired": number|null }],
  "responsibilities": string[],
  "requiredExperience": { "minMonths": number, "domain": string|null, "disqualifying": boolean }|null,
  "educationRequirements": [{ "degree": string[], "field": string[]|null, "minCgpa": number|null, "disqualifying": boolean }],
  "certifications": string[],
  "preferredDomains": string[],
  "constraints": [{ "name": string, "type": "GRADUATION_YEAR"|"CGPA"|"DEGREE"|"CERTIFICATION"|"OTHER", "value": string, "disqualifying": boolean }],
  "semanticRequirements": [{ "description": string, "importance": "HIGH"|"MEDIUM"|"LOW", "canonicalSkillHints": string[]|null }]
}

Job description text:
"""
{{JD_TEXT}}
"""`;

export function buildJDExtractionPrompt(jdText: string): string {
  return JD_EXTRACTION_PROMPT_V1.replace("{{JD_TEXT}}", jdText);
}
