# Jobs final offline backend validation — 8 September 2026

## Verdict

**READY WITH SPECIFIC MANUAL REVIEW REQUIRED**

Actual PostgreSQL 17.6 migration, security, lifecycle and overlapping-transaction
tests passed. This is not approval to execute against production, enable Jobs,
connect the frontend, or deploy. No production connection was made in this offline
phase. This does not retroactively change the disclosed CLI login-role incident
from the earlier, stopped phase.

## Evidence and reproducibility

- Source: `C:/Users/fenge/Downloads/Supabase Snippet Untitled query.csv`.
- Catalog SHA256: `6c96484f1cb9c72b4cf6d4e993b056e0dc8cebd710eb48d575b0e80673887889`.
- Final migration SHA256: `8d6ecee456cd0ab7a8c63e27d7ea36225414868fe23abf2c68856eba97935f5d`.
- Final local evidence: `tmp/jobs_validation_1788833290990/` contains report.json,
  foundation.sql, objects.json, catalog.json and security.json. These are ignored
  local artifacts, not committed release files.
- Runner: `node tests/jobs-db-validation.cjs "C:/Users/fenge/Downloads/Supabase Snippet Untitled query.csv"`.
- Native PostgreSQL 17.6; isolated cluster `tmp/jobs-db-validation-20260907`,
  loopback `127.0.0.1:54397`. Each run creates a fresh disposable database.
  No Supabase CLI, production credentials, environment connection strings or staging.
- Temporary runtime dependencies are under `tmp/jobs-pg-runtime` only; repository
  package manifests were not changed. Docker was unavailable; no Docker repair was made.
- The SQL security script ran through a limited psql-variable/statement harness
  using node-postgres, not psql (the native package lacks psql). All 98 statements
  were executed in PostgreSQL; this was not a static simulation.

## Required report

1. **Branch / HEAD:** `feature/shiftly-jobs`, `48f88db7dbdf0d8747573e1d75ec11670809d156`.
2. **Working tree:** existing uncommitted Jobs WIP retained. Tracked modifications
   remain public/app.js, public/login.html and public/service-worker.js from prior
   work. Jobs source, migration, test and review files remain untracked. No staging,
   reset, stash, branch switch or commit occurred.
3. **Production connection:** ZERO in this offline validation phase.
4. **Catalog reconciliation:** required five public tables, exact relevant key/type
   targets, supplied checks/indexes/policies/grants and three helper definitions
   reproduced locally. The snapshot is not a complete production database: shared
   trigger function bodies, helper ACLs, unrelated namespaces/functions and some
   column typmods are absent. Those cannot be certified from this input.
5. **FK compatibility:** companies(id), company_users(company_id,user_id),
   employees(company_id,employee_id), sites(company_id,site_id) are valid targets.
   No FK targets the nonunique company_users(company_id,employee_id) index.
6. **jobs_enabled:** additive boolean NOT NULL DEFAULT false. Existing fixtures
   remained false; post-migration company inserts in the SQL suite worked. Billing
   flag unchanged. Entitlement trigger rejects self-enablement; ordinary company
   updates still work. Existing companies policies unchanged. The ALTER requires
   a brief exclusive lock; it has a five-second lock timeout.
7. **Roles:** existing owner/admin/supervisor/employee/billing/viewer values fit.
   Active linked employee plus assignment is required for Supervisor operation.
8. **Shared helpers:** no replacement or alteration of can_access_company,
   can_manage_company or is_platform_admin. Before/after local definitions and
   shared policies compare equal. Jobs-specific helpers enforce narrower access.
9. **Deletion consequences:** Jobs/counters restrict company hard deletion; Jobs
   assignments/time entries restrict referenced employee deletion. Deactivation
   preserves history. Site deletion nulls only site_id; actor membership deletion
   nulls only actor references, retaining snapshots. Actual local deletion and
   snapshot tests passed. A separate employee test removed its membership first
   and confirmed the new job_assignments FK rejects deletion (23503).
   The existing production company_users employee FK has SET NULL on BOTH columns,
   including NOT NULL company_id; it can already reject linked employee deletion
   independently of Jobs. It was not changed. Current deleteCompanySite checks
   clock_events before deletion; Jobs preserves its own historical site snapshot.
   Approve these new retention restrictions before rollout, including administrative
   company/employee hard-delete workflows not represented by the small catalog.
10. **Local DB:** real PostgreSQL 17.6 with fictional two-company fixtures and
    JWT-role test settings. Minimal auth.users and storage metadata fixtures only.
    Existing shared trigger bodies were NOT invented or simulated.
11. **Migration execution:** PASS, final clean-database execution 78 ms, no notices.
    Previous clean runs also passed. This timing is not a production performance estimate.
12. **Tables:** jobs, job_number_counters, job_assignments, job_time_entries,
    job_work_days, job_materials, job_test_results, job_notes, job_photos,
    job_client_signoffs, job_activity, job_completion_snapshots. All 12 have PKs
    and RLS; 11 content tables have read policies/history triggers; counters have
    no browser read grant. Catalog evidence includes FK/check/index/trigger/grant
    and function definitions after actual creation.
13. **Mutation RPCs:** create_job, create_job_with_team, assign_job_employee,
    replace_job_lead, unassign_job_employee, schedule_job, start_job_work,
    finish_work_for_today, admin_close_job_session, submit_job_for_review,
    resubmit_job_for_review, return_job_for_correction, approve_job_complete,
    cancel_job, add_job_evidence. Three authenticated authorization helpers:
    can_access_company_jobs, can_manage_company_jobs, can_access_job.
    Internal helpers have exact-signature execution revocations; definers pin
    search_path. Snapshot allocation/history helpers are not public mutation APIs.
14. **RLS / direct writes:** PASS. Anon reads denied; authenticated direct INSERT,
    UPDATE and DELETE denied across Jobs tables. Sensitive writes use checked RPCs.
15. **Owner:** permitted company-wide, entitlement required; recovery tested.
16. **Admin:** permitted company-wide; approval/cancellation/recovery tested.
17. **Supervisor:** assigned Jobs only; unassigned denied, manager actions denied.
18. **Employee:** all content-table reads and tested mutation RPCs excluded.
19. **Billing:** same exclusion passed.
20. **Viewer:** same exclusion passed.
21. **Platform admin:** entitlement update allowed, no implicit Jobs content or
    recovery access. A platform admin with a separate legitimate company role is
    evaluated through that company membership, not platform privilege.
22. **Cross-tenant:** bidirectional content isolation and foreign-job mutations denied.
23. **Number race:** two genuinely overlapping transactions generated distinct
    JC-2026-0002/0003; counter advanced exactly two. Separate companies independent.
24. **Open-session races:** same-job stale start rejected (40001); different-job
    duplicate employee session rejected (23505); exactly one open session retained.
25. **Lead race:** one replacement succeeded, stale contender rejected (40001);
    exactly one active lead remained.
26. **Finish atomicity:** injected failure in activity insert rolled back work-day
    creation and session closure. Test-only failure trigger removed locally.
27. **Multi-day:** three distinct persisted work records/sessions retained. Local
    fixture timestamps simulated separate days; wall-clock waiting was not required.
28. **Open-session submission:** teammate open session blocks submission without
    auto-close; submission succeeds after explicit finish.
29. **Correction:** submitted -> correction_required -> resubmitted -> completed
    passed with retained activity/reason history.
30. **Double actions:** genuine overlapping submit/complete/start/lead operations
    reject stale revision; one completion event and snapshot persist. Concurrency
    harness verifies the competing connection is waiting on a database lock.
31. **Immutability:** substantive completed records protected across job, sessions,
    work records, materials, results, notes, photos, signoff, assignments, activity
    and snapshot; tested even through privileged direct updates.
32. **Historical snapshot:** employee/site rename and later site/membership deletion
    leave saved completion JSON unchanged. Actual browser PDF against live data
    remains a later integration test, not claimed here.
33. **Inactive-worker recovery:** added admin_close_job_session locally. Owner/Admin
    only, reason required, server end timestamp, original start preserved, audited
    session_admin_closed event. Excluded-role recovery calls denied. No fabricated
    work-day or Attendance change; no automatic close on deactivation. Adapter
    mapping is disconnected and no recovery UI was added in this phase.
34. **Entitlement disable:** reads/mutations fail closed; existing rows/history and
    open sessions remain intact. Recovery also requires enabled entitlement.
    Drain/recover open sessions BEFORE disabling. Already-disabled recovery needs
    separately authorized, controlled re-enable followed by recovery and disable.
35. **Numbering year:** UTC for V1. Local January 1 at 00:30 +02 still uses previous
    UTC year; independent-year allocator tested. Work dates remain Johannesburg.
36. **Media:** design only. Proposed private shiftly-jobs-media bucket with immutable
    company/job/photos-or-signatures/UUID paths. Owner/Admin company access;
    assigned active Supervisor access; other roles denied. Use short-lived signed
    URLs, no overwrite/delete by browser, validate type/size and path. Retain objects
    and metadata after completion/disable; entitlement removal blocks operational
    access, not retention. Production Storage policies/bucket and actual Storage API
    behaviour have NOT been created or tested. Local metadata checks are not proof
    of Storage authorization; require separate policy approval and tests before media use.
37. **Regressions:** 27/27 passed (9 Jobs adapter, 5 Jobs UI, 4 SQL static, 9 Billing
    PDF). Admin/Supervisor mock DOM flows remain functional. Syntax checks passed
    for app.js, jobs.js, jobs-data.js, service-worker.js and three new DB harness
    files. git diff --check passed (existing LF/CRLF warnings only). No new visual
    browser or authenticated production smoke test claimed.
38. **Exact phase files:** modified existing WIP migration
    supabase/migrations/20260904100000_jobs_foundation.sql (recovery RPC + grants),
    public/jobs-data.js (recovery adapter mapping), and
    docs/jobs-backend-execution-review.md (superseding-report notice). Created
    tests/jobs-db-validation.cjs, tests/jobs-db-scenarios.cjs,
    tests/jobs-psql-harness.cjs and docs/jobs-final-validation.md. Runtime/evidence
    artifacts are ignored under tmp. Other pre-existing WIP was preserved.
39. **Remaining risks / manual gates:** approve hard-delete retention semantics;
    obtain OFFLINE missing shared trigger bodies/helper ACLs and complete collision
    inventory before production authorization; verify migration executor ownership
    and permissions; approve private-media policies separately. Supabase auth/JWT,
    PostgREST schema reload and Storage are not end-to-end emulated by standalone PG.
    Recovery end time is recovery time, not inferred actual work-stop time: document
    the reason and never silently treat abandoned time as verified payroll hours.
40. **Future backend plan:** see the controlled plan below; NOT executed.
41. **Rollback:** disable feature, preserve schema/data/history, no destructive down
    migration. See open-session caveat below.
42. **Final verdict:** READY WITH SPECIFIC MANUAL REVIEW REQUIRED.
43. **Production writes:** ZERO in this offline phase.
44. **Production schema changes:** ZERO in this offline phase.
45. **Deployment:** ZERO.
46. **Commit:** ZERO.
47. **Push:** ZERO.

## Existing application isolation

Migration source and static checks confirm no alteration of clock_events,
time_entries, clock_batch, auth.users schema, shared table RLS, shared helpers or
production Storage. No Attendance/scanner/GPS/geofence, Payroll/Leave/Payslips,
Billing, legacy supervisor clocking-code or login/callback implementation was
changed in this phase. The only shared table change proposed is the companies
flag and its entitlement guard trigger. This source-level boundary and the local
shared-policy/helper equality do not replace future existing-app smoke tests.

## Future controlled execution plan — DO NOT EXECUTE NOW

1. Resolve item 39 with user-supplied offline evidence and explicit approval.
   Freeze the exact reviewed SQL/hash; check for all object-name collisions and
   any change since catalog capture. Stop on mismatch; never replace shared helpers.
2. Obtain explicit production-backend-only authorization for project
   `szougedvngaoratbtars`. Manually confirm project in SQL Editor. No linked CLI
   or bulk db push: older migrations must not be replayed accidentally.
3. Confirm a recoverable backup and authorized executor privileges. Schedule a
   low-activity window for companies lock. Verify jobs_enabled and all proposed
   Jobs objects absent; if already present, STOP rather than rerun one-time SQL.
4. Execute ONLY the reviewed contents of
   `supabase/migrations/20260904100000_jobs_foundation.sql`, hash above, in the
   approved project. It contains BEGIN/COMMIT, lock_timeout 5s and statement_timeout
   60s. On failure roll back; do not bypass timeouts/security or partially continue.
5. Verify 12 tables, keys, indexes, triggers, grants, checked RPCs, RLS and shared
   policy/helper equality against reviewed output. Confirm this returns zero:
   `select count(*) from public.companies where jobs_enabled is distinct from false;`
   Before ALTER there is no flag to query; after ALTER all companies must be false.
6. Perform separately approved existing-app smoke tests: login/callback, company
   settings, attendance/scanner/GPS, hours, Payroll/Leave/Payslips, Billing and legacy
   supervisor flow. Any data-changing tests require controlled identities/data and
   their own approval. No customer payroll/clocking action as an incidental test.
7. STOP with backend installed, all entitlements false and frontend undeployed.
   Later approvals: private media; enable one controlled company; connect local
   Jobs frontend and run integration QA; approve; deploy frontend separately.

Rollback before migration COMMIT is transactional. After success, prefer flag
disable and frontend remaining disconnected, not DROP/CASCADE. If Jobs has ever
been enabled, inspect open sessions and explicitly close/recover before ordinary
disable. For an urgent security incident, immediate disable may take priority;
preserve evidence and arrange separately authorized recovery, never auto-close.
Disabling does not remove FK hard-delete restrictions or the shared entitlement
trigger; reverting those would need a new reviewed migration, not a blanket drop.

## Addendum — expanded offline catalog review, 8 September 2026

This addendum supersedes the earlier open-gate assessment, not the historical test
evidence. No SQL or application code changed during this review.

### Evidence and reconciliation

Parsed the actual single-row CSV/JSON payload in
`C:/Users/fenge/Downloads/shiftly_jobs_final_catalog_review.csv`, column
`shiftly_jobs_final_catalog_review`. SHA256:
`6e52357d89289a64f7873cb170554483e8b4edfc474ea4689ded996eafc5362d`.
Capture time: `2026-09-08T03:16:25.868684+00:00`.
The CSV is source evidence, not an executable instruction. It was not modified.

1. **Branch/HEAD:** feature/shiftly-jobs at
   48f88db7dbdf0d8747573e1d75ec11670809d156, unchanged.
2. **Working tree:** existing tracked app.js/login.html/service-worker.js changes
   and untracked Jobs source/migration/tests/reports/staging script remain WIP.
   No staging or branch operation. Only this report was edited in this addendum phase.
3. **Production connections:** ZERO.
4. **Parsing:** successful. Three schemas, one executor record, three foundation
   relations, five shared relation ACL records, three helper definitions, two
   trigger-function definitions and three shared triggers inspected.
5. **PostgreSQL:** 17.6, server_version_num 170006.
6. **Read-only capture:** executor.transaction_read_only is `on`; current_user and
   session_user are postgres. This proves the recorded capture state, not the
   setting of a future SQL Editor execution session.
7. **Shared triggers:** set_company_users_company_name and
   set_employees_company_name fire BEFORE INSERT OR UPDATE OF company_id and
   populate new.company_name by companies.id. set_site_defaults fires BEFORE
   INSERT OR UPDATE OF company_id,site_id; rejects null company_id, normalizes a
   supplied site_id, invokes public.generate_company_site_id(new.company_id) only
   for a missing/blank site_id, then populates company_name. All are enabled (`O`).
   Jobs does not insert/update those shared tables or replace these triggers or
   functions. The companies ALTER does not fire row triggers on them. The generator
   body is not in this snapshot; it is an unchanged existing dependency, not Jobs
   implementation and not needed for dormant foundation installation. No invented
   replacement or local claim of testing its missing-ID branch.
8. **Shared helper ACLs:** all three definitions exactly match the original CSV
   strings. Each is postgres-owned, SQL STABLE SECURITY DEFINER, search_path=public.
   Each ACL includes PUBLIC EXECUTE (`=X/postgres`) and explicit postgres, anon,
   authenticated and service_role EXECUTE. Both trigger functions have the same
   owner/EXECUTE ACL and search_path; language plpgsql. These broad existing grants
   were not changed or treated as Jobs content authorization. Jobs revocations and
   grants target only its own 28 signatures, not any shared helper.
9. **Relations:** relation_collisions is empty. All 12 tables and all 38 explicit
   or constraint-backed indexes from actual prior local creation have Jobs names
   and fall within the supplied broad public job/entitlement inventory, also empty.
   See exact index inventory below. No new sequence is created (UUIDs/bigints,
   not serial/identity).
10. **Functions:** function_collisions and broad inventory are empty. All 28
    function names/signatures, including 15 mutation RPCs and internal helpers,
    contain `job`; none is a shared helper replacement. Exact signatures are in
    the frozen SQL and prior local catalog.json; full name inventory below.
11. **Triggers:** zero reported collisions. New enforce_jobs_enabled_update on
    companies and jobs_protect_history on each of 11 new content tables. No
    trigger on counters. Shared trigger names and tables do not overlap.
12. **Policies:** zero reported collisions. jobs_read is created separately on
    each of the 11 new content tables, not companies or other shared tables.
13. **Broad inventory:** broad_public_name_inventory is empty. The CSV does not
    include the capture query/predicates, so coverage is interpreted according to
    the user's supplied broad public job/entitlement scope, not reverse-engineered
    from empty arrays. Standalone pg_type names are not explicitly inventoried;
    table creation also needs its composite type name available. Check the 12
    public table-name types at installation preflight. A conflict aborts the
    transaction; do not rename/rewrite around it. No observed collision.
14. **Flag:** companies_jobs_enabled_column is empty. SQL still adds only
    jobs_enabled boolean NOT NULL DEFAULT false to shared structure. Previous
    actual DB tests proved existing false values and future inserts/defaults.
    No billing_enabled or existing company RLS/policy change.
15. **Companies trigger:** companies_trigger_inventory empty. The new entitlement
    guard name/function are included in the empty Jobs name inventory.
16. **Ownership:** shared tables, helpers and trigger functions are postgres-owned;
    shared RLS on, not forced. public belongs to pg_database_owner; auth/storage
    belong to supabase_admin. auth.users belongs to supabase_auth_admin;
    storage.objects/buckets to supabase_storage_admin. Their existence is confirmed,
    not their table ACLs. PostgreSQL ownership of the five shared public tables
    supports ALTER companies and REFERENCES to those tables without superuser.
17. **Executor authority: NOT fully established.** postgres is non-superuser with
    CREATEDB/CREATEROLE. The public schema ACL grants pg_database_owner USAGE+CREATE
    but explicitly grants postgres only USAGE. The database owner and effective
    inherited privileges are not in the snapshot. If postgres owns the current
    database it implicitly has pg_database_owner privileges; that fact cannot be
    inferred from the database name `postgres`, existing object ownership or
    CREATEDB/CREATEROLE. CREATE on public is required by the migration. Language
    USAGE ACLs for sql/plpgsql are also omitted (normally available, not proven).
    The previous local database used a superuser and cannot settle production
    executor capability. No local grants were invented to declare this gap closed.
18. **SECURITY DEFINER:** 27 definers and one invoker history-trigger function.
    All pin pg_catalog,public. Relation/type references are schema-qualified;
    built-in functions resolve in pg_catalog. No caller-controlled identifiers.
    Snapshot dynamic SQL uses a fixed table allowlist, quoted identifiers and
    bound values. Migration DO dynamic DDL uses fixed allowlists/exact signatures.
    Own functions revoke PUBLIC/anon/authenticated first; 18 public authorization
    and mutation entry points then grant authenticated EXECUTE. Internal helpers
    remain ungranted. The public schema ACL provides no direct CREATE to anon or
    authenticated. Shared tables are read for role/entitlement/identity; no callable
    Jobs RPC writes them or grants platform admins automatic content access.
    The entitlement trigger only validates new flag values. No unsafe dynamic SQL
    or new shared-table privilege escalation found in this scope.
19. **Hard-delete decision accepted:** employee and company Jobs FK RESTRICT is
    intentional/approved; deactivate/archive rather than delete historical identity.
    Site selective SET NULL retains snapshots. No unrelated FK changed. The older
    company_users composite SET NULL/NOT NULL issue remains existing and untouched.
20. **Media deferred:** metadata-only foundation; zero Storage DDL/DML. Existing
    storage tables are referenced inside the deferred media-registration branch;
    their runtime read permissions/policies need later review, not ownership changes
    for this migration. No bucket/upload/signed URL infrastructure is installed.
21. **Existing Shiftly:** no clock_events, time_entries, clock_batch, attendance,
    scanner/GPS, payroll/leave/payslips, Billing, legacy clocking-code, auth.users,
    shared RLS/helpers/triggers/generator, login/callback or Storage alteration.
    No existing-company data writes beyond the additive false-default flag, no
    customer Jobs rows, entitlement enabling, navigation or adapter connection.
22. **Current SQL SHA256:**
    `8d6ecee456cd0ab7a8c63e27d7ea36225414868fe23abf2c68856eba97935f5d`.
23. **SQL changed:** NO; exact previous hash retained, including comments.
24. **DB suite rerun:** not rerun in this addendum because SQL is unchanged.
    Prior actual PostgreSQL 17.6 PASS and evidence remain valid within their stated
    fixture limits. Local server remains stopped. No claim of reproduction with
    production executor ACLs or the newly supplied trigger bodies.
25. **Regression rerun:** 27/27 PASS; syntax checks for app.js, jobs.js,
    jobs-data.js, service-worker.js and all three DB harness files PASS.
    git diff --check PASS; existing LF/CRLF warnings only.
26. **Blocking before backend installation:** establish effective executor
    CREATE on public and USAGE on sql/plpgsql from separately supplied read-only
    evidence. Do not grant privileges or use a migration attempt as a permission
    test. This is an evidence gap, not a finding that postgres actually lacks CREATE.
27. **Non-blocking, verify during installation preflight:** approved project/user,
    same frozen hash, fresh collision/12 type-name absence, no jobs_enabled, no
    companies trigger collision, write-enabled execution transaction, lock window
    and backup. Execute the complete transaction only; stop/rollback on failure.
    Post-install: all companies false, Jobs tables empty, correct keys/grants/RLS,
    shared definitions/ACLs unchanged, approved existing-app smoke tests. Private
    media or a frontend deployment must not be bundled with this installation.
28. **Blocking before first-company enablement:** explicit controlled-company
    approval, real auth/PostgREST integration checks, recovery/disable runbook,
    snapshot verification, existing-app smoke tests. Storage privileges/policies
    and upload authorization must be approved before enabling media workflows;
    keep media disconnected if the pilot is explicitly non-media.
29. **Blocking before frontend deployment:** separate UX/backend integration and
    tenant/role/error/recovery regression approval, production-safe adapter gating,
    no demo-data leakage, permission-checked media if exposed, explicit deployment
    authorization. Nothing was connected in this phase.
30. **Future/optional:** archive/admin retention tooling, carefully reviewed data
    retention policy and recovery UX improvements. No destructive down migration.
31. **Exact file modified this phase:** docs/jobs-final-validation.md only
    (this addendum). CSV, migration, tests and application files unchanged.
32. **Commit:** ZERO.
33. **Push:** ZERO.
34. **Deployment:** ZERO.
35. **Production writes:** ZERO.
36. **Production schema changes:** ZERO.
37. **Verdict:** READY WITH SPECIFIC MANUAL REVIEW REQUIRED.

### Complete created-object collision accounting

Tables: the 12 names in item 12 of the historical report, unchanged. Their 82
constraints comprise 12 PKs, 9 UNIQUE, 28 FKs and 33 CHECKs in the prior real DB
catalog. They belong only to newly created tables; same-named constraints on
unrelated tables are not conflicts. Constraint-backed indexes are accounted for
below. No existing-table constraint or type is altered. The sole added shared
column is companies.jobs_enabled. Automatically generated table composite types
are noted separately in item 13 rather than falsely claiming pg_type coverage.

All 38 indexes (including generated PK/UNIQUE names):

```text
job_activity_job_idx
job_activity_pkey
job_assignments_active_employee_key
job_assignments_active_lead_key
job_assignments_company_id_job_id_id_key
job_assignments_employee_history_idx
job_assignments_job_idx
job_assignments_pkey
job_client_signoffs_job_idx
job_client_signoffs_pkey
job_client_signoffs_signature_object_path_key
job_completion_snapshots_job_id_key
job_completion_snapshots_job_idx
job_completion_snapshots_pkey
job_materials_job_idx
job_materials_pkey
job_notes_job_idx
job_notes_pkey
job_number_counters_pkey
job_photos_job_idx
job_photos_object_path_key
job_photos_pkey
job_test_results_job_idx
job_test_results_pkey
job_time_entries_company_id_job_id_id_key
job_time_entries_employee_open_key
job_time_entries_job_idx
job_time_entries_job_time_idx
job_time_entries_pkey
job_work_days_company_id_job_id_id_key
job_work_days_job_idx
job_work_days_pkey
job_work_days_session_id_key
jobs_company_created_idx
jobs_company_id_id_key
jobs_company_id_job_number_key
jobs_company_status_schedule_idx
jobs_pkey
```

All 28 function signatures (argument names/defaults omitted for identity):

```text
add_job_evidence(uuid,uuid,bigint,text,jsonb)
admin_close_job_session(uuid,uuid,bigint,uuid,text)
approve_job_complete(uuid,uuid,bigint,text)
assign_job_employee(uuid,uuid,bigint,text,text)
can_access_company_jobs(uuid)
can_access_job(uuid,uuid)
can_manage_company_jobs(uuid)
cancel_job(uuid,uuid,bigint,text)
create_job(uuid,jsonb)
create_job_with_team(uuid,jsonb,text[],text,boolean,timestamptz)
enforce_jobs_enabled_update()
finish_work_for_today(uuid,uuid,bigint,text,text)
jobs_actor(uuid)
jobs_lock(uuid,uuid,bigint)
jobs_log(uuid,uuid,text,text,jsonb)
jobs_next_job_number(uuid,integer)
jobs_no_open_sessions(uuid,uuid)
jobs_protect_history()
jobs_require_lead(uuid,uuid)
jobs_snapshot(uuid,uuid)
jobs_touch(uuid,uuid)
replace_job_lead(uuid,uuid,bigint,text)
resubmit_job_for_review(uuid,uuid,bigint)
return_job_for_correction(uuid,uuid,bigint,text)
schedule_job(uuid,uuid,bigint,timestamptz,timestamptz)
start_job_work(uuid,uuid,bigint)
submit_job_for_review(uuid,uuid,bigint)
unassign_job_employee(uuid,uuid,bigint,text)
```

Triggers: companies.enforce_jobs_enabled_update plus jobs_protect_history on jobs,
job_assignments, job_time_entries, job_work_days, job_materials, job_test_results,
job_notes, job_photos, job_client_signoffs, job_activity and
job_completion_snapshots. Policies: jobs_read on those same 11 content tables.
All scoped names checked; no existing shared trigger or policy is replaced.

### Exact remaining executor evidence and execution-method conclusion

A separately provided read-only export of the following *effective results*,
under the same intended SQL Editor role/database, would resolve the authority gap:

```sql
select current_user, session_user, current_database(),
       pg_get_userbyid(d.datdba) as database_owner,
       has_schema_privilege(current_user,'public','CREATE') as public_create,
       has_schema_privilege(current_user,'public','USAGE') as public_usage,
       has_language_privilege(current_user,'sql','USAGE') as sql_usage,
       has_language_privilege(current_user,'plpgsql','USAGE') as plpgsql_usage
from pg_database d where d.datname=current_database();
```

This query was NOT executed here, nor was any production connection made.
No permission mutation is requested. Missing evidence must not be replaced by a
grant, role change, assumed Supabase default or local superuser success.

Manual SQL Editor execution of ONLY the exact frozen migration is technically
appropriate once authority is established and separately approved. Its BEGIN,
COMMIT, 5s lock_timeout and 60s statement_timeout remain intact. Use a fresh
execution transaction, not the read-only catalog-capture transaction. No CLI,
history replay or frontend deployment. The verdict is not execution authorization.

## Final addendum — executor permission gate closed, 8 September 2026

This supersedes the preceding executor-gate verdict only. Historical evidence and
installation-time/later-enablement checks remain intact.

Inspected and parsed the actual CSV
`C:/Users/fenge/Downloads/Supabase Snippet Untitled query (1).csv`, JSON column
`shiftly_jobs_executor_permission_review`, captured
`2026-09-08T03:30:22.624718+00:00`.

- Identity: database/current_user/session_user all postgres;
  transaction_read_only = on at capture.
- public schema: owner pg_database_owner; effective CREATE = true and USAGE = true.
- PL/pgSQL: exists = true, trusted = true, effective USAGE = true;
  language owner supabase_admin. Ownership of the language is not required to use it.
- Database: owner postgres; current user is owner; CONNECT/CREATE/TEMPORARY true.
- Effective pg_database_owner membership = true; supabase_admin membership = false.
- companies owner postgres; current_user_owns_companies = true.

**Executor conclusion:** the outstanding authority concern is closed. Effective
public CREATE/USAGE permits creating the reviewed Jobs objects; trusted PL/pgSQL
USAGE permits the reviewed PL/pgSQL functions/DO block. companies ownership
permits the additive ALTER and entitlement trigger. The executor owns newly
created Jobs tables/functions and can create their indexes, triggers and policies,
enable RLS, and grant/revoke privileges on those objects. Prior catalog evidence
establishes ownership of the referenced shared public tables. Neither superuser
nor supabase_admin membership is required for these reviewed operations. No
auth/storage schema ownership or privilege changes are proposed.

Branch/HEAD remain feature/shiftly-jobs /
48f88db7dbdf0d8747573e1d75ec11670809d156. Existing tracked/untracked Jobs WIP is
preserved; nothing staged. Only this report changed in this verdict-update phase.

Migration SQL changed: **NO**. Current SHA256 remains exactly:
`8d6ecee456cd0ab7a8c63e27d7ea36225414868fe23abf2c68856eba97935f5d`.

Checks rerun: actual CSV/JSON parsing, branch/HEAD/status, migration hash,
four SQL static regression tests (4/4 PASS), git diff --check (PASS; existing
LF/CRLF warnings only). Previous PostgreSQL 17.6 migration/security/lifecycle/
concurrency evidence and 27/27 regression results are retained. No database suite
rerun because SQL is unchanged; no new database execution is claimed.

**Remaining blockers before dormant backend installation: none identified.**
Previously documented installation preflight checks still apply: separate explicit
authorization, correct project/executor, unchanged frozen SQL, current collision
checks including implicit table types, backup/lock window, and a write-enabled
execution transaction rather than the read-only capture transaction. Afterward
verify all companies jobs_enabled=false and existing-app behaviour. Hard-delete
retention semantics remain approved. Media, first-company enablement, production
adapter connection and frontend deployment remain separate later approvals.

**Final verdict: READY FOR PRODUCTION BACKEND EXECUTION.**

This verdict covers ONLY installing the reviewed backend foundation with every
company disabled, frontend disconnected and media disconnected. It is NOT
authorization to execute the migration. No migration, company enablement, Storage
creation or frontend connection occurred. Production connections/writes/schema
changes, commits, pushes and deployments in this phase: **ZERO**.
