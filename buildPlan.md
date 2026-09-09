# Prism V1 — Build Plan & Technical Source of Truth

**Status:** V1 implementation specification  
**Audience:** Coding agents and engineers building the system  
**Stack constraint:** Next.js + TypeScript backend/frontend, MongoDB, Qdrant  
**Primary goal:** Given a student's resume and a placement-cell Job Description (JD), produce an explainable fit score and bucket for every student, while preserving enough evidence to audit why the score was produced.

---

## 1. Executive Summary

Prism is a university placement-cell platform for approximately 500 students.

### Core V1 workflow

1. A student uploads a resume.
2. The backend stores the original file and creates an asynchronous resume-processing job.
3. A worker extracts text from the resume.
4. An LLM converts the extracted text into a strict, validated structured profile.
5. The normalized profile is stored in MongoDB.
6. Relevant profile fields are embedded and indexed in Qdrant.
7. An admin uploads a JD.
8. The same extraction/normalization pipeline converts the JD into a structured job profile.
9. The matching engine compares the JD against each relevant student profile **feature-by-feature**, not as one giant resume-vs-JD cosine similarity.
10. Hard constraints and semantic feature scores are combined using a deterministic weighted scoring formula.
11. Students are assigned to:
    - **Best Fit**
    - **Moderate Fit**
    - **Low Fit**
12. Every score contains evidence so the admin can understand the result.
13. Students can see their uploaded resume, processed profile, and JDs/applications associated with them.

### Important V1 principle

The LLM is responsible for **extraction and normalization**, not for being the final ranking authority.

The ranking engine must be deterministic and testable.

Do **not** build V1 as:

```text
Resume embedding
        ↓
JD embedding
        ↓
cosine similarity
        ↓
fit score
```

Build it as:

```text
Resume
  ↓
Text extraction
  ↓
Structured student profile
  ├── skills
  ├── experience
  ├── projects
  ├── education
  ├── certifications
  ├── achievements
  └── metadata
          ↓
Feature embeddings
          ↓
Qdrant

JD
  ↓
Text extraction
  ↓
Structured job profile
  ├── required skills
  ├── preferred skills
  ├── responsibilities
  ├── experience requirements
  ├── education requirements
  ├── constraints
  └── semantic requirements
          ↓
Matching Engine
  ↓
Hard filters
  ↓
Feature-level semantic matching
  ↓
Feature scores
  ↓
Weighted aggregate
  ↓
Bucket + confidence + evidence
```

---

# 2. V1 Product Scope

## 2.1 Student capabilities

Students can:

- Sign in.
- Upload a resume.
- Replace/update a resume.
- View resume processing status.
- View extracted profile.
- View profile fields detected from their resume.
- View JDs/applications relevant to them.
- View their fit result where the placement-cell workflow allows it.
- See the latest resume version.
- See processing errors.

Student dashboard should contain:

```text
Dashboard
├── Profile completeness
├── Current resume
├── Resume processing status
├── Extracted skills
├── Projects
├── Experience
├── Education
└── Job applications / JD history
```

V1 does not require students to manually edit every extracted field unless the placement cell decides this is necessary.

---

## 2.2 Admin capabilities

Admins can:

- Sign in.
- View student population.
- View student resume processing status.
- Upload a JD.
- View JD processing status.
- View matching results.
- Filter results.
- Sort by fit score.
- Open a student result.
- Inspect evidence behind the score.
- Export results.
- Re-run matching.
- Archive a JD.
- **Publish or hide match results for students, per JD** (finalized default:
  hidden — see §86, §113).
- **Manage the skill taxonomy** (create/edit/deactivate canonical skills,
  categories, and aliases — finalized as DB-backed and admin-editable, see
  §113, §116).
- **Manage scoring configuration versions** (create a new named/versioned set
  of weights and bucket thresholds, activate it; never mutate a version once
  it has been used by a match run — see §46, §113, §116).

Admin dashboard:

```text
Admin
├── Students
├── Resumes
├── Job Descriptions
├── Matching Runs
├── Results
├── Skill Taxonomy
└── Scoring Config
```

JD result page:

```text
JD: Software Engineer Intern

Best Fit
  Student A     91
  Student B     89
  Student C     87

Moderate Fit
  Student D     78
  Student E     75

Low Fit
  Student F     54
  Student G     48
```

Clicking a student opens:

```text
Overall Score: 91
Bucket: Best Fit

Skills:          95
Experience:      88
Projects:        94
Education:       100
Requirements:    86

Matched evidence:
✓ TypeScript
✓ React
✓ Node.js
✓ REST APIs
✓ MongoDB

Missing:
× AWS

Relevant project:
"StudyBuddy — real-time collaboration platform"
```

---

# 3. Non-Goals for V1

Do NOT build these initially:

- Automatic hiring decisions.
- Autonomous candidate rejection.
- Reinforcement learning from admin behavior.
- Continuous online learning.
- Complex fine-tuned ranking models.
- Resume generation.
- Interview scheduling.
- Applicant tracking system functionality.
- Personality scoring.
- Facial analysis.
- Candidate demographic inference.
- LLM-generated final score without deterministic verification.

The V1 objective is a **reliable, explainable candidate-to-JD matching engine**.

---

# 4. Technology Stack

## Required

### Frontend/backend

- Next.js
- TypeScript
- React
- Next.js Route Handlers / server-side application code

### Database

- MongoDB

MongoDB stores:

- users
- students
- resumes
- extracted profiles
- job descriptions
- matching runs
- match results
- processing jobs
- audit information

### Vector database

- Qdrant

Qdrant stores embeddings for:

- student skills
- student projects
- student experience
- student certifications
- JD requirements
- JD responsibilities
- other semantic features

---

# 5. Additional Technologies

## 5.1 Object storage

Use S3-compatible object storage.

Recommended:

- AWS S3

Store:

```text
/resumes/{studentId}/{resumeId}/original.pdf
```

Do NOT store large PDF binaries directly inside MongoDB.

MongoDB stores metadata and object-storage references.

---

## 5.2 Queue / background jobs

The application must not perform resume/JD extraction synchronously inside the HTTP request.

Use a queue.

Recommended V1:

- Redis
- BullMQ

Architecture:

```text
Next.js
   ↓
MongoDB creates processing record
   ↓
BullMQ
   ↓
Worker
   ↓
Extraction
   ↓
LLM normalization
   ↓
Validation
   ↓
MongoDB
   ↓
Qdrant
```

Redis is used for queue state and worker coordination.

---

## 5.3 Resume text extraction

Use:

- `pdf-parse` or equivalent PDF text extraction library for text-based PDFs.

For DOCX:

- `mammoth`

For scanned PDFs:

- OCR service/library can be added later.

V1 should detect when extracted text quality is insufficient and mark the document as requiring OCR/manual review rather than silently generating a bad profile.

---

## 5.4 LLM

Use a strong structured-output-capable LLM.

The LLM performs:

```text
raw resume text
       ↓
structured JSON
```

and:

```text
raw JD text
       ↓
structured JSON
```

The model must be constrained using a schema.

Do not accept arbitrary LLM JSON.

Validate output using:

- Zod

Pipeline:

```text
LLM response
     ↓
JSON parsing
     ↓
Zod validation
     ↓
normalization
     ↓
business validation
     ↓
MongoDB
```

---

## 5.5 Embeddings

Use one embedding model consistently across:

- student features
- JD features

Do not embed the entire resume as one vector for the primary matching algorithm.

Generate embeddings for atomic/meaningful features.

Example:

```text
"Built a real-time collaborative study platform using Next.js,
Node.js, WebSockets and MongoDB"
```

can become a project-level embedding.

Skills can additionally be normalized into canonical skill IDs.

---

## 5.6 Authentication

**Finalized for V1:** NextAuth v5 + Credentials provider + `bcryptjs` password
hashing. No external SSO/IdP dependency. University SSO is explicitly deferred
to a future version — do not build it speculatively into V1's auth flow.

Prism is **single-tenant** for V1 (one placement cell, ~500 students). User,
StudentProfile, and JobProfile schemas do not carry an organization/tenant
field. Do not add multi-tenancy scaffolding speculatively.

Authorization must be role-based:

```text
STUDENT
ADMIN
```

Roles are stored on the `users` MongoDB document and read from the
server-side session on every request. Never trust a role supplied by the
frontend, a client-side cookie value, or a request body field.

---

## 5.7 Provider Configuration (Dev vs Prod) — Finalized

The extraction model and embedding model are each selected by environment
variable through a provider-abstraction interface (`ExtractionProvider`,
`EmbeddingProvider` — see §115), never hardcoded, per the §90 configuration
philosophy.

```text
                Extraction (resume/JD → JSON)   Embeddings
Development     Gemini                          Gemini embedding model
Production      Claude (Anthropic)              OpenAI text-embedding-3
```

Rules:

- Anthropic has no first-party embeddings API — do not attempt to use Claude
  for embeddings. Production embeddings are OpenAI.
- Dev and prod embeddings are **different vector spaces**. They must live in
  separate Qdrant collections (or separate Qdrant instances) and must never be
  compared, mixed, or migrated between each other without a full re-embed.
- Switching either provider is an environment-config change
  (`EXTRACTION_PROVIDER`, `EMBEDDING_PROVIDER` env vars), not a code branch
  scattered through services — all call sites depend on the provider
  interface, not a specific vendor SDK.
- `extractionMetadata.model` (§9) and `modelVersions` (§38) must record which
  provider/model actually produced a given profile or match, so historical
  records remain interpretable after a provider switch.

---

# 6. High-Level Architecture

```text
                         ┌───────────────────┐
                         │      Browser      │
                         └─────────┬─────────┘
                                   │
                              HTTPS/API
                                   │
                         ┌─────────▼─────────┐
                         │      Next.js      │
                         │                   │
                         │ UI                │
                         │ Route Handlers    │
                         │ Auth              │
                         │ Services          │
                         └──────┬─────┬──────┘
                                │     │
                     ┌──────────┘     └──────────┐
                     │                           │
              ┌──────▼──────┐             ┌──────▼──────┐
              │   MongoDB   │             │ Object      │
              │             │             │ Storage     │
              └─────────────┘             │ S3          │
                                          └─────────────┘
                                │
                                │ Queue
                                ▼
                         ┌─────────────┐
                         │ Redis       │
                         │ BullMQ      │
                         └──────┬──────┘
                                │
                                ▼
                         ┌─────────────┐
                         │ Worker      │
                         │ Processes   │
                         │ Documents   │
                         └──────┬──────┘
                                │
                    ┌───────────┴───────────┐
                    │                       │
              ┌─────▼─────┐           ┌─────▼─────┐
              │ LLM       │           │ Embedding │
              │ Extraction│           │ Model     │
              └───────────┘           └─────┬─────┘
                                            │
                                      ┌─────▼─────┐
                                      │ Qdrant    │
                                      └───────────┘
```

---

# 7. Monorepo / Repository Structure

Use a single repository.

Recommended structure:

```text
prism/
│
├── apps/
│   └── web/
│       ├── app/
│       │   ├── (auth)/
│       │   ├── student/
│       │   ├── admin/
│       │   └── api/
│       │
│       ├── components/
│       ├── lib/
│       └── middleware.ts
│
├── packages/
│   ├── db/
│   ├── schemas/
│   ├── matching/
│   ├── extraction/
│   ├── embeddings/
│   ├── qdrant/
│   ├── queue/
│   ├── auth/
│   └── config/
│
├── workers/
│   ├── document-worker/
│   ├── matching-worker/
│   └── index-worker/
│
├── scripts/
│   ├── seed.ts
│   ├── reindex.ts
│   └── evaluate.ts
│
├── tests/
│   ├── unit/
│   ├── integration/
│   └── evaluation/
│
├── docs/
│
├── package.json
├── turbo.json
├── tsconfig.json
└── buildPlan.md
```

If a monorepo creates unnecessary complexity for the coding agent, keep the same logical separation inside one Next.js project. The architectural boundaries matter more than the exact folder layout.

---

# 8. Domain Model

## 8.1 User

```ts
type UserRole = "STUDENT" | "ADMIN";

interface User {
  _id: string;
  email: string;
  name: string;
  role: UserRole;
  createdAt: Date;
  updatedAt: Date;
}
```

---

# 9. Student Profile Schema

The normalized student profile is the most important data structure in the system.

Example:

```ts
interface StudentProfile {
  studentId: string;

  education: Education[];

  skills: Skill[];

  experience: Experience[];

  projects: Project[];

  certifications: Certification[];

  achievements: Achievement[];

  coursework: string[];

  languages: string[];

  totalExperienceMonths: number;

  profileVersion: number;

  extractionMetadata: {
    model: string;
    promptVersion: string;
    extractedAt: Date;
    confidence?: number;
  };
}
```

---

# 10. Skill Schema

Do not rely entirely on arbitrary strings.

Use canonical skill normalization.

Example:

```ts
interface Skill {
  name: string;
  canonicalName: string;
  category:
    | "LANGUAGE"
    | "FRAMEWORK"
    | "DATABASE"
    | "CLOUD"
    | "TOOL"
    | "LIBRARY"
    | "CONCEPT"
    | "OTHER";

  proficiency?: "BEGINNER" | "INTERMEDIATE" | "ADVANCED";
  evidence: string[];
  yearsOfExperience?: number;
}
```

Example:

```json
{
  "name": "NodeJS",
  "canonicalName": "node.js",
  "category": "FRAMEWORK",
  "evidence": [
    "Built backend APIs using Node.js"
  ]
}
```

---

# 11. Project Schema

```ts
interface Project {
  title: string;

  description: string;

  technologies: string[];

  responsibilities: string[];

  outcomes: string[];

  duration?: {
    start?: string;
    end?: string;
  };

  embeddingId?: string;
}
```

---

# 12. Experience Schema

```ts
interface Experience {
  company: string;

  role: string;

  description: string;

  responsibilities: string[];

  technologies: string[];

  duration: {
    start?: string;
    end?: string;
  };

  months?: number;
}
```

---

# 13. JD Schema

The JD must also become structured.

```ts
interface JobProfile {
  title: string;

  company?: string;

  requiredSkills: Requirement[];

  preferredSkills: Requirement[];

  responsibilities: string[];

  requiredExperience?: ExperienceRequirement;

  educationRequirements?: EducationRequirement[];

  certifications?: string[];

  preferredDomains?: string[];

  constraints: JobConstraint[];

  semanticRequirements: SemanticRequirement[];

  profileVersion: number;
}
```

---

# 14. Requirement Representation

```ts
interface Requirement {
  name: string;

  canonicalName: string;

  category: string;

  importance: "MANDATORY" | "HIGH" | "MEDIUM" | "LOW";

  evidence?: string;

  yearsRequired?: number;
}
```

Example:

```json
{
  "name": "TypeScript",
  "canonicalName": "typescript",
  "category": "LANGUAGE",
  "importance": "MANDATORY"
}
```

---

# 15. Extraction Pipeline

## Resume pipeline

```text
UPLOAD
  ↓
STORE FILE
  ↓
CREATE PROCESSING JOB
  ↓
TEXT EXTRACTION
  ↓
TEXT QUALITY CHECK
  ↓
LLM STRUCTURED EXTRACTION
  ↓
ZOD VALIDATION
  ↓
NORMALIZATION
  ↓
DEDUPLICATION
  ↓
PROFILE VALIDATION
  ↓
MONGODB
  ↓
EMBED FEATURES
  ↓
QDRANT
  ↓
READY
```

---

# 16. Upload Flow

Student:

```text
POST /api/resumes
```

Backend:

1. Authenticate student.
2. Validate file type.
3. Validate size.
4. Create resume document.
5. Upload file to S3.
6. Create processing job.
7. Return:

```json
{
  "resumeId": "...",
  "status": "QUEUED"
}
```

The HTTP request must not wait for LLM extraction.

---

# 17. Document Processing States

Resume:

```text
UPLOADED
QUEUED
EXTRACTING
EXTRACTED
STRUCTURING
VALIDATING
INDEXING
READY
FAILED
```

Every transition should be persisted.

This makes debugging possible.

---

# 18. Text Extraction

The worker downloads the source document from object storage.

For PDF:

```text
PDF
 ↓
pdf parser
 ↓
raw text
```

For DOCX:

```text
DOCX
 ↓
mammoth
 ↓
raw text
```

Perform quality checks:

- text length
- character ratio
- number of extracted lines
- suspiciously empty sections
- OCR indicators

If text is unusable:

```text
FAILED_EXTRACTION
```

Do not send garbage text to the LLM.

---

# 19. LLM Resume Structuring

The prompt must tell the model:

- Extract only information explicitly present.
- Do not invent skills.
- Do not infer proficiency without evidence.
- Preserve evidence snippets.
- Separate projects from work experience.
- Normalize obvious aliases.
- Return schema-conforming JSON.
- Use null/empty arrays when information is unavailable.

The model output should resemble:

```json
{
  "skills": [],
  "experience": [],
  "projects": [],
  "education": [],
  "certifications": [],
  "achievements": []
}
```

Use a versioned prompt:

```text
resume-extraction-v1
```

Never silently change prompts used by historical records.

---

# 20. LLM Hallucination Protection

The LLM must not be trusted blindly.

Implement:

### Rule 1 — Evidence requirement

Every extracted skill should have an evidence snippet.

Bad:

```json
{
  "skill": "AWS",
  "evidence": []
}
```

Good:

```json
{
  "skill": "AWS",
  "evidence": [
    "Deployed application using AWS EC2"
  ]
}
```

### Rule 2 — Evidence verification

The backend checks whether the evidence approximately exists in the source text.

### Rule 3 — No evidence = lower trust

If the claim cannot be grounded:

```text
discard
```

or mark:

```text
needs_review
```

### Rule 4 — Canonical normalization

Map aliases:

```text
NodeJS → node.js
React.js → react
Postgres → postgresql
Mongo → mongodb
```

Maintain a skill alias dictionary.

---

# 21. JD Processing Pipeline

Admin uploads:

```text
JD PDF/DOCX
   ↓
Object storage
   ↓
Queue
   ↓
Text extraction
   ↓
LLM structuring
   ↓
Validation
   ↓
Normalization
   ↓
MongoDB
   ↓
Embeddings
   ↓
Qdrant
   ↓
READY
```

The JD becomes the source of truth for matching.

---

# 22. Matching Architecture

The matching engine should be a deterministic pipeline.

```text
Student Profile
       +
Job Profile
       ↓
Eligibility / Hard Filter
       ↓
Requirement Matching
       ↓
Skill Matching
       ↓
Experience Matching
       ↓
Project Matching
       ↓
Education Matching
       ↓
Semantic Requirement Matching
       ↓
Weighted Score
       ↓
Penalty / Constraint Adjustment
       ↓
Final Score
       ↓
Bucket
       ↓
Confidence
       ↓
Evidence
```

---

# 23. Do We Compare All 500 × JD?

For a university of ~500 students, 500 × 1 JD = 500 comparisons.

This is not computationally large.

Even 20 JDs:

```text
500 × 20 = 10,000 candidate-JD evaluations
```

is manageable.

However, do not make every comparison expensive.

Use a two-stage architecture.

### Stage 1 — Candidate retrieval

Use inexpensive filters/vector retrieval to identify likely candidates.

### Stage 2 — Detailed matching

Run the complete scoring engine only on candidates that pass Stage 1.

Example:

```text
500 students
   ↓
hard eligibility filters
   ↓
320 candidates
   ↓
Qdrant retrieval
   ↓
150 candidates
   ↓
full feature matching
   ↓
150 scored candidates
```

For a small university, even scoring all 500 is acceptable initially. The architecture should nevertheless support candidate filtering.

---

# 24. Hard Filters

Hard filters are deterministic.

Examples:

- graduation year
- degree
- minimum CGPA
- required certification
- work authorization if explicitly relevant
- mandatory experience threshold

Do not use semantic similarity for hard requirements.

Example:

JD:

```text
B.Tech / B.E. required
```

Student:

```text
B.Tech CSE
```

This should be an exact/ontology-based match, not cosine similarity.

---

# 25. Skill Matching

Skill matching should use three layers.

## Layer 1 — Exact canonical match

```text
typescript == typescript
```

Score:

```text
1.0
```

## Layer 2 — Alias match

```text
NodeJS → node.js
```

Score:

```text
1.0
```

## Layer 3 — Semantic match

For less obvious relationships:

```text
REST API development
```

vs

```text
backend API engineering
```

Use embeddings.

But semantic similarity must not automatically mean skill equivalence.

The system should maintain a threshold.

Example:

```text
similarity >= 0.85 → strong semantic match
0.75–0.85          → possible match
< 0.75             → no match
```

These numbers are starting points only. They must be calibrated using evaluation data.

---

# 26. Skill Taxonomy

Create a canonical skill taxonomy.

Example:

```text
Computer Science
├── Programming Languages
│   ├── Python
│   ├── Java
│   ├── C++
│   └── TypeScript
│
├── Frontend
│   ├── React
│   ├── Next.js
│   └── Angular
│
├── Backend
│   ├── Node.js
│   ├── Express
│   └── REST APIs
│
├── Databases
│   ├── MongoDB
│   ├── PostgreSQL
│   └── MySQL
│
└── Cloud
    ├── AWS
    ├── Azure
    └── GCP
```

This taxonomy improves precision dramatically compared with raw semantic search.

---

# 27. Skill Score

For each JD requirement:

```text
skillScore =
    exactMatchScore
    OR aliasMatchScore
    OR semanticMatchScore
```

Example:

JD:

```text
React
```

Student:

```text
React.js
```

Result:

```text
1.0
```

JD:

```text
AWS
```

Student:

```text
No AWS evidence
```

Result:

```text
0.0
```

JD:

```text
Backend API development
```

Student project:

```text
Built REST APIs using Node.js
```

Semantic score may be:

```text
0.87
```

but the final interpretation should also depend on evidence.

---

# 28. Experience Matching

Experience should be evaluated separately.

Example:

JD:

```text
Minimum 1 year backend experience
```

Student:

```text
8 months backend internship
```

Score:

```text
8 / 12 = 0.67
```

but cap/interpret according to requirement semantics.

Do not treat experience as pure text similarity.

Calculate:

```text
experienceMonths
```

from structured dates where possible.

---

# 29. Project Matching

Projects are important for students because many students have little formal employment experience.

For each JD responsibility:

```text
JD responsibility
        ↓
compare against
        ↓
student project descriptions
        ↓
embedding similarity
        ↓
best matching project
        ↓
score + evidence
```

Example:

JD:

```text
Build AI-powered applications.
```

Student project:

```text
Built an RAG chatbot using LLMs and vector search.
```

This can produce a strong semantic match.

---

# 30. Education Matching

Education is mostly deterministic.

Example:

```text
B.Tech Computer Science
```

Student:

```text
B.Tech CSE
```

Match:

```text
1.0
```

If JD says:

```text
Computer Science / IT / related field
```

use a degree/discipline taxonomy.

---

# 31. Overall Score

V1 should use a weighted formula.

Example starting configuration:

```text
Hard Requirements      25%
Skills                 30%
Experience             15%
Projects               15%
Education              10%
Other Evidence          5%
```

Therefore:

```text
finalScore =
    hardRequirementScore * 0.25
  + skillScore            * 0.30
  + experienceScore       * 0.15
  + projectScore          * 0.15
  + educationScore        * 0.10
  + otherScore            * 0.05
```

The exact weights are configuration, not hard-coded business logic.

Store:

```ts
interface ScoringConfig {
  version: string;

  weights: {
    hardRequirements: number;
    skills: number;
    experience: number;
    projects: number;
    education: number;
    other: number;
  };
}
```

Example:

```text
scoring-v1
```

---

# 32. Mandatory Requirement Penalty

A student must not rank highly merely because their overall semantic profile looks good while missing a critical mandatory requirement.

Example:

JD:

```text
Mandatory:
Python
```

Student:

```text
Java
C++
React
Node.js
```

Even if the student has a high semantic score overall, missing mandatory Python should materially reduce the score.

Possible V1 rule:

```text
if mandatoryRequirementMissing:
    finalScore *= mandatoryPenalty
```

Example:

```text
mandatoryPenalty = 0.75
```

For truly disqualifying requirements, use:

```text
eligible = false
```

rather than a penalty.

The distinction must be explicit in the JD schema.

---

# 33. Fit Bucketing

Do not let the LLM decide buckets.

Use deterministic thresholds.

Initial configuration:

```text
BEST_FIT:
    score >= 80

MODERATE_FIT:
    60 <= score < 80

LOW_FIT:
    score < 60
```

These thresholds are placeholders.

They must be calibrated against labeled evaluation data.

The system should support changing thresholds without rewriting code.

---

# 34. Confidence Score

Do NOT define confidence as:

```text
confidence = finalScore
```

These are different concepts.

Example:

```text
Candidate score = 91
Confidence = 94
```

means:

> The candidate appears to be a 91/100 fit and the system has high confidence that this estimate is reliable.

Confidence should depend on evidence quality and model agreement.

---

# 35. Confidence Inputs

Use:

### 1. Extraction quality

Was the resume successfully parsed?

### 2. Evidence coverage

How much of the score is backed by explicit evidence?

### 3. Matching clarity

Are feature matches strong or borderline?

### 4. Missing information

Does the resume omit important information?

### 5. Semantic margin

If top match = 0.88 and second-best = 0.87, confidence should be lower than:

```text
top = 0.91
second = 0.61
```

### 6. Deterministic vs semantic scoring

Exact canonical matches should have higher reliability than ambiguous semantic matches.

---

# 36. Confidence Formula

V1 can use a deterministic confidence model.

Example:

```text
confidence =
    extractionQuality      * 0.20
  + evidenceCoverage       * 0.30
  + matchingClarity        * 0.25
  + informationCompleteness* 0.15
  + deterministicCoverage  * 0.10
```

All components are normalized to 0–100.

Again, this is a starting formula.

Confidence must be evaluated separately from ranking accuracy.

---

# 37. Evidence Object

Every match result should contain evidence.

```ts
interface MatchEvidence {
  category:
    | "SKILL"
    | "EXPERIENCE"
    | "PROJECT"
    | "EDUCATION"
    | "REQUIREMENT";

  requirement: string;

  matchedEvidence?: string;

  sourceType?: "RESUME" | "PROJECT" | "EXPERIENCE";

  score: number;

  reason: string;
}
```

Example:

```json
{
  "category": "SKILL",
  "requirement": "React",
  "matchedEvidence": "Built frontend using React and Next.js",
  "score": 1,
  "reason": "Canonical skill match"
}
```

This makes the product explainable.

---

# 38. Final Match Result

```ts
interface MatchResult {
  matchRunId: string;

  studentId: string;

  jobId: string;

  score: number;

  bucket: "BEST_FIT" | "MODERATE_FIT" | "LOW_FIT";

  confidence: number;

  categoryScores: {
    hardRequirements: number;
    skills: number;
    experience: number;
    projects: number;
    education: number;
    other: number;
  };

  evidence: MatchEvidence[];

  missingRequirements: string[];

  scoringConfigVersion: string;

  modelVersions: {
    extraction: string;
    embedding: string;
  };

  createdAt: Date;
}
```

---

# 39. Qdrant Architecture

Do not create a separate vector database collection for every student or JD.

Use collections by semantic purpose.

Possible V1 collections:

```text
student_features
job_features
```

Each vector point contains metadata.

Example student vector:

```json
{
  "id": "uuid",
  "vector": [...],
  "payload": {
    "studentId": "...",
    "resumeId": "...",
    "featureType": "PROJECT",
    "featureId": "...",
    "canonicalSkills": ["node.js", "mongodb"],
    "text": "Built a real-time study platform..."
  }
}
```

Job vector:

```json
{
  "id": "uuid",
  "payload": {
    "jobId": "...",
    "featureType": "RESPONSIBILITY",
    "text": "Build scalable backend APIs"
  }
}
```

---

# 40. Qdrant Usage

Qdrant is used for **candidate retrieval and semantic matching**, not as the final ranking engine.

For example:

```text
JD responsibility:
"Build scalable backend services"

        ↓ embedding

Qdrant search

        ↓

Student projects / experience
```

Retrieve top-k relevant evidence.

Then deterministic scoring evaluates it.

---

# 41. Avoiding Vector Search Errors

Never assume:

```text
similarity = skill equivalence
```

Embeddings measure semantic proximity.

They do not understand your hiring policy.

Therefore:

```text
Vector similarity
        ↓
candidate semantic evidence
        ↓
rule engine
        ↓
actual score
```

---

# 42. Candidate Retrieval

For each JD, retrieve candidate evidence.

Example:

```text
JD
 ├── skill: React
 ├── skill: Node.js
 ├── responsibility: API development
 └── responsibility: cloud deployment
```

For each requirement:

```text
Qdrant top-k
```

Retrieve relevant student features.

Then aggregate candidate IDs.

Example:

```text
React → 300 students
Node.js → 270
API development → 240
AWS → 90

candidate union → 340 students
```

Run full matching on 340 rather than 500.

For only 500 students, this optimization is optional but architecturally useful.

---

# 43. Precomputation

Do not recompute student embeddings every time an admin uploads a JD.

Student embeddings are generated when:

- resume uploaded
- resume replaced
- profile corrected

JD embeddings are generated when:

- JD uploaded
- JD updated

Matching combines existing vectors.

This is critical.

---

# 44. Multiple JDs

Suppose the admin uploads two JDs:

```text
JD A
JD B
```

Do not rebuild all student profiles.

Student data is already indexed.

Process:

```text
Student profiles
     ↓
existing Qdrant vectors

JD A → embeddings → matching run A
JD B → embeddings → matching run B
```

Only JD-specific work is repeated.

This makes multiple-JD support cheap.

---

# 45. Matching Runs

Every time matching occurs, create a `MatchRun`.

```ts
interface MatchRun {
  _id: string;

  jobId: string;

  status:
    | "QUEUED"
    | "RUNNING"
    | "COMPLETED"
    | "FAILED";

  scoringConfigVersion: string;

  extractionModelVersion: string;

  embeddingModelVersion: string;

  candidateCount: number;

  processedCount: number;

  createdAt: Date;

  completedAt?: Date;
}
```

Never overwrite historical match results blindly.

---

# 46. Re-running Matches

If scoring configuration changes:

```text
scoring-v1
```

to:

```text
scoring-v2
```

create a new match run.

Do not mutate historical scores.

This enables evaluation and reproducibility.

---

# 47. Backend Design

Use a service-oriented application structure.

Example:

```text
/api
  /resumes
  /jobs
  /matches
  /students
  /admin
```

Business logic should not live inside route handlers.

Bad:

```ts
POST handler {
  // 500 lines of matching logic
}
```

Good:

```ts
POST handler
    ↓
resumeService.create()
    ↓
queueService.enqueue()
```

---

# 48. Service Layer

Example:

```text
ResumeService
JobService
StudentService
MatchingService
ExtractionService
EmbeddingService
QdrantService
QueueService
ScoringService
ConfidenceService
```

The route handler should primarily:

1. authenticate
2. authorize
3. validate input
4. call service
5. return response

---

# 49. Repository Layer

Keep MongoDB queries isolated.

Example:

```text
repositories/
    userRepository.ts
    studentRepository.ts
    resumeRepository.ts
    jobRepository.ts
    matchRepository.ts
```

Services should not contain raw MongoDB queries everywhere.

---

# 50. Schemas

Use Zod for:

- API input
- API output where appropriate
- LLM output
- database-facing domain objects

Example:

```ts
const StudentProfileSchema = z.object({
  skills: z.array(SkillSchema),
  projects: z.array(ProjectSchema),
  experience: z.array(ExperienceSchema),
  education: z.array(EducationSchema)
});
```

---

# 51. API Design

## Student

```text
POST   /api/resumes
GET    /api/resumes
GET    /api/resumes/:id
GET    /api/profile
GET    /api/jobs
GET    /api/jobs/:id
GET    /api/matches
```

## Admin

```text
GET    /api/admin/students
GET    /api/admin/students/:id

POST   /api/admin/jobs
GET    /api/admin/jobs
GET    /api/admin/jobs/:id

POST   /api/admin/jobs/:id/match

GET    /api/admin/jobs/:id/results
GET    /api/admin/jobs/:id/results/:studentId

POST   /api/admin/jobs/:id/rematch

GET    /api/admin/matching-runs/:id

POST   /api/admin/jobs/:id/publish-results
POST   /api/admin/jobs/:id/hide-results

GET    /api/admin/skill-taxonomy
POST   /api/admin/skill-taxonomy
PATCH  /api/admin/skill-taxonomy/:id

GET    /api/admin/scoring-configs
POST   /api/admin/scoring-configs
POST   /api/admin/scoring-configs/:id/activate
```

`publish-results` sets `jobs.publishedMatchRunId` to the given (completed)
match run's ID; `hide-results` clears it. `/api/matches` (student-facing)
only returns results for a job whose `publishedMatchRunId` is set and matches
the run the result belongs to. See §113.

---

# 52. API Pagination

Never return all students blindly.

Use:

```text
?page=1
&limit=50
```

Maximum:

```text
limit <= 100
```

For match results:

```text
sort=score
bucket=BEST_FIT
```

---

# 53. Database Collections

Minimum MongoDB collections:

```text
users
students
resumes
studentProfiles
jobs
jobProfiles
processingJobs
matchRuns
matchResults
auditLogs
skillTaxonomy
skillAliases
scoringConfigs
```

**Finalized:** `skillTaxonomy`, `skillAliases`, and `scoringConfigs` are
required, not optional — they are DB-backed and admin-editable (see §113,
§116), not static files. `scoringConfigs` documents are immutable once
referenced by any `matchRun` (create a new version instead of editing one in
place, per §46).

Optional:

```text
promptVersions
```

---

# 54. Resume Versioning

A student may upload multiple resumes.

Do not overwrite the original record.

Example:

```text
student
  ├── resume v1
  ├── resume v2
  └── resume v3
```

One can be marked:

```text
isActive = true
```

Every match references the resume/profile version used.

---

# 55. Data Consistency

When a student uploads a new resume:

```text
old profile
    ↓
new resume processing
    ↓
new profile
    ↓
new embeddings
    ↓
mark new profile active
```

Old match results remain historically valid for their original resume version.

New JDs should use the active profile.

---

# 56. Idempotency

Workers must be idempotent.

If a job runs twice:

```text
resumeId + processingVersion
```

must not create duplicated vectors or inconsistent profiles.

Use deterministic IDs where practical.

Example:

```text
student:{studentId}:resume:{resumeId}:project:{projectId}
```

---

# 57. Retry Strategy

LLM calls and external services can fail.

Use BullMQ retries.

Example:

```text
attempt 1
attempt 2
attempt 3
```

Use exponential backoff.

After final failure:

```text
FAILED
```

and store:

```text
errorCode
errorMessage
lastAttemptAt
```

Do not expose internal errors to students.

---

# 58. Worker Types

Use separate logical jobs.

```text
RESUME_PROCESS
JD_PROCESS
EMBED_STUDENT_PROFILE
EMBED_JOB_PROFILE
MATCH_JOB
```

Possible queue:

```text
document-processing
embedding
matching
```

For V1, one worker process can consume multiple queues if infrastructure simplicity is preferred.

---

# 59. Resume Worker

Pseudo-flow:

```ts
async function processResume(resumeId: string) {
  const resume = await resumeRepository.get(resumeId);

  await updateStatus(resumeId, "EXTRACTING");

  const text = await documentExtractor.extract(resume.file);

  validateTextQuality(text);

  await updateStatus(resumeId, "STRUCTURING");

  const rawProfile = await llmExtractor.extractResume(text);

  const profile = normalizeAndValidateProfile(rawProfile, text);

  await profileRepository.save(profile);

  await updateStatus(resumeId, "INDEXING");

  await embeddingService.indexStudentProfile(profile);

  await updateStatus(resumeId, "READY");
}
```

---

# 60. JD Worker

```ts
async function processJob(jobId: string) {
  const job = await jobRepository.get(jobId);

  const text = await documentExtractor.extract(job.file);

  const rawProfile = await llmExtractor.extractJD(text);

  const profile = normalizeAndValidateJob(rawProfile, text);

  await jobProfileRepository.save(profile);

  await embeddingService.indexJobProfile(profile);

  await jobRepository.markReady(jobId);
}
```

---

# 61. Matching Worker

```ts
async function processMatchRun(matchRunId: string) {
  const run = await matchRepository.getRun(matchRunId);

  const job = await jobRepository.get(run.jobId);

  const candidates =
    await candidateRetrievalService.retrieve(job);

  for (const candidate of candidates) {
    const result =
      await matchingEngine.evaluate(candidate, job);

    await matchRepository.save(result);
  }

  await matchRepository.completeRun(matchRunId);
}
```

---

# 62. Matching Engine Components

```text
MatchingEngine
├── EligibilityEngine
├── SkillMatcher
├── ExperienceMatcher
├── ProjectMatcher
├── EducationMatcher
├── RequirementMatcher
├── ScoreAggregator
├── PenaltyEngine
├── BucketEngine
└── ConfidenceEngine
```

Each component should be independently unit-testable.

---

# 63. Matching Engine Interface

```ts
interface MatchingEngine {
  evaluate(
    student: StudentProfile,
    job: JobProfile
  ): Promise<MatchEvaluation>;
}
```

Result:

```ts
interface MatchEvaluation {
  score: number;
  confidence: number;
  bucket: FitBucket;
  categoryScores: CategoryScores;
  evidence: MatchEvidence[];
  missingRequirements: string[];
}
```

---

# 64. Do Not Use an LLM for Every Match

This is important.

Do not do:

```text
500 students × LLM call
```

for every JD unless there is a very strong reason.

That creates:

- high latency
- high cost
- inconsistent scoring
- difficult reproducibility
- difficult debugging

Use deterministic logic + embeddings.

If an LLM is later introduced as a second-stage judge, it should be optional and evaluated against the deterministic system.

---

# 65. Optional LLM Reranker — NOT V1 Core

Future architecture:

```text
Candidate retrieval
       ↓
deterministic scoring
       ↓
top 50
       ↓
LLM reranker
       ↓
final ranking
```

But do not make this the V1 dependency.

First establish a strong deterministic baseline.

---

# 66. Accuracy Strategy

A claim like "95–100% accuracy" is not technically meaningful without defining the target.

There are multiple metrics:

### Extraction accuracy

Did the system correctly extract:

- skills?
- projects?
- experience?

### Requirement classification accuracy

Did it correctly determine:

```text
met / partially met / missing
```

### Ranking quality

Did the system rank better candidates higher?

Use:

- Precision@K
- Recall@K
- NDCG@K
- MRR where applicable

### Bucket accuracy

Did:

```text
Best / Moderate / Low
```

match expert labels?

### Calibration

Does:

```text
90% confidence
```

actually correspond to approximately 90% reliability?

Track all separately.

---

# 67. Evaluation Dataset

Before claiming high accuracy, create a labeled dataset.

Example:

```text
100 students
20 JDs
```

Potential pair count:

```text
2,000 student-JD pairs
```

Teachers/placement staff label a subset.

Labels:

```text
BEST
MODERATE
LOW
```

Optionally:

```text
NOT_ELIGIBLE
```

This dataset is separate from normal platform operation.

Admins do not have to label candidates while using the product.

---

# 68. Human Labeling Process

Create a separate evaluation workflow.

```text
JD
 +
Student Resume
      ↓
Teacher / placement expert
      ↓
fit label
      ↓
reason
```

This is the ground truth dataset.

Do not make the production admin dashboard depend on teachers continuously labeling candidates.

---

# 69. Train or Not Train?

V1 should NOT start with training a custom ranking model.

Reason:

You initially do not have enough reliable labeled data.

Start with:

```text
structured extraction
+
skill taxonomy
+
deterministic rules
+
embeddings
+
weighted scoring
```

Then collect labeled evaluation data separately.

Once enough labels exist, test a learned ranker against the deterministic baseline.

---

# 70. Future Ranking Model

If enough labeled data exists, experiment with:

- Logistic Regression
- Gradient Boosted Trees
- XGBoost / LightGBM
- LambdaMART
- Learning-to-Rank models

Features could include:

```text
skill coverage
mandatory skill coverage
average skill similarity
project similarity
experience gap
education match
evidence coverage
semantic margin
```

Do not jump directly to a deep neural ranker.

Tabular ranking models can be extremely strong for this kind of structured feature problem.

---

# 71. Learned Ranking Architecture — Future

```text
Student + JD
     ↓
Feature extraction
     ↓
50–100 numerical features
     ↓
Learning-to-Rank model
     ↓
ranking score
```

Potentially:

```text
LambdaMART
```

would be a strong candidate.

But this requires reliable labels.

---

# 72. Why Not Train Before V1?

Because a model cannot learn what "good fit" means without ground truth.

If you invent labels:

```text
embedding similarity > 0.8 = good
```

you are simply teaching the model your own arbitrary heuristic.

First build a transparent baseline.

Then collect:

```text
expert labels
```

Then compare:

```text
baseline
vs
learned ranker
```

---

# 73. Accuracy Improvement Loop

The system should evolve:

```text
V1 deterministic baseline
        ↓
evaluation dataset
        ↓
error analysis
        ↓
taxonomy improvements
        ↓
weight calibration
        ↓
threshold calibration
        ↓
better extraction prompts
        ↓
better embeddings
        ↓
optional learned ranker
```

Do not immediately reach for fine-tuning.

Most early errors will probably come from:

- extraction errors
- missing taxonomy mappings
- poor requirement parsing
- bad weighting
- ambiguous JD interpretation

not from the absence of a sophisticated neural ranker.

---

# 74. Error Analysis

Build an evaluation script.

For every mismatch:

```text
Expected: BEST
Predicted: MODERATE
```

store:

```text
student
JD
predicted score
expected label
category scores
missing requirements
evidence
```

Then determine:

```text
Was the extraction wrong?
Was the requirement wrong?
Was semantic similarity wrong?
Was the weight wrong?
Was the bucket threshold wrong?
```

This is how the system improves scientifically.

---

# 75. Testing Strategy

## Unit tests

Test:

```text
skill normalization
alias resolution
experience calculation
education matching
mandatory requirements
weighted scoring
bucket assignment
confidence calculation
```

Example:

```ts
expect(
  normalizeSkill("NodeJS")
).toBe("node.js");
```

---

# 76. Integration Tests

Test:

```text
upload resume
→ queue
→ worker
→ MongoDB
→ Qdrant
```

And:

```text
upload JD
→ process
→ match
→ results
```

Use test databases.

---

# 77. End-to-End Tests

Critical flows:

### Student

```text
login
→ upload resume
→ processing
→ profile ready
→ dashboard
```

### Admin

```text
login
→ upload JD
→ wait for processing
→ run matching
→ view buckets
→ inspect evidence
```

Use Playwright.

---

# 78. Evaluation Tests

Create fixed benchmark fixtures.

Example:

```text
evaluation/
  resumes/
  jobs/
  labels/
```

Run:

```bash
npm run evaluate
```

Output:

```text
Extraction F1:       94.2%
Skill match accuracy:96.1%
Bucket accuracy:     91.4%
NDCG@20:             0.93
```

Do not merge changes that significantly degrade benchmark metrics without review.

---

# 79. Observability

Track:

```text
resume processing latency
JD processing latency
LLM latency
LLM failure rate
embedding latency
Qdrant latency
matching latency
queue depth
worker failures
```

Use structured logging.

Recommended:

- Pino

Every request/job should have:

```text
requestId
jobId
studentId where permitted
```

Avoid logging full resumes or sensitive data.

---

# 80. Security

Resumes contain personal information.

Minimum requirements:

- authenticated access
- role-based authorization
- signed/private object storage URLs
- encryption in transit
- encryption at rest
- server-side validation
- file size limits
- file type validation
- rate limiting
- audit logs
- least-privilege database access

A student must never be able to request another student's profile by changing an ID.

---

# 81. Authorization Rules

Student:

```text
can read own profile
can upload own resume
can read allowed own match information
```

Admin:

```text
can read student placement data
can create JDs
can run matching
can export results
```

Admin APIs must verify:

```ts
session.user.role === "ADMIN"
```

on the server.

---

# 82. File Security

Do not trust:

```text
filename
MIME type
extension
```

alone.

Validate actual file structure where possible.

Set:

```text
MAX_RESUME_SIZE
MAX_JD_SIZE
```

Example initial limits:

```text
10 MB resume
10 MB JD
```

---

# 83. Rate Limiting

Protect:

```text
resume upload
JD upload
matching run
```

Matching should not be triggerable repeatedly without authorization.

Use Redis-backed rate limiting if necessary.

---

# 84. Admin UX

**Visual style for all UI sections below (84–89 and the Student/Admin dashboards
in §2):** follow the `Design System / Visual Style` guide in `AGENTS.md` §6 — a
black-and-white(ish) grayscale palette with black body text, a clean modern
sans-serif with a clear/comfortable type scale, and color reserved for statuses
(Best Fit / Moderate / Low Fit badges, pass/fail, errors, warnings, links) rather
than decoration. Per `AGENTS.md`, the Frontend Agent proposes and gets sign-off
on each page's structure before building it.

The admin interface should prioritize decision speed.

Main JD page:

```text
┌─────────────────────────────────────────────┐
│ Software Engineer — ABC Corp                │
│                                             │
│ 421 candidates evaluated                    │
│ Results: Hidden from students               │
│                                             │
│ Best Fit       48                           │
│ Moderate       183                          │
│ Low Fit        190                          │
│                                             │
│ [Export CSV] [Re-run Matching] [Publish Results] │
└─────────────────────────────────────────────┘
```

**Finalized (§113):** results are hidden from students by default. Publishing
points the JD's visible results at the currently completed match run;
re-running matching does **not** silently change what students already see —
the admin must explicitly publish the new run to swap it in. This avoids
students seeing a mid-rematch gap or a config change nobody signed off on.

Then:

```text
Search
Bucket filter
Minimum score
Skill filter
Sort
```

---

# 85. Result Table

Columns:

```text
Rank
Student
Score
Confidence
Bucket
Skills
Experience
Projects
Missing requirements
```

Avoid showing a giant explanation in the table.

Keep explanation one click away.

---

# 86. Student Result UX

Student dashboard:

```text
My Resume
    Status: Ready

Skills
    TypeScript
    React
    Node.js
    MongoDB

Applications
────────────────────────
Software Engineer
ABC Corp
Fit: Best Fit
Score: 87
```

Do not expose internal ranking information if the placement-cell policy does not permit it.

**Finalized default (§113):** a student's fit result for a given JD is hidden
until an admin explicitly publishes results for that JD (see §84). Before
publishing, the student's "Applications" section for that JD shows only that
they were evaluated ("Under review"), not a score/bucket/evidence. Make this
configurable per JD via the `jobs.publishedMatchRunId` field, not a single
global flag.

---

# 87. Processing UX

Never make the student stare at a loading screen.

Show:

```text
Resume uploaded ✓
Extracting information ✓
Building profile ✓
Preparing profile ✓
Ready ✓
```

If failed:

```text
We couldn't process this resume.
Please upload a text-readable PDF.
```

Do not show raw LLM errors.

---

# 88. Admin Processing UX

When JD is uploaded:

```text
Uploading ✓
Extracting ✓
Understanding JD ✓
Preparing requirements ✓
Ready to match ✓
```

Then:

```text
[Run Matching]
```

For V1, manually starting the matching run is preferable to silently launching expensive computation.

---

# 89. CSV Export

Admin should be able to export:

```text
student_name
student_id
score
confidence
bucket
skills_score
experience_score
projects_score
education_score
missing_requirements
```

Do not export sensitive internal model prompts.

---

# 90. Configuration

Do not hardcode:

```text
weights
thresholds
embedding model
LLM model
similarity thresholds
mandatory penalties
```

Create configuration.

Example:

```ts
const matchingConfig = {
  version: "matching-v1",

  weights: {
    hardRequirements: 0.25,
    skills: 0.30,
    experience: 0.15,
    projects: 0.15,
    education: 0.10,
    other: 0.05
  },

  buckets: {
    bestFit: 80,
    moderateFit: 60
  },

  semanticThresholds: {
    strong: 0.85,
    possible: 0.75
  }
};
```

---

# 91. Environment Variables

Example:

```text
MONGODB_URI=
QDRANT_URL=
QDRANT_API_KEY=

REDIS_URL=

S3_ENDPOINT=
S3_BUCKET=
S3_ACCESS_KEY=
S3_SECRET_KEY=

LLM_API_KEY=
EMBEDDING_API_KEY=

AUTH_SECRET=
```

Never commit secrets.

---

# 92. Deployment

Recommended V1 deployment:

```text
Vercel
  ↓
Next.js application

AWS / managed object storage
  ↓
S3

MongoDB Atlas
  ↓
MongoDB

Qdrant Cloud
  ↓
Vector database

Redis Cloud / Upstash
  ↓
Queue

Worker
  ↓
Railway / Render / AWS ECS
```

The worker should be separately deployable from Next.js.

Do not depend on serverless request lifetime for long-running document processing.

---

# 93. Development Environment

Do **not** use Docker/Docker Compose for local dependencies. Run local dependencies as native installs or managed cloud dev instances:

```text
MongoDB      → local mongod install, or a free-tier Atlas dev cluster
Redis        → local redis-server install, or a free-tier Upstash/Redis Cloud instance
Qdrant       → local Qdrant binary/install, or a free-tier Qdrant Cloud instance
```

Connection details for whichever option is chosen go in `.env`/`.env.example` (`MONGODB_URI`, `REDIS_URL`, `QDRANT_URL`), so the app code never assumes a specific runtime (containerized or not) is providing them.

This gives the coding agent a reproducible local environment without introducing a container runtime as a project dependency.

---

# 94. Seed Data

**Build this first, alongside Phase 0 / the very first feature — not later.** Every
feature after this point (backend and frontend) is implemented and manually
verified against seeded data, never against empty collections.

Create:

```text
scripts/seed.ts
```

Seed:

- 20–50 fake students
- resumes/profiles
- 3–5 JDs
- skill taxonomy
- scoring config

Do not use real student PII for development.

As new data shapes are introduced by later features (e.g. matching runs, results,
confidence fields), extend `scripts/seed.ts` to cover them rather than leaving new
collections/fields un-seeded.

---

# 95. Build Order (Grouped by Feature Area)

The groupings below ("Phase 0", "Phase 1", ...) are organizational labels for
*related* features — they are **not** units of work to build in one batch. Per
`AGENTS.md`, work moves through the PM → Backend → Frontend → QA pipeline **one
feature at a time**, backend before frontend for that feature, with an explicit
user go-ahead required between each feature before the next one starts. Treat
each bullet/deliverable inside a group as its own feature-sized cycle; section
106's numbered list gives the canonical single-feature breakdown to follow in
order.

## Phase 0 — Foundation

Build:

```text
Next.js
TypeScript
MongoDB
authentication
database layer
basic UI
local development setup (native installs or cloud dev instances — no Docker)
```

Deliverable:

```text
Student/Admin can log in.
```

---

# 96. Phase 1 — Student Resume Pipeline

Build:

```text
resume upload
S3 storage
processing job
Redis/BullMQ
worker
PDF/DOCX extraction
LLM extraction
Zod validation
MongoDB profile
```

Deliverable:

```text
Student uploads resume
→ structured profile appears
```

---

# 97. Phase 2 — Student Dashboard

Build:

```text
profile page
resume status
skills
projects
experience
education
resume history
```

Deliverable:

```text
Student has a usable profile dashboard.
```

---

# 98. Phase 3 — JD Pipeline

Build:

```text
admin JD upload
JD extraction
JD structuring
requirement normalization
JD profile
```

Deliverable:

```text
Admin uploads JD
→ structured job profile appears.
```

---

# 99. Phase 4 — Skill Taxonomy

Build:

```text
canonical skills
aliases
categories
normalization
exact matching
```

Start with a manually curated taxonomy.

Do not attempt to build an enormous ontology.

Focus on skills common in university placements.

---

# 100. Phase 5 — Qdrant

Build:

```text
embedding generation
student feature indexing
JD feature indexing
metadata payloads
search
```

Deliverable:

```text
semantic retrieval works independently.
```

Test Qdrant before integrating it into the full matcher.

---

# 101. Phase 6 — Matching Engine

Implement:

```text
eligibility
skill matching
experience matching
project matching
education matching
requirement matching
weighted score
mandatory penalties
bucket
evidence
```

No LLM ranking.

Deliverable:

```text
Student + JD
→ deterministic match result
```

---

# 102. Phase 7 — Confidence Engine

Implement:

```text
extraction quality
evidence coverage
information completeness
matching clarity
deterministic coverage
confidence
```

Validate confidence against benchmark data.

---

# 103. Phase 8 — Admin Results

Build:

```text
matching run
progress
results
bucket filtering
sorting
student detail
evidence
CSV export
```

Deliverable:

```text
Admin can upload JD and obtain ranked candidates.
```

---

# 104. Phase 9 — Evaluation Harness

Create:

```text
labeled dataset
evaluation runner
metrics
confusion matrix
error analysis
```

Deliverable:

```bash
npm run evaluate
```

produces objective metrics.

---

# 105. Phase 10 — Hardening

Add:

```text
rate limiting
audit logs
retry handling
monitoring
error states
security review
performance tests
E2E tests
```

Then deploy to pilot users.

---

# 106. Recommended Feature Build Order

The coding agent should follow this exact dependency order. Each numbered item
is one **feature** — not a phase to batch — built backend-first then frontend,
per `AGENTS.md`:

```text
1. Project foundation
2. Auth + roles
3. MongoDB models
4. Object storage
5. Resume upload
6. Queue
7. Resume worker
8. LLM extraction
9. Student profile
10. Student dashboard
11. JD upload
12. JD worker
13. Skill taxonomy
14. Embeddings
15. Qdrant
16. Candidate retrieval
17. Matching engine
18. Scoring
19. Bucketing
20. Confidence
21. Match runs
22. Admin dashboard
23. Evidence UI
24. CSV export
25. Evaluation harness
26. Security
27. Observability
28. E2E testing
29. Performance testing
30. Deployment
```

Do not build the ranking model before features 17–25 are working.

**These 30 features are not a batch to execute in one pass, and this list is
feature-wise, not phase-wise** — ignore any phase grouping elsewhere in this
document when sequencing work; this numbered list is the order of record. Build
exactly one numbered feature at a time, backend before frontend for that
feature (per `AGENTS.md`). A feature is only "done" once it has gone through the
full PM → Backend → Frontend → QA pipeline and QA has returned a `PASS` verdict.
After a `PASS`, stop and report to the user — do not start feature *n+1*, and do
not silently fold multiple features into one task, until the user explicitly
gives the go-ahead. If a feature doesn't need one of the four pipeline stages
(e.g. a backend-only feature has no Frontend work), say so explicitly in the
handoff rather than skipping the feature boundary itself.

---

# 107. Definition of Done — V1

V1 is complete when:

### Student

- [ ] Student can authenticate.
- [ ] Student can upload resume.
- [ ] Resume is stored securely.
- [ ] Processing is asynchronous.
- [ ] Resume text is extracted.
- [ ] Structured profile is generated.
- [ ] Profile is validated.
- [ ] Profile is stored.
- [ ] Student can see profile.
- [ ] Student can see JD/application history.

### Admin

- [ ] Admin can authenticate.
- [ ] Admin can upload JD.
- [ ] JD is processed asynchronously.
- [ ] JD becomes structured.
- [ ] Admin can start matching.
- [ ] Matching run shows progress.
- [ ] Candidates are scored.
- [ ] Candidates are bucketed.
- [ ] Confidence is shown.
- [ ] Evidence is shown.
- [ ] Results can be filtered/sorted.
- [ ] Results can be exported.

### Backend

- [ ] Workers are idempotent.
- [ ] Jobs retry.
- [ ] Errors are persisted.
- [ ] MongoDB indexes exist.
- [ ] Qdrant indexes exist.
- [ ] Authentication is enforced.
- [ ] Authorization is enforced.
- [ ] Audit logs exist for admin actions.

### ML/Matching

- [ ] No single resume/JD cosine score is used as final score.
- [ ] Skills are canonicalized.
- [ ] Hard requirements are deterministic.
- [ ] Semantic matching is feature-level.
- [ ] Scores are weighted.
- [ ] Buckets are deterministic.
- [ ] Confidence is separate from score.
- [ ] Evidence is retained.
- [ ] Model/prompt/scoring versions are stored.
- [ ] Evaluation benchmark exists.

---

# 108. Important Engineering Principles

## Principle 1 — Determinism

Same:

```text
student profile
+
JD
+
scoring config
```

should produce the same score.

---

## Principle 2 — Explainability

Every score should be decomposable:

```text
Overall: 87

Skills: 92
Projects: 88
Experience: 76
Education: 100
Requirements: 90
```

---

## Principle 3 — Evidence over claims

Never say:

```text
Student knows AWS
```

unless the resume contains evidence supporting it.

---

## Principle 4 — Separate extraction from matching

LLM:

```text
unstructured → structured
```

Matcher:

```text
structured + structured → score
```

This separation is essential.

---

## Principle 5 — Version everything

Version:

```text
prompt
embedding model
scoring config
skill taxonomy
profile
matching run
```

---

## Principle 6 — Do not prematurely train

A sophisticated ML model with poor labels is worse than a transparent deterministic system with good data.

---

# 109. Future V2 Architecture

After V1 generates enough labeled data:

```text
V1 system
   ↓
expert labels
   ↓
training dataset
   ↓
feature engineering
   ↓
Learning-to-Rank model
   ↓
offline evaluation
   ↓
A/B comparison
   ↓
V2 ranker
```

Potential model:

```text
LambdaMART / LightGBM
```

Input features:

```text
mandatory_skill_coverage
required_skill_coverage
preferred_skill_coverage
average_skill_similarity
best_project_similarity
best_experience_similarity
experience_gap
education_match
evidence_coverage
profile_completeness
semantic_margin
```

The model should learn ranking from expert labels, not replace the extraction pipeline.

---

# 110. Final Reference Architecture

The final V1 system should look like:

```text
                    STUDENT
                       │
                       ▼
                 Resume Upload
                       │
                       ▼
                 Object Storage
                       │
                       ▼
                    Queue
                       │
                       ▼
              Document Processing
                       │
              ┌────────┴────────┐
              │                 │
              ▼                 ▼
         Text Extractor       LLM
              │                 │
              └────────┬────────┘
                       ▼
                Structured Profile
                       │
                ┌──────┴──────┐
                ▼             ▼
             MongoDB        Embeddings
                              │
                              ▼
                           Qdrant


                      ADMIN
                        │
                        ▼
                    JD Upload
                        │
                        ▼
                   Object Storage
                        │
                        ▼
                      Queue
                        │
                        ▼
                  JD Processing
                        │
                        ▼
                 Structured JD
                        │
                        ▼
                    Embeddings
                        │
                        ▼
                     Qdrant
                        │
                        ▼
              Candidate Retrieval
                        │
                        ▼
               Eligibility Engine
                        │
                        ▼
                Feature Matchers
          ┌────────────┼────────────┐
          ▼            ▼            ▼
       Skills      Projects     Experience
          │            │            │
          └────────────┼────────────┘
                       ▼
                 Score Aggregator
                       │
                       ▼
                 Penalty Engine
                       │
                       ▼
                 Confidence Engine
                       │
                       ▼
                 Bucket Engine
                       │
                       ▼
                 Match Results
                       │
                       ▼
                Admin Dashboard
```

---

# 111. Critical Decision Summary

| Decision | V1 Choice |
|---|---|
| Backend | Next.js + TypeScript (single project, not a monorepo — §115) |
| Database | MongoDB |
| Vector DB | Qdrant |
| File storage | S3 |
| Queue | Redis + BullMQ |
| Resume extraction | PDF/DOCX parsers |
| OCR | Only as fallback |
| LLM (dev) | Gemini |
| LLM (prod) | Claude (Anthropic) |
| Embeddings (dev) | Gemini embedding model |
| Embeddings (prod) | OpenAI text-embedding-3 |
| Auth | NextAuth v5 + Credentials + bcrypt (no SSO in V1) |
| Multi-tenancy | Single-tenant (V1) |
| Result visibility | Hidden until admin publishes, per JD (§113) |
| Skill taxonomy / scoring config | DB-backed, admin-editable (§113, §116) |
| Test runner | Jest (unit/integration) |
| Schema validation | Zod |
| Embeddings | One consistent embedding model per environment |
| Matching | Feature-level |
| Skill matching | Taxonomy + exact + alias + semantic |
| Hard requirements | Deterministic |
| Projects | Semantic matching |
| Experience | Structured numeric + semantic evidence |
| Final score | Weighted deterministic formula |
| Buckets | Deterministic thresholds |
| Confidence | Separate evidence-based metric |
| Ranking ML | Not required for V1 |
| Training | Separate evaluation workflow |
| Future ranker | LambdaMART/LightGBM candidate |
| Observability | Structured logs + metrics |
| E2E | Playwright |
| Worker deployment | Separate process |
| Historical reproducibility | Versioned profiles/config/models |

---

# 112. One Final Rule for the Coding Agent

When implementing this document, **do not simplify the matching system into a single embedding similarity calculation**.

The core intellectual property of this product is the structured matching pipeline:

```text
Unstructured Resume
        ↓
Structured Profile
        ↓
Canonicalization
        ↓
Feature Extraction
        ↓
Feature-Level Retrieval
        ↓
Deterministic Requirement Matching
        ↓
Semantic Evidence Matching
        ↓
Weighted Scoring
        ↓
Constraint Penalties
        ↓
Confidence
        ↓
Fit Bucket
        ↓
Explainable Result
```

Build this pipeline cleanly enough that individual components can later be replaced by better models without rewriting the product.

The V1 objective is not to create the most complicated AI system.

The objective is to create a **measurable, explainable, reproducible matching system with a strong baseline**, and then use real labeled data to determine where machine learning actually improves it.

---

# 113. Finalized Domain Model Additions

The original spec (§13, §14) referenced several types without defining them,
and left the result-visibility mechanism unspecified. This section defines
them. These are additive/corrective to §8–§14, §45 — not a redesign.

## 113.1 Missing type definitions

```ts
interface Education {
  degree: string;              // e.g. "B.Tech"
  field: string;                // e.g. "Computer Science"
  institution: string;
  startYear?: number;
  endYear?: number;
  cgpa?: number;
  evidence: string[];
}

interface Certification {
  name: string;
  issuer?: string;
  issuedDate?: string;
  evidence: string[];
}

interface Achievement {
  title: string;
  description?: string;
  evidence: string[];
}

interface EducationRequirement {
  degree: string[];             // acceptable degrees, e.g. ["B.Tech", "B.E."]
  field?: string[];              // acceptable fields/disciplines; empty = any
  minCgpa?: number;
  disqualifying: boolean;        // true = ineligible if unmet, per §32
}

interface ExperienceRequirement {
  minMonths: number;
  domain?: string;                // e.g. "backend", "data"
  disqualifying: boolean;
}

interface JobConstraint {
  name: string;                   // e.g. "Minimum CGPA 7.0", "Graduation year 2026"
  type: "GRADUATION_YEAR" | "CGPA" | "DEGREE" | "CERTIFICATION" | "OTHER";
  value: string | number;
  disqualifying: boolean;          // true → eligible = false (§32); false → penalty applies
}

interface SemanticRequirement {
  description: string;             // free-text responsibility/requirement, e.g.
                                    // "Build AI-powered applications"
  importance: "HIGH" | "MEDIUM" | "LOW";
  canonicalSkillHints?: string[];   // optional canonical skills this maps to,
                                     // to bias retrieval (§42) without hardcoding a match
}
```

**Rule (extends §32):** `JobConstraint.disqualifying` and
`EducationRequirement.disqualifying` / `ExperienceRequirement.disqualifying`
are the explicit, schema-level distinction between "penalty" and "ineligible"
that §32 requires. The matching engine must read this field, never infer
disqualification from importance level or wording.

## 113.2 Result visibility (extends §45, §51, §86)

```ts
interface Job {
  // ...existing fields...
  publishedMatchRunId: string | null; // null = results hidden from students
  publishedAt: Date | null;
}
```

- Default on JD creation: `publishedMatchRunId: null` (hidden).
- `POST /api/admin/jobs/:id/publish-results` sets `publishedMatchRunId` to a
  specific **completed** `matchRun._id` and stamps `publishedAt`.
- `POST /api/admin/jobs/:id/hide-results` sets it back to `null`.
- Re-running matching (`POST /api/admin/jobs/:id/rematch`) does **not**
  change `publishedMatchRunId` — students keep seeing the last published run
  until an admin explicitly publishes the new one. This prevents a gap where
  students briefly see nothing during a rematch, and prevents an unreviewed
  rematch from silently becoming visible.
- Student-facing `GET /api/matches` only returns a result if
  `result.matchRunId === job.publishedMatchRunId` for that job.

## 113.3 Skill taxonomy & scoring config (extends §26, §53, §90)

```ts
interface SkillTaxonomyEntry {
  _id: string;
  canonicalName: string;             // e.g. "node.js"
  displayName: string;               // e.g. "Node.js"
  category: Skill["category"];
  aliases: string[];                 // e.g. ["nodejs", "node"]
  isActive: boolean;                 // soft-delete; never hard-delete a
                                       // canonical skill referenced by
                                       // historical profiles
  createdBy: string;                  // admin userId
  createdAt: Date;
  updatedAt: Date;
}

interface ScoringConfig {
  _id: string;
  version: string;                    // e.g. "scoring-v2"
  isActive: boolean;                   // exactly one active config at a time
  weights: {
    hardRequirements: number;
    skills: number;
    experience: number;
    projects: number;
    education: number;
    other: number;
  };
  buckets: { bestFit: number; moderateFit: number };
  semanticThresholds: { strong: number; possible: number };
  mandatoryPenalty: number;
  createdBy: string;
  createdAt: Date;
}
```

**Rule (extends §46):** a `ScoringConfig` document is immutable once any
`matchRun` references its `version`. "Editing" weights in the admin UI always
creates a new `ScoringConfig` document and, if activated, flips
`isActive` on the previous one to `false` — it never mutates a version in
place. This is what makes historical match results reproducible per §46/§108
Principle 5 even though config is now DB-backed instead of a static file.

---

# 114. Evidence Verification Algorithm (extends §20 Rule 2)

§20 Rule 2 requires checking whether an LLM-claimed evidence snippet
"approximately exists" in the source resume/JD text, without specifying how.
V1 uses a three-step deterministic check, cheapest first:

```text
1. Normalize both the claimed evidence snippet and the source text:
   lowercase, collapse whitespace, strip punctuation.

2. Exact substring containment:
   normalized(evidence) is a substring of normalized(sourceText)
   -> verified = true, confidence contribution = 1.0

3. If not contained, token-overlap fallback:
   tokens(evidence) vs tokens(best-matching sliding window of sourceText)
   Jaccard similarity >= 0.6
   -> verified = true, confidence contribution = 0.7

4. Otherwise:
   verified = false -> mark the skill/claim "needs_review" (§20 Rule 3);
   do not discard outright -- surface it to the admin rather than silently
   dropping potentially-real information the LLM paraphrased.
```

This runs once per extracted skill/experience/project claim during
`STRUCTURING`/`VALIDATING` (§17), before the profile is persisted. The
per-claim `verified` boolean and method (`EXACT` | `FUZZY` | `UNVERIFIED`)
feed directly into the Confidence Engine's `evidenceCoverage` input (§35, §36)
-- do not recompute verification separately at matching time.

---

# 115. Repository Structure — Finalized

§7 sketched a `apps/`+`packages/`+`workers/` turborepo layout, with a fallback
of "keep the same logical separation inside one Next.js project." **The
fallback is what Prism actually uses** — the repo was initialized as a single
Next.js project (`app/` at the root), and there's no scale/team-size reason
to introduce turborepo overhead for a single-tenant, single-app product.

**See `docs/BACKEND_ARCHITECTURE.md` for the authoritative, file-level version
of this tree** (every file under `lib/`, `app/api/`, `workers/`), plus
repository/service method signatures, the matching engine's exact algorithms,
worker pipeline pseudocode, and API contracts. The summary tree below is kept
for a quick top-level overview only — `docs/BACKEND_ARCHITECTURE.md` is what
Backend should actually build from.

```text
prism/
├── app/                       # Next.js App Router
│   ├── (auth)/                # sign-in/sign-up pages
│   ├── student/                # student dashboard pages
│   ├── admin/                  # admin dashboard pages
│   └── api/                    # Route Handlers (thin — see §47/§48)
│
├── lib/
│   ├── db/                     # MongoDB client + repositories (§49)
│   ├── schemas/                 # Zod schemas, shared TS types (§9-§14, §113)
│   ├── services/                 # ResumeService, JobService, MatchingService,
│   │                              #   ScoringService, ConfidenceService, etc. (§48)
│   ├── matching/                  # EligibilityEngine, SkillMatcher,
│   │                                #   ExperienceMatcher, ProjectMatcher,
│   │                                #   EducationMatcher, ScoreAggregator,
│   │                                #   PenaltyEngine, BucketEngine,
│   │                                #   ConfidenceEngine (§62)
│   ├── extraction/                  # ExtractionProvider interface +
│   │                                  #   GeminiExtractionProvider,
│   │                                  #   ClaudeExtractionProvider (§5.7)
│   ├── embeddings/                   # EmbeddingProvider interface +
│   │                                   #   GeminiEmbeddingProvider,
│   │                                   #   OpenAIEmbeddingProvider (§5.7)
│   ├── qdrant/                        # Qdrant client + collection helpers
│   ├── queue/                          # BullMQ setup, job definitions (§58)
│   ├── auth/                           # NextAuth v5 config, session helpers
│   └── config/                          # env loading, matchingConfig (§90)
│
├── workers/                              # separately-run Node process(es),
│                                           #   not serverless (§92)
│   ├── document-worker.ts
│   └── matching-worker.ts
│
├── scripts/
│   └── seed.ts
│
├── tests/
│   ├── unit/
│   ├── integration/
│   └── evaluation/                        # §67, §78 fixtures + npm run evaluate
│
├── docs/
│   └── agent-artifacts/<task-id>/         # spec.md, backend-handoff.md,
│                                            #   frontend-handoff.md, qa-report.md
│
├── package.json
├── tsconfig.json
└── buildPlan.md
```

`lib/*` modules are plain TypeScript with no Next.js dependency, so
`workers/*` can import them directly without booting the Next.js runtime.

---

# 116. Skill Taxonomy & Scoring Config Admin UI — Feature Addendum

§99 originally framed the skill taxonomy as "start with a manually curated
taxonomy" (implying a static file). §113.3 finalizes both taxonomy and
scoring config as DB-backed and admin-editable. This section is the
feature-level addendum PM should expand into a full `spec.md` when this
feature is reached in the build order (§117).

**Skill Taxonomy admin page:**
- Table of canonical skills: name, category, aliases, active/inactive, usage
  count (how many profiles/JDs reference it).
- Create/edit a skill: name, category, aliases (add/remove).
- Deactivate (soft-delete) a skill — never hard-delete one referenced by any
  existing `StudentProfile` or `JobProfile`, since that would corrupt
  historical evidence trails.
- Seed data (§94) still ships an initial taxonomy via `scripts/seed.ts`; the
  admin UI is for maintaining it afterward, not a replacement for seeding.

**Scoring Config admin page:**
- Shows the currently active config (weights, bucket thresholds, semantic
  thresholds, mandatory penalty) and a history list of prior versions.
- "Create new version" form, pre-filled from the active config, validated so
  weights sum to 1.0 (±rounding tolerance) before saving.
- "Activate" on a draft/prior version — flips `isActive`, does not delete or
  mutate the previously active one (§113.3).
- Activating a new config does **not** retroactively change historical
  `matchResult` documents or trigger a rematch — it only affects match runs
  started after activation (§46).

Both pages are ADMIN-only, follow the grayscale design system (§6 in
`AGENTS.md`), and are out of scope for the Student role entirely.

---

# 117. Feature Build Order — Finalized Additions

§106's numbered 1–30 list stands as the base dependency order and is **not
renumbered here** (it's cross-referenced elsewhere by number). Three features
are inserted into that order to cover what §113–§116 finalized. Build them
where noted, each as its own PM → Backend → Frontend → QA cycle per
`AGENTS.md`:

```text
...
17. Matching engine
18. Scoring
19. Bucketing
20. Confidence
21. Match runs
22. Admin dashboard
22a. Publish/hide match results          <- NEW, insert here
22b. Skill Taxonomy admin UI              <- NEW, insert here
22c. Scoring Config admin UI               <- NEW, insert here
23. Evidence UI
24. CSV export
25. Evaluation harness
...
```

Rationale for placement: 22a–22c depend on the Admin dashboard shell (#22)
existing, and on `scoringConfigs`/`skillTaxonomy` already being seeded
(§94) and consumed by the matching engine (#17-#20) — building the
*editing* UI before the engine can *read* those collections would be
building ahead of what's testable. #22a (publish/hide) also gates what the
Student dashboard (#10) can legitimately show once match results exist, so
QA for #22a should explicitly re-verify the Student-side "hidden by default"
behavior from §86/§113.2, not just the admin toggle itself.

---

# 118. V1 Decision Log

Decisions made resolving ambiguities/conflicts between this document and the
initial repo scaffold, and open questions the original spec left unresolved.
Dated 2026-09-04.

| # | Question | Decision | Reason |
|---|---|---|---|
| 1 | `buildPlan.md` mandates Qdrant; `package.json` had Pinecone installed | **Qdrant** | Follow the written spec; Pinecone SDK to be removed from `package.json` when object storage/embeddings features are built |
| 2 | Auth: NextAuth+Credentials vs WorkOS | **NextAuth v5 + Credentials + bcrypt** | Already installed, zero external vendor, no real SSO requirement exists yet (§5.6) |
| 3 | LLM/embeddings provider, dev vs prod | **Dev: Gemini (both). Prod: Claude (extraction) + OpenAI (embeddings)** | Gemini already installed for dev; Anthropic has no embeddings API so OpenAI covers that gap in prod (§5.7) |
| 4 | Single-tenant vs multi-tenant | **Single-tenant** | Matches every schema in the doc as written; multi-tenancy is the most expensive thing to retrofit, not needed for the actual use case (one placement cell, ~500 students) |
| 5 | Student result visibility default | **Hidden until admin publishes, per JD** | §86's "make visibility configurable" was unspecified on granularity/owner; admin-controlled per-JD publish avoids a global on/off that doesn't match real placement-cell workflow (§113.2) |
| 6 | Skill taxonomy & scoring config: static files vs DB+admin UI | **DB-backed, admin-editable** | Enables the placement cell to tune weights/taxonomy without a code deploy; adds real scope (new admin pages, §116) but was explicitly requested over the static-file default |
| 7 | Test runner | **Jest** (unit/integration) + Playwright (E2E, already specified in §77) | Explicit choice over the recommended Vitest default |
| 8 | Repo layout: turborepo vs single Next.js project | **Single Next.js project** (§115) | Matches what's already scaffolded (`app/` at repo root); no team-size/scale justification for monorepo overhead at V1 |

Undefined types from the original spec, now defined: `Education`,
`Certification`, `Achievement`, `EducationRequirement`,
`ExperienceRequirement`, `JobConstraint`, `SemanticRequirement` (§113.1).
Evidence-verification mechanism (§20 Rule 2), now concretely specified
(§114).
