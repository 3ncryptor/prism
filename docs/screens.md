# Prism — Screens & UI Rebuild Plan

Companion to `buildPlan.md` §119. This is the detailed screen-by-screen design
for the product/UI fix batch (features 27a-27g), written before any of that
code is built, per AGENTS.md's "propose structure, get sign-off" rule — this
document *is* that proposal, expanded to cover the whole batch at once since
the screens depend on each other (nav can't be designed one screen at a time).

Confirmed constraint carried through every screen below: **matching only ever
runs when an admin clicks "Run Matching" for that specific JD** — nothing here
introduces an auto-trigger.

---

## 1. Component inventory

**Already in use** (keep using): `NSTypography`, `NSButton`, `NSPill`,
`NSChip`, `NSTextField`, `NSAlert`.

**Available in Grauity but unused so far — adopt where it fits:**
| Component | Where it replaces something worse |
|---|---|
| `Table` | Every hand-rolled `<table>` (results, skill taxonomy, job roles, scoring versions, resumes list) |
| `Tabs` / `TabList` | Bucket filter on the leaderboard (Best Fit / Moderate / Low / All) |
| `Pagination` | Admin Jobs list ("100s of JDs"), and the leaderboard's "view all" beyond top-N |
| `Modal` | View Resume (PDF), confirm-deactivate dialogs |
| `DropdownMenu` (or `Chip`+search) | Replaces the native `<select>` currently used for skill category; also the base for the job-role picker — see §3 item 1 for why it's tag-styled but still single-value and select-only |
| `Accordion` | Alternative to the current manual expand/collapse state in `ResultTable`/`ApplicationsSection` for evidence — optional, only if it reduces code |

**New shared primitives to build** (none exist today — every page currently
reimplements its own header, which is the root cause of "feels bolted on"):
- `AppShell` — generic shell: fixed sidebar + top bar + content slot. `AdminLayout` and `StudentLayout` are both thin configs of this, not separate implementations.
- `Sidebar` / `SidebarNavItem` — link list, active-state highlighting.
- `TopBar` — identity (name · email) + sign-out, one instance per shell.
- `PageHeader` — title + optional right-aligned action buttons row (replaces the repeated `<NSTypography variant="heading-sb-h2">` + button row pattern on every current dashboard).
- `Card` — `rounded-lg border border-gray-200 p-6` wrapper, currently copy-pasted with minor variations on every page.
- `BucketPill` — `{BEST_FIT/MODERATE_FIT/LOW_FIT} → color+label`. This exact map is **already duplicated** in `ResultTable.tsx` and `ApplicationsSection.tsx` today — consolidate into one component instead of a third copy.
- `EmptyState` — icon/text for "no jobs yet," "no resumes yet," "no applications yet."

---

## 2. Navigation structure

**Admin sidebar** (`AdminLayout`):
```
Jobs
Job Roles
Skill Taxonomy
Scoring Config
```

**Student sidebar** (`StudentLayout`):
```
Dashboard
Resumes
Applications
Profile
```
"Resumes" and "Profile" don't exist yet — built in 27d/27f below. There is
**no student-facing "Jobs" browse screen** — see decision #14 in
`buildPlan.md` §119.1: role-based resume routing replaced the Apply flow, so
students never need to see a job list at all; routing happens invisibly based
on the role tag on their resume.

---

## 3. Key decisions this design assumes (flag now if wrong)

1. **Multi-resume, routed by job role, not broadcast.** A student can have N
   resumes, each independently labeled ("Data Science Resume", "Software Dev
   Resume") and optionally tagged with a **job role** from a small
   admin-managed taxonomy (or left untagged = global/generic). Upload always
   auto-extracts (as today). Once `READY`, the student toggles **Publish for
   matching** on it — any number can be published at once, **except** two
   published resumes can never share the same role tag (see item 2). The
   role field is a **tag-styled, select-only autocomplete** — it looks like
   a chip picker but only lets you choose an existing canonical role from
   the taxonomy; it never lets you type a new one into existence (that's
   exactly how case/spelling variants would fragment the taxonomy). New
   roles are only ever created via the admin's Job Roles page (4.11).
2. **Selection, not multiplication.** For a given job (which has exactly one
   `jobRole`), each student is evaluated using: their published resume
   tagged with that role → **else** their published untagged/global resume →
   **else** they're skipped for that job entirely. Never both. A student
   therefore appears **at most once** on any job's leaderboard, and the row
   shows which resume was used. Enforcing this requires a uniqueness rule at
   publish time: attempting to publish a second resume tagged with a role
   that's already published (for that student) is rejected with a clear
   error — "You already have a published resume for Data Science. Unpublish
   it first." — not a silent overwrite.
3. **No Apply flow, no student-facing job list.** Routing is automatic and
   invisible to the student — they tag resumes by role once, and every
   future matching run for a job of that role uses the right one
   automatically.
4. **Jobs have an admin-facing Draft/Live status**, separate from both the
   processing pipeline status and the results Publish/Hide status. Naming is
   deliberately "Draft/Live" (not "Published") to avoid colliding with
   "Results: Published/Hidden" in the same UI. A JD defaults to Draft once
   parsing finishes; **Run Matching is disabled until the admin flips it to
   Live**, which is meant to happen after reviewing the parsed JD profile.
5. **Leaderboard top-N is admin-configurable per job**, stored on the `Job`
   document (new `leaderboardSize` field, default 10).
6. **"View Resume" opens the original file**, not the parsed profile — wires
   up the already-built-but-unused `getPresignedDownloadUrl()`.

---

## 4. Screens

### 4.1 Landing (`/`) — feature 27b

```
┌──────────────────────────────────────────────────────────┐
│  Prism                                          [Sign in] │
├──────────────────────────────────────────────────────────┤
│                                                            │
│              Match every resume to every role.            │
│         AI-assisted placement matching for campus          │
│                    placement cells.                        │
│                                                            │
│                     [ Sign in to continue ]                │
│                                                            │
│   ── How it works ──                                       │
│   1. Students upload resumes                                │
│   2. Admins post job descriptions                           │
│   3. Prism scores every candidate, evidence-backed           │
│                                                            │
└──────────────────────────────────────────────────────────┘
```
Static, no data. Light background, grayscale + one accent for the CTA button
per AGENTS.md §6. Components: `NSTypography`, `NSButton`.

### 4.2 Sign in (`/sign-in`) — feature 27b

```
┌──────────────────────────────────────────────────────────┐
│                         Prism                              │
│                                                            │
│                 ┌─────────────────────────┐                │
│                 │   Sign in                │                │
│                 │                          │                │
│                 │   Email                  │                │
│                 │   [______________]       │                │
│                 │   Password               │                │
│                 │   [______________]       │                │
│                 │                          │                │
│                 │   [     Sign in     ]    │                │
│                 │                          │                │
│                 │   Forgot password?        │                │
│                 └─────────────────────────┘                │
└──────────────────────────────────────────────────────────┘
```
Centered card on the same light background as the landing page (currently a
plain dark unstyled form). "Forgot password?" link is added now (points to
27g's screen once that ships; hidden/disabled until then). Components:
`NSTypography`, `NSTextField`, `NSButton`, `NSAlert` (bad-credentials error).

### 4.3 Forgot password request (`/forgot-password`) — feature 27g

```
┌─────────────────────────────┐
│   Reset your password        │
│                              │
│   Email                      │
│   [______________]           │
│                              │
│   [   Send reset link   ]    │
│                              │
│   Back to sign in            │
└─────────────────────────────┘
```
Submits → always shows "If that email exists, a reset link was sent" (never
reveals whether the email is registered). Components: `NSTextField`,
`NSButton`, `NSTypography`.

### 4.4 Reset password (`/reset-password?token=...`) — feature 27g

```
┌─────────────────────────────┐
│   Set a new password         │
│                              │
│   New password               │
│   [______________]           │
│   Confirm password           │
│   [______________]           │
│                              │
│   [   Reset password   ]     │
└─────────────────────────────┘
```
Invalid/expired token → `NSAlert` error with a link back to 4.3. Components:
same as above.

---

### 4.5 Student Dashboard (`/student`) — feature 27a (retrofit only)

```
┌───────────────┬────────────────────────────────────────────┐
│ Prism          │  Student Three · student3@prism.dev  [Sign out]
│               ├────────────────────────────────────────────┤
│ ● Dashboard    │  Welcome back, Student Three                │
│   Resumes      │                                             │
│   Applications │  ┌─ Resume status ──────────────────────┐   │
│   Profile      │  │  Data Science Resume — READY, Published│  │
│               │  │  [ Manage resumes → ]                  │  │
│               │  └────────────────────────────────────────┘  │
│               │                                             │
│               │  ┌─ Recent applications ─────────────────┐   │
│               │  │  ML Engineer @ DataCorp — Best Fit 90.9│   │
│               │  │  [ View all applications → ]           │   │
│               │  └────────────────────────────────────────┘  │
└───────────────┴────────────────────────────────────────────┘
```
No new data fetching beyond what exists — this becomes a lighter *summary*
page once Resumes/Applications get their own full screens (today's dashboard
shows the full profile inline; that detail moves to 4.6). Components: new
`Card`, `PageHeader`, existing `NSTypography`/`NSButton`.

### 4.6 Student Resumes (`/student/resumes`) — feature 27d, NEW screen

```
┌───────────────┬────────────────────────────────────────────┐
│ Prism          │  Student Three                     [Sign out]
│               ├────────────────────────────────────────────┤
│   Dashboard    │  Resumes                    [ Upload new resume ]
│ ● Resumes      │                                             │
│   Applications │  ┌────────────────────────────────────────┐ │
│   Profile      │  │ Data Science Resume    Role: Data Science│
│               │  │ READY · Published for matching  [● ON]   │
│               │  │ [ View parsed profile ]  [ View file ]    │
│               │  ├────────────────────────────────────────┤ │
│               │  │ Software Dev Resume    Role: Software Dev│
│               │  │ READY · Published for matching  [○ OFF]  │
│               │  │ [ View parsed profile ]  [ View file ]    │
│               │  ├────────────────────────────────────────┤ │
│               │  │ General Resume         Role: (none/global)│
│               │  │ PROCESSING…                               │
│               │  │ (publish toggle disabled until READY)     │
│               │  └────────────────────────────────────────┘ │
└───────────────┴────────────────────────────────────────────┘
```
Upload form asks for a **label** (free text, e.g. "Data Science Resume") and
an optional **job role** (dropdown from the job-role taxonomy; "No specific
role — general resume" is a valid, explicit choice, not just leaving it
blank by accident). "View parsed profile" expands inline or opens a `Modal`
showing the skills/projects/experience/education view the old dashboard used
to show directly. "View file" opens the presigned original PDF/DOCX in a new
tab. Upload always *adds* a new resume — never replaces an existing one.
Components: `Table` or repeated `Card`s, toggle switch, `DropdownMenu` (role
picker), `Modal`.

**Schema changes this needs** (flag for Backend spec of 27d):
- `Resume` gains `label: string` and `jobRole: string | null` (`null` = global/generic), both set at upload time.
- Upload no longer calls `deactivateAllForStudent` — multiple `Resume`/`StudentProfile` docs coexist per student.
- `StudentProfile.isActive` is repurposed from "the one active profile" to "published for matching" — many can be `true` simultaneously, one per resume.

### 4.7 Student Applications (`/student/applications`) — feature 27a (retrofit of existing `ApplicationsSection`)

```
┌───────────────┬────────────────────────────────────────────┐
│ Prism          │  Student Three                     [Sign out]
│               ├────────────────────────────────────────────┤
│   Dashboard    │  Applications                              │
│   Resumes      │                                             │
│ ● Applications │  ┌────────────────────────────────────────┐ │
│   Profile      │  │ ML Engineer @ DataCorp                    │
│               │  │ Data Science Resume — Score 90.9  Best Fit│
│               │  │ [ View evidence ]                          │
│               │  ├────────────────────────────────────────┤ │
│               │  │ Frontend Developer @ WebCo                 │
│               │  │ Under review                               │
│               │  └────────────────────────────────────────┘ │
└───────────────┴────────────────────────────────────────────┘
```
Same logic as today's `ApplicationsSection`, promoted to its own page, now
labeling which resume produced the result (from the routing in 27e, not an
apply action). No schema change beyond what 27d/27e already add.

### 4.8 Student Profile (`/student/profile`) — feature 27f, NEW screen

```
┌───────────────┬────────────────────────────────────────────┐
│ Prism          │  Student Three                     [Sign out]
│               ├────────────────────────────────────────────┤
│   Dashboard    │  Profile                                    │
│   Resumes      │                                             │
│   Applications │  ┌─ Account ──────────────────────────────┐ │
│ ● Profile      │  │ Name   [Student Three_______]            │
│               │  │ Email  student3@prism.dev (read-only)    │
│               │  │ [ Change password ]                       │
│               │  └────────────────────────────────────────┘  │
│               │  ┌─ Academic ─────────────────────────────┐  │
│               │  │ Roll number [___________]                │
│               │  │ Branch      [___________]                │
│               │  │ Batch year  [___________]                │
│               │  └────────────────────────────────────────┘  │
│               │  ┌─ Contact & links ──────────────────────┐  │
│               │  │ Phone     [___________]                  │
│               │  │ LinkedIn  [___________]                  │
│               │  │ GitHub    [___________]                  │
│               │  │ Portfolio [___________]                  │
│               │  │              [ Save changes ]             │
│               │  └────────────────────────────────────────┘  │
└───────────────┴────────────────────────────────────────────┘
```
Components: `Card` ×3, `NSTextField`, `NSButton`, `NSAlert` (save
success/error).

**Schema changes this needs**: `User` gains optional
`phone, linkedinUrl, githubUrl, portfolioUrl, rollNumber, branch, batchYear`
fields (all `nullish()` — none of this exists on `userSchema` today, which
currently only has `email/name/role/passwordHash`).

---

### 4.9 Admin Jobs list (`/admin`) — feature 27a (retrofit) + 27c (search/filter/paginate/Draft-Live)

```
┌───────────────┬────────────────────────────────────────────┐
│ Prism          │  Admin · admin@prism.dev          [Sign out]│
│               ├────────────────────────────────────────────┤
│ ● Jobs         │  Jobs                        [ Upload JD ]  │
│   Job Roles    │  [ Search title/company... ] [Status ▾] [Draft/Live ▾]
│   Skill Tax.   │                                             │
│   Scoring Cfg. │  ┌────────────────────────────────────────┐ │
│               │  │ Machine Learning Engineer — DataCorp     │
│               │  │ Role: Data Science · READY · Live         │
│               │  ├────────────────────────────────────────┤ │
│               │  │ Frontend Developer — WebCo                │
│               │  │ Role: Software Dev · READY · Draft         │
│               │  └────────────────────────────────────────┘ │
│               │              ◂ 1  2  3 ▸  (Pagination)        │
└───────────────┴────────────────────────────────────────────┘
```
Components: `PageHeader`, `NSTextField` (search, debounced), `DropdownMenu`
×2 (processing-status filter, Draft/Live filter), `Table`, `Pagination`.

**Backend change this needs**: `GET /api/admin/jobs` gains `q`,
`processingStatus`, `listingStatus`, `page`/`limit` params; `jobRepository.list()`
currently fetches everything unbounded — needs a paginated variant. JD upload
form gains a required **Job Role** dropdown (populated from the taxonomy).

### 4.10 Admin Job Detail (`/admin/jobs/[id]`) — feature 27a (retrofit) + 27c (Draft/Live, parsed profile, leaderboard, CV review)

```
┌───────────────┬────────────────────────────────────────────┐
│ Prism          │  Admin · admin@prism.dev          [Sign out]│
│               ├────────────────────────────────────────────┤
│ ● Jobs         │  Machine Learning Engineer — DataCorp        │
│   Job Roles    │  Role: Data Science                          │
│   Skill Tax.   │  Listing: [ Draft ] → [ Make Live ]           │
│   Scoring Cfg. │  Best Fit 1   Moderate 0   Low Fit 2         │
│               │  Results: Published to students              │
│               │                                             │
│               │  [ Parsed JD Profile ▾ ]  ← expandable section│
│               │  │ Required skills: Python, Django, ML         │
│               │  │ Preferred skills: SQL                        │
│               │  │ Experience: 3+ months, domain "machine learning"│
│               │  │ Education: B.Tech/B.E., Computer Science, CGPA ≥6│
│               │  │ Responsibilities: (none extracted)           │
│               │                                             │
│               │  [Run Matching] (disabled until Live)         │
│               │  [Publish/Hide Results] [Export CSV]          │
│               │  Show top [ 10 ▾]                              │
│               │                                             │
│               │  [ Best Fit | Moderate | Low Fit | All ] ← Tabs│
│               │                                             │
│               │  ┌────────────────────────────────────────┐ │
│               │  │# Student            Resume used    Score │
│               │  │1 Student Three   Data Science Res.  90.9 │
│               │  │  [View evidence] [View resume file]       │
│               │  ├────────────────────────────────────────┤ │
│               │  │2 Student Two     General Resume     61.2  │
│               │  │  [View evidence] [View resume file]       │
│               │  └────────────────────────────────────────┘ │
│               │              [ Show all 24 candidates ]      │
└───────────────┴────────────────────────────────────────────┘
```
"Parsed JD Profile" renders the actual `JobProfile` extraction — this is new;
nothing today shows an admin the structured requirements at all. "Listing:
Draft → Make Live" is a one-way-by-default toggle (can be reverted to Draft,
which also disables Run Matching again). "Resume used" replaces the old
"Missing requirements" column position — missing requirements move into the
evidence expand, consistent with how evidence already works today. "Show top
[N ▾]" is the admin-configurable leaderboard size, saved to the job. Tabs use
Grauity's `Tabs`/`TabList`. "View resume file" wires up
`getPresignedDownloadUrl()` — opens the original PDF in a new tab.

**Open call carried over, still undecided**: keep evidence as today's inline
expandable row, or promote to a `Modal` now that there's more on this page
competing for space. Default: keep the inline row unless told otherwise.

**Backend changes this needs**:
- `Job` gains `jobRole: string`, `listingStatus: "DRAFT" | "LIVE"` (default `DRAFT`), `leaderboardSize: number` (default 10).
- `POST /api/admin/jobs/:id/match` (Run Matching) now rejects with 409 if `listingStatus !== "LIVE"`.
- New `POST /api/admin/jobs/:id/listing-status` route (Draft ↔ Live).
- `GET /api/admin/jobs/:id/results` gains a `limit` param (leaderboard size) — no more `appliedOnly`, since Apply no longer exists.
- Candidate selection inside `processMatchRun` changes from "every active student profile" to "for each student, `selectResumeForJob(job.jobRole, studentResumes)` → skip if `null`" — this is the new pure, fully-unit-tested function from `buildPlan.md` §119.2.

### 4.11 Admin Job Roles (`/admin/job-roles`) — feature 27e, NEW screen

```
┌───────────────┬────────────────────────────────────────────┐
│ Prism          │  Admin · admin@prism.dev          [Sign out]│
│               ├────────────────────────────────────────────┤
│   Jobs         │  Job Roles                    [ Add role ]  │
│ ● Job Roles    │                                             │
│   Skill Tax.   │  ┌────────────────────────────────────────┐ │
│   Scoring Cfg. │  │ Data Science           Active  [Edit][Deactivate]│
│               │  │ Software Development    Active  [Edit][Deactivate]│
│               │  │ Management               Active  [Edit][Deactivate]│
│               │  └────────────────────────────────────────┘ │
└───────────────┴────────────────────────────────────────────┘
```
Deliberately near-identical in structure to the existing Skill Taxonomy admin
page (`/admin/skill-taxonomy`) — same create/edit/deactivate pattern, same
soft-delete-only rule, reused almost line-for-line. Components: `Table`,
`NSTextField`, `NSButton`, `NSPill` (Active/Inactive).

**Backend**: new `jobRoleTaxonomyRepository`/`jobRoleTaxonomyService` and
`/api/admin/job-roles` (+ `/:id`) routes, structurally copied from
`skillTaxonomyRepository`/`skillTaxonomyService`.

### 4.12 Admin Skill Taxonomy (`/admin/skill-taxonomy`) — feature 27a (retrofit only)
Same content as today, moved inside `AdminLayout`; its own header/sign-out
markup removed.

### 4.13 Admin Scoring Config (`/admin/scoring-configs`) — feature 27a (retrofit only)
Same content as today, moved inside `AdminLayout`, header/sign-out removed.

---

## 5. Feature → screens map (for the Backend/Frontend spec of each)

| Feature | Screens touched | New backend surface |
|---|---|---|
| 27a Layout + nav | 4.5, 4.7, 4.9, 4.10, 4.12, 4.13 (retrofit, no new data) | none |
| 27b Landing + sign-in | 4.1, 4.2 | none |
| 27c Admin leaderboard + CV review + Draft/Live | 4.9, 4.10 | `listingStatus`/`leaderboardSize` on `Job`; parsed-profile display; `limit` param; wire `getPresignedDownloadUrl`; Run Matching gated on Live |
| 27d Multi-resume | 4.6 (new), 4.5 (lighter) | `Resume.label`; drop auto-deactivate; `StudentProfile.isActive` → "published" |
| 27e Job roles + resume routing | 4.6 (role field), 4.9 (job role field), 4.10 (resume-used column), 4.11 (new) | `jobRoleTaxonomy` collection + admin routes; `Resume.jobRole`/`Job.jobRole`; `selectResumeForJob()` pure function wired into `processMatchRun` |
| 27f Profile page | 4.8 (new) | `User` gains contact/academic fields |
| 27g Forgot password | 4.2 (link), 4.3, 4.4 (new) | email provider (Resend) integration; reset-token flow |

Build order stays as previously agreed: 27a → 27b → 27c → 27d → 27e → 27f →
27g, then resume #28-30.
