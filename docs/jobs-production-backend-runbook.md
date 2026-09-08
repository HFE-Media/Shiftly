# Shiftly Jobs — frozen backend execution packet

INSTRUCTIONS ONLY. Production execution is NOT authorized by this document.
Wait for separate explicit user approval. No SQL below has been run in production
by the agent preparing this packet.

## Frozen release

- Project: **Shiftly — szougedvngaoratbtars**.
- Method: **MANUAL SUPABASE SQL EDITOR ONLY**.
- Branch: feature/shiftly-jobs.
- Local checkpoint: `a95942bcc3b500fce2b5445436e8f53bdc3107a4`.
- Parent: `48f88db7dbdf0d8747573e1d75ec11670809d156`.
- Migration: `supabase/migrations/20260904100000_jobs_foundation.sql`.
- SHA256: `8d6ecee456cd0ab7a8c63e27d7ea36225414868fe23abf2c68856eba97935f5d`.
- Readiness evidence: jobs-final-validation.md, including final executor addendum.
- This checkpoint also contains local UI WIP. **Do not deploy the branch/public
  folder or connect the frontend. Only the exact migration is the installation payload.**

No supabase db push, migration up, linked CLI, automatic migration-history replay,
CI deployment, Storage setup or company enablement. No other migration is included.
The runbook was prepared after the checkpoint and is intentionally not part of that
one implementation commit.

## Pre-execution checklist — all required, otherwise STOP

1. Obtain explicit backend-installation-only approval. Visually confirm project
   name AND ref szougedvngaoratbtars in SQL Editor.
2. Confirm exact frozen file/hash above. Check local SHA256 with Get-FileHash.
   Git checkout may convert LF to CRLF on Windows; use byte-preserving extraction
   from the frozen Git blob if needed, then verify the approved hash. Do not edit
   or normalize the approved SQL interactively to resolve a hash mismatch.
3. Verify Jobs tables, indexes, functions, policies, trigger names and implicit
   table types remain absent, using the complete inventory in the review addendum.
   Verify companies.jobs_enabled and companies entitlement trigger absent.
4. Confirm no schema change since the reviewed catalog invalidates the foundation,
   helper/trigger definitions, ACLs, executor ownership or FK targets. Preserve
   read-only pre-install outputs for comparisons below. Stop on unexplained drift.
5. Confirm SQL Editor current_user postgres, database postgres, effective public
   CREATE/USAGE and trusted PL/pgSQL USAGE, and companies ownership as reviewed.
6. Confirm backup/recovery availability and a low-activity window for the brief
   exclusive companies lock. Do not disable locks/timeouts or security controls.
7. Frontend remains undeployed/disconnected, customer Jobs navigation hidden,
   media disconnected. No company will be enabled in this installation session.
8. Frozen SQL still contains BEGIN, COMMIT, lock_timeout=5s and
   statement_timeout=60s. Execute in a fresh write-enabled session, NOT inside the
   read-only catalog-capture transaction. Do not add statements to the payload.

### Read-only baseline for later comparison

Run the shared/Storage comparison queries below before installation and preserve
their complete results securely outside Git. They must match after installation.
The supplied catalog already contains shared helper and trigger definitions/ACLs;
compare with those too. Storage before/after evidence is necessary: a post-only
query cannot prove that pre-existing Storage was unchanged.

## Eventual execution — after separate approval only

1. Open Supabase SQL Editor manually; visually reconfirm project/ref.
2. Paste ONLY the complete frozen migration contents, with the verified hash.
   Do not paste this runbook, tests, another migration or verification queries into
   the migration transaction. Do not alter SQL interactively.
3. Execute once. Capture the full result, notices or error and execution time.
4. On any PostgreSQL error: STOP. Do not continue selected statements, rerun the
   migration blindly or improvise cleanup. A failed transaction must not commit;
   if the editor leaves it open/aborted, explicitly ROLLBACK that transaction.
   Preserve the error for review. Do not assume an ambiguous timeout means success.
5. Only after confirmed successful COMMIT, perform the read-only checks below.
   Any discrepancy stops rollout, not permission to repair production ad hoc.

## Immediate post-install read-only SQL

Each block is a separate read-only transaction ending in ROLLBACK. Expected tables
must all exist before running the explicit count query. Save outputs. Missing rows
or unexpected extra Jobs objects are failures, not a successful empty result.

### A, B, C, D, I, K — flag, entitlement, table inventory and RLS

```sql
begin transaction read only;
select table_schema,table_name,column_name,data_type,is_nullable,column_default
from information_schema.columns
where table_schema='public' and table_name='companies' and column_name='jobs_enabled';
-- Exactly one row: boolean, NO, false (equivalent typed false acceptable).
select count(*) as companies_not_disabled
from public.companies where jobs_enabled is distinct from false;
-- MUST be zero.
with expected(name) as (values
 ('jobs'),('job_number_counters'),('job_assignments'),('job_time_entries'),
 ('job_work_days'),('job_materials'),('job_test_results'),('job_notes'),
 ('job_photos'),('job_client_signoffs'),('job_activity'),('job_completion_snapshots'),
 ('companies'),('company_users'),('employees'),('sites'),('platform_admins'))
select e.name,c.oid is not null as exists,c.relkind,c.relrowsecurity,
       c.relforcerowsecurity,pg_get_userbyid(c.relowner) as owner
from expected e left join pg_class c
 on c.relnamespace='public'::regnamespace and c.relname=e.name
order by e.name;
-- Exactly 17 rows, exists=true, relkind=r, relrowsecurity=true, owner=postgres.
rollback;
```

### E — exact functions/RPC signatures, security and grants

```sql
begin transaction read only;
with expected(signature) as (values
 ('add_job_evidence(uuid,uuid,bigint,text,jsonb)'),
 ('admin_close_job_session(uuid,uuid,bigint,uuid,text)'),
 ('approve_job_complete(uuid,uuid,bigint,text)'),
 ('assign_job_employee(uuid,uuid,bigint,text,text)'),
 ('can_access_company_jobs(uuid)'),('can_access_job(uuid,uuid)'),
 ('can_manage_company_jobs(uuid)'),('cancel_job(uuid,uuid,bigint,text)'),
 ('create_job(uuid,jsonb)'),
 ('create_job_with_team(uuid,jsonb,text[],text,boolean,timestamptz)'),
 ('enforce_jobs_enabled_update()'),('finish_work_for_today(uuid,uuid,bigint,text,text)'),
 ('jobs_actor(uuid)'),('jobs_lock(uuid,uuid,bigint)'),
 ('jobs_log(uuid,uuid,text,text,jsonb)'),('jobs_next_job_number(uuid,integer)'),
 ('jobs_no_open_sessions(uuid,uuid)'),('jobs_protect_history()'),
 ('jobs_require_lead(uuid,uuid)'),('jobs_snapshot(uuid,uuid)'),('jobs_touch(uuid,uuid)'),
 ('replace_job_lead(uuid,uuid,bigint,text)'),('resubmit_job_for_review(uuid,uuid,bigint)'),
 ('return_job_for_correction(uuid,uuid,bigint,text)'),
 ('schedule_job(uuid,uuid,bigint,timestamptz,timestamptz)'),
 ('start_job_work(uuid,uuid,bigint)'),('submit_job_for_review(uuid,uuid,bigint)'),
 ('unassign_job_employee(uuid,uuid,bigint,text)'))
select e.signature,p.oid is not null as exists,pg_get_userbyid(p.proowner) as owner,
 p.prosecdef,p.proconfig,p.proacl,
 has_function_privilege('anon',p.oid,'EXECUTE') as anon_execute,
 has_function_privilege('authenticated',p.oid,'EXECUTE') as authenticated_execute
from expected e left join pg_proc p on p.oid=to_regprocedure('public.'||e.signature)
order by e.signature;
-- 28 exist; postgres owner; safe pg_catalog,public path; 27 definers,
-- jobs_protect_history invoker. Anon denied throughout; 18 authenticated entry
-- points (15 mutations + 3 access helpers), internal 10 denied. No PUBLIC EXECUTE.
select tablename,policyname,roles,cmd,qual,with_check
from pg_policies where schemaname='public'
and (tablename='jobs' or tablename like 'job\_%' escape '\')
order by tablename,policyname;
-- 11 jobs_read SELECT policies using can_access_job; none on counters.
select table_name,grantee,privilege_type
from information_schema.table_privileges where table_schema='public'
and (table_name='jobs' or table_name like 'job\_%' escape '\')
order by table_name,grantee,privilege_type;
-- authenticated SELECT only on 11 content tables; no anon/PUBLIC grants,
-- no browser direct INSERT/UPDATE/DELETE. Compare owner/other ACLs to reviewed model.
rollback;
```

### F — Jobs triggers; keys and indexes

```sql
begin transaction read only;
select c.relname,t.tgname,t.tgenabled,pg_get_triggerdef(t.oid) as definition
from pg_trigger t join pg_class c on c.oid=t.tgrelid
where c.relnamespace='public'::regnamespace and not t.tgisinternal
and (t.tgname='enforce_jobs_enabled_update' or t.tgname='jobs_protect_history')
order by c.relname,t.tgname;
-- Exactly 12 enabled triggers: one companies entitlement guard and 11 history
-- triggers, one per content table. Compare definitions, not counts alone.
select c.relname,k.conname,k.contype,pg_get_constraintdef(k.oid) as definition
from pg_constraint k join pg_class c on c.oid=k.conrelid
where c.relnamespace='public'::regnamespace
and (c.relname='jobs' or c.relname like 'job\_%' escape '\')
order by c.relname,k.conname;
-- 82 constraints: 12 PK, 9 UNIQUE, 28 FK, 33 CHECK; compare reviewed definitions.
select tablename,indexname,indexdef from pg_indexes where schemaname='public'
and (tablename='jobs' or tablename like 'job\_%' escape '\')
order by tablename,indexname;
-- 38 indexes, names/definitions as reviewed; includes one-open-session and lead uniqueness.
rollback;
```

### G, H — shared definitions/ACLs/triggers unchanged (before AND after)

```sql
begin transaction read only;
select p.proname,pg_get_function_identity_arguments(p.oid) as arguments,
 pg_get_userbyid(p.proowner) as owner,p.proacl,p.prosecdef,p.proconfig,
 pg_get_functiondef(p.oid) as definition
from pg_proc p where p.pronamespace='public'::regnamespace and p.proname in
 ('is_platform_admin','can_access_company','can_manage_company',
  'set_company_name_from_company_id','set_site_defaults','generate_company_site_id')
order by p.proname,arguments;
select c.relname,t.tgname,t.tgenabled,pg_get_triggerdef(t.oid) as definition
from pg_trigger t join pg_class c on c.oid=t.tgrelid
where c.relnamespace='public'::regnamespace and not t.tgisinternal
and c.relname in ('companies','company_users','employees','sites','platform_admins')
and t.tgname<>'enforce_jobs_enabled_update'
order by c.relname,t.tgname;
select * from pg_policies where schemaname='public' and tablename in
 ('companies','company_users','employees','sites','platform_admins')
order by tablename,policyname;
select c.relname,pg_get_userbyid(c.relowner) as owner,c.relacl,
 c.relrowsecurity,c.relforcerowsecurity
from pg_class c where c.relnamespace='public'::regnamespace and c.relname in
 ('companies','company_users','employees','sites','platform_admins') order by c.relname;
rollback;
-- All outputs must match the preserved baseline (no missing/changed definitions).
```

### J — exact Jobs data counts (all MUST be zero)

```sql
begin transaction read only;
select 'jobs' as table_name,count(*) as rows from public.jobs
union all select 'job_number_counters',count(*) from public.job_number_counters
union all select 'job_assignments',count(*) from public.job_assignments
union all select 'job_time_entries',count(*) from public.job_time_entries
union all select 'job_work_days',count(*) from public.job_work_days
union all select 'job_materials',count(*) from public.job_materials
union all select 'job_test_results',count(*) from public.job_test_results
union all select 'job_notes',count(*) from public.job_notes
union all select 'job_photos',count(*) from public.job_photos
union all select 'job_client_signoffs',count(*) from public.job_client_signoffs
union all select 'job_activity',count(*) from public.job_activity
union all select 'job_completion_snapshots',count(*) from public.job_completion_snapshots;
rollback;
```

### L — Storage unchanged (before AND after; schema-only baseline plus Jobs absence)

```sql
begin transaction read only;
select nspname,pg_get_userbyid(nspowner) as owner,nspacl
from pg_namespace where nspname='storage';
select c.relname,c.relkind,c.relacl,c.relrowsecurity,c.relforcerowsecurity,
 pg_get_userbyid(c.relowner) as owner
from pg_class c where c.relnamespace='storage'::regnamespace order by c.relname;
select table_name,column_name,data_type,is_nullable,column_default
from information_schema.columns where table_schema='storage'
order by table_name,ordinal_position;
select * from pg_policies where schemaname='storage' order by tablename,policyname;
select c.relname,t.tgname,pg_get_triggerdef(t.oid) as definition
from pg_trigger t join pg_class c on c.oid=t.tgrelid
where c.relnamespace='storage'::regnamespace and not t.tgisinternal order by 1,2;
select p.proname,pg_get_function_identity_arguments(p.oid) as arguments,
 pg_get_userbyid(p.proowner) as owner,p.proacl,pg_get_functiondef(p.oid) as definition
from pg_proc p where p.pronamespace='storage'::regnamespace and p.prokind in ('f','p')
order by 1,2;
select count(*) as jobs_bucket_count from storage.buckets where id='shiftly-jobs-media';
select count(*) as jobs_object_count from storage.objects where bucket_id='shiftly-jobs-media';
rollback;
-- Metadata must match baseline; Jobs counts zero. Do not export customer object
-- names/content. Source review proves migration contains no Storage writes.
-- Concurrent legitimate Storage activity is not caused by this migration; investigate
-- any drift, do not assert a post-only count proves global Storage immutability.
```

## Manual existing-Shiftly smoke checks

After DB verification, use normal login and an approved existing account to inspect:
auth callback (do not generate resets/invites), company load/switch, Admin and
Supervisor dashboards, clocking screen, QR/scanner controls, GPS/geofence status,
hours/time records, employee list, sites, Payroll, Leave, Payslips and Billing.
Prefer read-only navigation and existing records. Do not clock employees, submit
attendance/leave, run payroll, send invitations/resets or create/edit customer
records just to test. Actual write/camera/location workflows that cannot be safely
verified require separately controlled manual testing; record them as deferred.
Stop on regressions, record exact symptoms, and request review.

## Required end state — STOP HERE

- Backend installed; all companies jobs_enabled=false; all Jobs tables empty.
- Frontend disconnected/undeployed; Jobs navigation not exposed to customers.
- Jobs Storage not created/connected; existing Shiftly operating normally.
- Do not enable even the test company in this execution session. Later separate approval.

## Failure / rollback

Before COMMIT: failed transaction rolls back; explicitly ROLLBACK if session remains
aborted. Never continue partial statements or perform ad-hoc cleanup. After a
successful installation, leave entitlements false and frontend disconnected; do
not DROP Jobs objects because rollout pauses. If existing Shiftly is affected,
capture symptoms and stop for reviewed remediation. Disabling does not undo FK
retention constraints. No destructive rollback or timeout/security bypass is authorized.
