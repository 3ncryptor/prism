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

Build order: 27a → **27a2** → 27b → 27c → 27d → 27e → 27f → 27g, then resume
#28-30.

---

## 6. Feature 27a2 — Visual design system upgrade

Decisions recorded in `buildPlan.md` §119.4. Applies a navy/indigo brand
accent to structural chrome (previously grayscale-only) and two structural
patterns from a reference admin panel the user reviewed: stat cards with
icon badges, and two-pane master-detail for structured admin data.

### 6.1 Revised Sidebar (both panels)

```
┌─────────────────┐
│ ● Jobs            │   ← active: tinted indigo pill background, indigo text
│   Skill Taxonomy   │   ← inactive: gray text, hover -> light gray bg
│   Scoring Config   │
└─────────────────┘
```
Same structure as today's `Sidebar` component — only the active-state color
changes (indigo-tinted pill instead of near-black `bg-gray-900`). No new nav
grouping yet (only 3-4 items per panel; the reference's uppercase
section-label grouping is worth revisiting once there are enough sections to
warrant it — not now).

### 6.2 Revised TopBar (both panels)

```
┌──────────────────────────────────────────────────────┐
│                                    ┌───────────────┐   │
│                                    │ (A) Admin  ▾  │   │
│                                    │     admin@...  │   │
│                                    └───────────────┘   │
└──────────────────────────────────────────────────────┘
                                       │
                                       ▾ (click opens)
                                     ┌───────────────┐
                                     │ Sign out        │
                                     └───────────────┘
```
Avatar circle (initial letter, indigo background) + name + email, click to
open a small dropdown containing "Sign out" (replaces today's bare text +
always-visible Sign out button). **Deliberately no notification bell** — no
notification system exists in Prism; a decorative icon with no function
would be exactly the "looks like it does something, does nothing" pattern
this project's engineering standards reject.

### 6.3 New `StatCard` primitive

```
┌────────────────────────┐
│  Best Fit          (●) │  ← icon in a soft indigo circle badge, top-right
│                         │
│  1                      │  ← large bold number
│                         │
│  View candidates →      │  ← optional link, indigo
└────────────────────────┘
```
Replaces the plain `<NSTypography>` numbers currently used for Best Fit /
Moderate / Low Fit on the Job Detail page (`docs/screens.md` §4.10). Props:
`label`, `value`, `icon` (optional), `href`+`linkLabel` (optional — omitted
when there's nothing to link to, e.g. a static count).

### 6.4 Skill Taxonomy — retrofit to master-detail

```
┌───────────────┬────────────────────────────────────────┐
│ Skills          │  Name          [python_____________]   │
│ ─────────────── │  Display name  [Python______________]  │
│ ● python        │  Category      [LANGUAGE ▾]             │
│   django         │  Aliases       [py, python3__________]  │
│   react          │  Usage: 2 references                    │
│   sql            │                                         │
│   ...            │  [ Save changes ]  [ Deactivate ]        │
│ [+ Add skill]    │                                         │
└───────────────┴────────────────────────────────────────┘
```
Left pane: scrollable list of all skills (active ones normal weight,
inactive ones grayed/struck-through), selected one highlighted (same tinted
style as the active sidebar item). Right pane: the create/edit form for
whichever skill is selected, or a blank "Add skill" form when none is
selected. Functionally identical to today's `SkillTaxonomyDashboard` (same
create/edit/deactivate/usage-count logic) — purely a layout change, replacing
the current top-form-then-flat-table structure.

---

## 7. Feature 28: Self-serve signup + email verification

Written before any code, per this doc's own house rule. Confirmed constraints
(user decisions): signup is self-serve, restricted to a configurable
university email domain, and requires clicking an emailed verification link
before first sign-in. Self-serve signup **only ever creates a STUDENT
account** — there is no path from this flow to an ADMIN role, ever.

### 7.1 Sign Up (`/sign-up`)

Reuses the `(auth)` layout shell (centered card, wordmark, light-only) —
same shell as Sign In/Forgot Password.

```
┌──────────────────────────────────────┐
│              Prism                    │
├──────────────────────────────────────┤
│  Create an account                    │
│                                        │
│  Name        [___________________]    │
│  Email       [___________________]    │
│  Password    [___________________]    │
│  Confirm     [___________________]    │
│                                        │
│  [        Create account        ]     │
│                                        │
│  Already have an account? Sign in     │
└──────────────────────────────────────┘
```

**States:**
- *Idle*: form as above.
- *Submitting*: button shows a loading state, disabled.
- *Success*: form replaced entirely by a generic confirmation panel —
  "Check your email to verify your account." + the same email address they
  entered, no "Sign in" shortcut yet (they can't sign in until verified) —
  just a "Back to sign in" link.
- *Error* (shown above the form, same red-banner style as Sign In's error):
  - Invalid email format → "Enter a valid email address."
  - Wrong domain → `"Sign up with your <domain> email address."` (domain
    read from config, never hardcoded in the message).
  - Duplicate email → `"An account with this email already exists."` with a
    "Sign in instead" link right there in the error banner (this is the one
    auth flow where confirming an email is registered is normal/expected,
    unlike password reset).
  - Password too short / mismatch → inline, same pattern as Reset Password's
    "New password and confirmation don't match."
  - Rate limited → the shared 429 pattern (all forms already do this).

**Fields → API contract:** `POST /api/auth/signup` `{name, email, password}`
→ `{message}` (generic) on success, `{error}` + appropriate status
otherwise. See §7.6 for the full contract.

### 7.2 Verify Email (`/verify-email?token=...`)

Same shell. No form — this page's whole job is to consume the token in its
URL and report the outcome, mirroring Reset Password's "read token from
searchParams, render success/error" pattern exactly.

```
┌──────────────────────────────────────┐
│              Prism                    │
├──────────────────────────────────────┤
│  Verifying your email…                │   ← brief loading state, POSTs
│                                        │      the token on mount
└──────────────────────────────────────┘

              ↓ resolves to one of:

┌──────────────────────────────────────┐         ┌──────────────────────────────────────┐
│  Email verified                       │         │  This link is invalid or has expired  │
│  Your account is ready. Sign in to     │         │  [ Request a new link ]  (→ resend    │
│  continue.                             │         │   flow, §7.3)                          │
│  [ Sign in ]                           │         │                                        │
└──────────────────────────────────────┘         └──────────────────────────────────────┘
```

No `?token=` at all → same "invalid or has expired" state immediately, no
verifying step (identical to how Reset Password handles a missing token
today).

### 7.3 Resend verification (folded into the "invalid/expired" state above)

"Request a new link" reveals an inline email field + submit, posting to
`POST /api/auth/resend-verification` `{email}` → always the same generic
message regardless of whether that email exists or is already verified
("If that account needs verifying, we've sent a new link") — same
non-enumerating shape as Forgot Password.

### 7.4 Sign In (`/sign-in`) — additions only

- New line under the form, mirroring "Forgot password?": **"Don't have an
  account? Sign up"** → `/sign-up`.
- New error state alongside the existing `?error=1` ("Invalid email or
  password"): `?error=2` → **"Your email isn't verified yet."** with a
  "Resend verification email" link/button right in the error banner (posts
  to the same resend endpoint as §7.3).

### 7.5 Landing page (`/`) — addition only

Hero gets a second, secondary CTA next to "Sign in to continue": **"Create
an account"**, styled as an outline/ghost button (brand-colored border and
text, not filled) so the primary "Sign in" action still reads as primary.

### 7.6 API contract

```
POST /api/auth/signup
  body: { name: string, email: string, password: string }
  200 { message: string }              — generic, always the same copy
  400 { error: string }                — validation, wrong domain, duplicate email
  429 { error: string }                — rate limited (Retry-After header, same as other endpoints)

POST /api/auth/verify-email
  body: { token: string }
  200 { success: true }
  400 { error: "This verification link is invalid or has expired." }

POST /api/auth/resend-verification
  body: { email: string }
  200 { message: string }              — generic, non-enumerating
  429 { error: string }
```

### 7.7 Data/behavior notes

- New `User.emailVerified: Date | null` field. `null` until the link is
  clicked.
- Verification token: identical shape/lifecycle to the existing password
  reset token (SHA-256 hash stored, never the raw token; single-use;
  time-limited) — new sibling collection, not a reuse of the password-reset
  one (different purpose, different expiry window: verification links live
  longer, e.g. 24h, since there's no urgency the way a "someone requested
  your password be reset" link has).
- Domain check reads a `SIGNUP_EMAIL_DOMAIN` env var; unset = no
  restriction (keeps dev/CI unblocked, same lazy-env-validation philosophy
  as every other scoped env accessor in `lib/config/env.ts`).
- Rate limiting: token bucket keyed by IP (no account exists yet to key by
  email) — same primitive already used for resume/JD upload, not a new
  algorithm.
- `verifyCredentials()` gains a third outcome beyond "ok"/"null": unverified
  accounts get a distinguishable rejection so Sign In can show §7.4's
  specific message instead of the generic "invalid credentials" one.

---

## 8. UI/UX Rebuild — Screens (Grauity migration + motion system)

This section documents the *rest* of the planned rebuild (beyond §7's
signup) at the same level of detail as §1-§6 above, so implementation can
proceed screen-by-screen against a written spec rather than improvised live.
Two design skills inform this section's visual/motion language
(`animated-svg-retrace`, `soft-motion-ui-v2`); both are written for Framer
Motion + shadcn — every pattern below is re-expressed for this repo's actual
stack (GSAP + Lenis, Tailwind + a new local `cva` component set), never a
second animation library. See the approved plan
(`/Users/aryanvibhuti/.claude/plans/woolly-sniffing-walrus.md`) for the full
reasoning; this section is the buildable screen spec that plan produces.

### 8.0 Design tokens (established once, used everywhere below)

```
--brand: #4F46E5           --brand-hover: #4338CA        --brand-tint: #EEF2FF
--radius-card: 2rem        (soft-motion-ui-v2 §2 — full 32px, not a toned-down value)
--radius-pill: 9999px
--shadow-rest:  0 8px 30px rgb(15 23 42 / 0.05)
--shadow-hover: 0 20px 45px rgb(15 23 42 / 0.10)
```
Status colors (green/amber/red for buckets, Ready/Failed pills) are
untouched — brand tokens never substitute for status meaning.

**Color-as-data**: every `JobRoleTaxonomy` entry gets a stable derived color
(hash canonical name → one of a fixed 6-8 accessible palette pairs), used
consistently for that role's badge everywhere it appears (resume cards, job
cards, dashboard coverage rows) — replaces flat "everything is blue" tagging.

### 8.1 New shared primitives (`lib/ui/`, replacing Grauity)

`Button` (variants: brand/outline/ghost/destructive/link — `cva`-driven),
`Card` (`rounded-[2rem]`, diffuse shadow, lifts + border-tints on hover only
when the whole card is clickable), `Input`, `Select`, `Checkbox` (styled —
replaces the native unstyled one currently on the Resumes page), `Badge`
(pills; also the color-as-data role tag), `Typography`. Every one ships a
real `:focus-visible` ring in `--brand` and `active:scale-[0.97]` +
`transition: transform 160ms ease-out` press feedback — no exceptions,
this is what closes the "no visible keyboard focus anywhere" finding.

### 8.2 Motion primitives (`lib/motion/`, GSAP-driven)

- `useRevealSection` — `ScrollTrigger`-gated fade+rise, the mechanism behind
  every "stacked section" reveal below. Reduced-motion users get the final
  state instantly, opacity-only, no transform.
- `useStagger` — cascades a card grid/list's children in on the same
  trigger, 60ms apart.
- `useStrokeRetrace` — the `animated-svg-retrace` skill's choreography
  (hover/mount/inview/loop triggers; `animateIndices`/`order`/`staggerStep`)
  ported to GSAP tweening `stroke-dashoffset` (the free `pathLength="1"`
  trick — no paid DrawSVGPlugin). Reserved for load-bearing SVG moments
  only (wordmark, empty-state illustrations, the scoring-weights bar) —
  **not** a general icon system; AGENTS.md's no-icons rule stays in force
  for nav/status/buttons.
- Sidebar active-item indicator becomes a GSAP-animated `<span>` sliding to
  the active link's measured position, replacing the flat background swap.

### 8.3 Homepage (`/`) — rebuilt as stacked `RevealSection`s

```
[Nav — sticky, blurs on scroll]
[Hero — 2 ambient blurred brand-tint blobs behind the existing headline/
 subhead; "Sign in to continue" (primary) + "Create an account" (outline,
 §7.5) side by side; a retrace-drawn small diagram: resume → JD → score]
[How it works — existing 3 steps, now cascade in via useStagger instead of
 appearing all at once]
[NEW: "Built for placement cells, not job boards" — 3 cards, color-as-data
 by audience (faculty / students / matching engine), explaining the actual
 model: students never browse JDs, faculty gets ranked evidence-backed
 shortlists — the landing page currently doesn't say this at all]
[Footer — wordmark + sign-in link only]
```

### 8.4 Sign Out — replaces NextAuth's raw default page entirely

No confirmation screen. TopBar's "Sign out" menu item POSTs directly
(mirrors how Sign In is already a direct server action, not a redirect
through a generic NextAuth page) → brief "Signed out" toast → redirect to
`/`. Closes the single worst visual moment found in the live audit
(NextAuth's unstyled dark confirmation page inside an otherwise all-light
branded app).

### 8.5 Student Dashboard (`/student`) — rebuilt with real aggregations

Replaces today's single-arbitrary-resume card (a leftover from before the
multi-resume model) with stacked `RevealSection`s, each backed by
`lib/services/studentDashboardService.ts` (new — reuses existing
repositories, no new data model beyond what §7/multi-resume already added):

```
[Resume coverage]
  "Published for 2 of 6 roles"
  ● Data Science  ● Software Development   ○ Product   ○ Design  ...
  (filled pill = published resume for that role, outlined = gap — each a
  color-as-data role badge; clicking a gap deep-links to Resumes with that
  role pre-selected in the upload form)

[Outcome summary]
  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐
  │ Best Fit  1 │ │ Moderate  0 │ │ Low Fit   2 │   ← each tinted in its
  └─────────────┘ └─────────────┘ └─────────────┘     own bucket color now,
                                                        not black-on-white
[Recent results]
  Machine Learning Engineer · DataCorp        Low Fit    →
  (top 3 published results, "View all" → Applications)

[Profile completeness]
  "Profile 60% complete" + thin progress bar + "Complete your profile →"

[Skills snapshot]
  existing tag cloud, now color-as-data by role instead of flat blue
```

Data source for "Outcome summary"/"Recent results": the same
published-vs-under_review gating already implemented in
`app/api/matches/route.ts` — reused, not reimplemented.

### 8.6 Student Resumes / Applications / Profile

Structural layout unchanged from §4.6-§4.8 — this is a visual/motion pass:
new `Card`/`Checkbox` primitives, role badges become color-as-data,
humanized failure copy (today's raw `"aborted"` string becomes a real
sentence, e.g. "Processing was interrupted — try re-uploading."), list
renders get `useStagger`.

### 8.7 Admin Dashboard (`/admin`) — NEW page; Jobs list moves to `/admin/jobs`

The admin's landing page today is the Jobs list with an upload form bolted
above it. That becomes its own sidebar item; `/admin` becomes a real
dashboard, backed by `lib/services/adminDashboardService.ts` (new):

```
[Needs attention]
  Jobs that are Ready+Live with no match run yet, or whose latest run is
  older than N days — one card per job, with "Run Matching" right on the
  card (no click-through required). This is the highest-value addition:
  it directly serves "find out who's good for a given JD" by surfacing
  *where to look next* instead of requiring a click into every job.

[Pipeline overview]
  Live: 4    Draft: 1    Ready: 5    Still processing: 0

[Candidate pool health]
  Per job role (from JobRoleTaxonomy), how many students have a published
  resume tagged for it — surfaces gaps like "40 students, only 2 tagged
  Data Science" at a glance.

[Aggregate outcomes]
  Summed Best Fit / Moderate / Low Fit across every live job's latest
  published run.

[Recent activity]
  Last N of: JD uploads, completed match runs, publish-results actions
  (sourced from the existing audit log, not a new logging system).
```

Sidebar gains "Dashboard" as the first item, above "Jobs."

### 8.8 Admin Jobs list + Job detail

Bucket-colored stat tiles (fixes the audit's color-blind-stat-card
finding), the decorative dot-grid icon badges on those tiles get dropped
(flagged as a likely no-icons violation — dropped unless a real reason to
keep them turns up during implementation), results table rows get a hover
state + `useStagger` on first render.

### 8.9 Admin Job Roles / Skill Taxonomy / Scoring Config

Job Roles and Skill Taxonomy are already correctly two-pane — token/shadow/
radius pass only. Skill Taxonomy's internal scrollable list (46 items in a
448px box, confirmed zero scroll affordance in the live audit) gets a
visible custom scrollbar + a bottom fade-out cue. Scoring Config is rebuilt
as two-pane to match the other two (active config summary + version history
on the left, "create new version" form on the right), and the 6 weight
inputs gain a live color-as-data horizontal stacked bar that updates as the
admin types — turning six raw numbers into one glanceable picture.
