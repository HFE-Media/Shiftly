# Jobs backend execution-review package

Historical checkpoint: the database-execution and missing-recovery statements below
are superseded by [jobs-final-validation.md](jobs-final-validation.md), dated
8 September 2026. That report records actual OFFLINE local PostgreSQL execution.
Neither document authorizes production execution.

Local readiness phase, 7 September 2026. Branch `feature/shiftly-jobs`, base HEAD
`48f88db7dbdf0d8747573e1d75ec11670809d156`. Nothing in this package has been executed
against a database. This document is NOT authorization to run a migration.

## Changes in this phase

Revised existing WIP:

- `public/jobs.js`: preserves the existing dashboard/workspace/cards/modals; routes
  mutations through an adapter, prevents duplicate in-flight actions, handles errors,
  gates real entry points and clears UI on company/session changes. Existing mock
  fixtures remain. Normal employees have no production entry point.
- `supabase/migrations/20260904100000_jobs_foundation.sql`: replaces the UNEXECUTED
  foundation with the complete additive Jobs model and checked transactional RPCs.
- `public/login.html`: Jobs navigation placement and ordered, versioned asset loading.
- `public/app.js`: three Jobs-only context notification events (sign-out, membership
  load and company switch); no change to the existing operations themselves.
- `public/service-worker.js`: v216 to v217 and three versioned Jobs precache entries;
  existing fetch, activation and offline-shell behaviour is unchanged.

New files:

- `public/jobs-data.js`
- `tests/jobs-data.test.cjs`
- `tests/jobs-ui.test.cjs`
- `tests/jobs-sql-static.test.cjs`
- `tests/jobs-security.sql`
- This document.

`public/jobs.css` and `scripts/supabase-staging.ps1` were already untracked and are
not edited by this phase. Other migrations, production configuration, marketing,
Attendance, Payroll, Billing and auth/callback implementation are not changed.

## Database model

Twelve Jobs-owned tables: `jobs`, `job_number_counters`, `job_assignments`,
`job_time_entries`, `job_work_days`, `job_materials`, `job_test_results`, `job_notes`,
`job_photos`, `job_client_signoffs`, `job_activity`, `job_completion_snapshots`.

The only shared structural change is `companies.jobs_enabled boolean NOT NULL
DEFAULT false`. An additional entitlement trigger permits changes only by the
existing platform-admin helper or service-role JWT. No shared helper is replaced.
Existing company RLS still applies; the trigger does not grant company access.
Disabling preserves data and denies Jobs reads/writes.

All Jobs tables have RLS. Browser roles have no direct writes. Authenticated users
may SELECT non-counter tables only through the Jobs policy. Counters have no browser
SELECT grant. PUBLIC/anon grants are revoked; all internal helpers are revoked from
authenticated too. Only explicitly listed, authorizing RPCs/helpers are callable.

Owner/Admin can access their active, enabled company's Jobs. Supervisors require an
active `company_users` membership linked through `employee_id` to an active employee,
plus an active assignment on the specific Job. Assigned supervisors can read its
team time and evidence. Ordinary employees, other tenants, anon and platform-only
admins get no content access. An employee JWT shares PostgreSQL's `authenticated`
role, but every callable mutation rejects that user's application role. There is no
legacy `supervisors` authorization and no new technician role.

## Transactions and history

RPCs: `create_job`, `create_job_with_team`, `assign_job_employee`,
`replace_job_lead`, `unassign_job_employee`, `schedule_job`, `start_job_work`,
`finish_work_for_today`, `submit_job_for_review`, `return_job_for_correction`,
`resubmit_job_for_review`, `approve_job_complete`, `cancel_job`, `add_job_evidence`.
Scheduling also supports rescheduling an unstarted scheduled Job. No reopen.

- Statuses are exactly draft, scheduled, in_progress, submitted_for_review,
  correction_required, completed, cancelled. Paused is derived, never persisted.
- Creation with team/scheduling is one transaction; a date alone does not change a
  draft's status. The existing Create Job UI explicitly requests scheduling.
- Job numbers use an atomic company/year counter and unique company/number key;
  format `JC-YYYY-0001`, growing beyond four digits without truncation. Numbering
  year currently uses server UTC; work-day dates use Africa/Johannesburg. Failed
  creation transactions roll back allocation; committed numbers cannot be deleted
  and reused. Confirm this year boundary convention before execution approval.
- Company/membership and Job locks, expected revisions, lifecycle checks and a
  partial unique open-session index prevent stale/double actions. A company/employee
  advisory lock serializes starts across different Jobs. SQL timestamps are authoritative.
- Assignment uniqueness and one-active-lead indexes apply. Scheduling/start/review/
  approval require an active linked Supervisor lead. Lead replacement is atomic;
  submitted teams cannot change, and open sessions block removal/replacement.
- Finish writes a separate session-linked work record, closes only the caller's
  session, appends activity and increments revision atomically. Multiple sessions
  or dates never overwrite earlier work. No Attendance or Payroll dependency exists.
- Submission requires meaningful work and no open session for ANY worker. It never
  auto-closes sessions. Only the assigned Supervisor lead submits/resubmits.
- Correction requires a manager and reason; audit keeps prior submissions/corrections.
- Approval requires a manager, submitted state, valid lead and no open sessions;
  completion metadata, activity and versioned snapshot commit together.
- Cancellation requires a manager/reason and no open session. No hard deletion.
- Names, client/site/address/company branding references and actor names are snapshots.
  Completion stores all relevant detail in an immutable JSON payload. Current names
  are not substituted when normalizing a completed Job Card.
- External FKs use RESTRICT or selective SET NULL; employee/site ID cascades retain
  scalar historical identity in completion payloads. Employee hard deletion may now
  be refused when referenced by Jobs; deactivation is the supported safe path.
- Activity and snapshots cannot be updated/deleted. Triggers reject substantive
  changes to closed Jobs/evidence, including accidental privileged edits. Narrow
  FK-reference cleanup is permitted without changing snapshot contents.

## Frontend boundary and intentionally disconnected work

`jobs.js -> jobs-data.js -> local mock` is the active path. No Supabase client is
created here. The prepared Supabase adapter accepts the existing authenticated
client only when later integration is explicitly approved. It scopes queries by
company, relies on SQL for row access, normalizes detail/snapshots and provides all
RPC methods. Evidence is paginated and revision checked to avoid truncated or mixed
Job Cards. Lists are paginated summaries (`detailLoaded:false`), not full cards;
future production wiring must hydrate detail and compute dashboard totals correctly,
not treat one page as the entire company.

The mock adapter maintains the approved UI workflow locally, enforces role/session/
revision checks and rolls back failed persisted actions. QA mode does not write
localStorage. Browser demo parameters only operate on localhost/file environments
and never select the live adapter. No production state can be supplied by a demo role.

Prepared states include loading, empty, disabled, permission/session denial, network
failure, validation, stale/duplicate conflict, company-change clearing and in-flight
write disabling. The detached view-state hook supports async loading and discards
responses from a previous context. The existing application does not yet fetch the
unexecuted `jobs_enabled` column; missing entitlement fails closed. Later wiring
must explicitly refresh entitlement/membership and reload on company/session change.

The unmounted entitlement control is platform-admin-only and disabled. Its eventual
adapter method patches ONLY `{jobs_enabled: value}`. It does not enable the feature
in the customer's Company Settings. Owner nav preparation places Jobs after Clocking
and before Companies; Admin gets Jobs next to Clocking; Supervisor beside its existing
workspace control. Existing handlers are reused.

## Media boundary

No bucket or Storage policy is created. Proposed PRIVATE bucket: `shiftly-jobs-media`.
Immutable paths: `<company UUID>/<job UUID>/photos/<object UUID>.(jpg|jpeg|png|webp)`
and `<company UUID>/<job UUID>/signatures/<object UUID>.png`.

Photo/signature metadata registration requires the matching object to exist in that
private bucket. Sign-off without signature remains supported with an unavailable
reason. Future upload policies must recheck enabled company, assigned supervisor,
Job lifecycle, immutable path/no overwrite and size/MIME limits; private read access
must match `can_access_job`. No signed URL belongs in a completion snapshot. A future
authorized media resolver must turn object paths into short-lived display URLs.
The current demo retains placeholder photos/local canvas data, not fake live uploads.
Company-logo URL snapshots do not preserve the image bytes if the external logo is
deleted later; binary archival/retention needs a separate approved media policy.

## Local verification and execution gates

Safe checks run:

```
node --check public/app.js
node --check public/jobs.js
node --check public/jobs-data.js
node --check public/service-worker.js
node --test tests/jobs-data.test.cjs tests/jobs-ui.test.cjs tests/jobs-sql-static.test.cjs tests/billing-pdf.test.cjs
git diff --check
```

The DOM harness runs Jobs scripts only: no app.js, network, Supabase or credentials.
It covers Admin, All Jobs, Job modal/Card, Create, Supervisor finish/continue, review,
correction/resubmission, approval and excluded entry points. Adapter tests additionally
cover multi-day persistence, stale/double starts, storage failures, history normalization
and context invalidation. Static SQL tests are source guardrails, NOT database proof.

`tests/jobs-security.sql` is prepared but NOT RUN. It expects disposable two-company
fixtures and JWT identities for owner/admin/assigned and unassigned supervisors,
ordinary employee, outsider and platform-only admin. It checks feature flag, roles,
grants/RLS, numbering, lead assignment/replacement, sessions, lifecycle, completion
immutability and multi-session work records, ending with ROLLBACK. Concurrent races
require its documented separate two-session rehearsal; the script does not claim to
simulate parallel execution. The explicit disposable-test variable is a human safety
gate, not a guarantee that a connection points to a safe database.

Before any execution authorization:

1. Reconcile the actual target catalog read-only: PG 15+ selective SET NULL syntax;
   company_users composite key, employee_id/full_name/active/role; employee/site keys;
   companies name/logo_url/status; existing is_platform_admin(uuid); auth/storage
   schema; migration role ownership and grants. The old bootstrap SQL alone is not
   the complete deployed catalog. Do not reconstruct or alter core schema to fit.
2. Confirm this exact migration and every named function/table/trigger are absent.
   It intentionally is one-time, not silently idempotent; collisions must stop and
   roll back rather than replace an existing object.
3. Obtain separate authorization for isolated database execution and run the SQL
   assertions plus concurrent allocation/start/submission/entitlement-revocation tests.
   No database execution or migration compilation is claimed in this phase.
4. Review the short ACCESS EXCLUSIVE company-column/trigger lock. Five-second lock
   timeout and 60-second statement timeout fail safely; schedule an appropriate window.
5. Decide private media retention/policies and then separately authorize frontend
   connection. Do not launch the mock scaffold as a connected Jobs feature.
6. Define recovery operations for deactivated linked supervisors or entitlement
   disabled during an open session: this package fails closed and does not silently
   close time. A controlled re-enable/reactivation is needed; no bypass is added.

Local browser note: the preview server had stopped during the interrupted task. A
cached shell showed an older `app.js?v=195` HTML-as-JS error. Restarting the same
local server restored HTTP 200 JavaScript and reloading produced no new console
errors. Existing offline app-script fallback behaviour was not changed in this scope.

Verdict: READY FOR PRODUCTION BACKEND EXECUTION REVIEW as a local review candidate,
NOT verified for deployment or direct production migration execution. The catalog,
database/concurrency and private-media execution gates above remain mandatory.
Remote Supabase writes, migrations run, deployment, commits and pushes: ZERO.
