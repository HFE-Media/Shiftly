-- NOT EXECUTED. Run only in a disposable, prepared test database AFTER review.
-- Requires psql variables pointing to existing TEST fixtures:
-- company_a/company_b; owner/admin/lead/second_supervisor/unassigned/employee/
-- outsider/platform (auth UUIDs); lead_employee/second_employee/member_employee.
-- Owner/admin/lead/second/unassigned/employee belong to company_a; outsider only
-- to company_b. Platform is a platform_admin with NO company_a membership.
-- lead and second must be linked to active employees; member is ordinary employee.
-- Every mutation is rolled back. The explicit test switch prevents casual use.
\set ON_ERROR_STOP on
\if :{?jobs_disposable_test_database}
\else
  \echo 'STOP: set jobs_disposable_test_database explicitly in a disposable test database.'
  \quit
\endif
begin;
set local lock_timeout='3s';
select set_config('jobs.test_company',:'company_a',true);
create function pg_temp.assert_true(value boolean,message text) returns void language plpgsql as $$
begin if value is distinct from true then raise exception 'ASSERT FAILED: %',message; end if; end $$;
create function pg_temp.denied(statement text,code text default null) returns void language plpgsql as $$
declare failed boolean:=false;
begin
  begin execute statement;
  exception when others then
    if code is not null and sqlstate<>code then raise exception 'Wrong error %, expected %: %',sqlstate,code,sqlerrm; end if;
    failed:=true;
  end;
  if not failed then raise exception 'Expected statement to fail: %',statement; end if;
end $$;
-- Fixture setup uses only the new entitlement column. This is not production SQL.
select set_config('request.jwt.claims','{"role":"service_role"}',true);
update public.companies set jobs_enabled=false where id=:'company_a';
set local role authenticated;
select set_config('request.jwt.claims',jsonb_build_object('role','authenticated','sub',:'owner')::text,true);
select pg_temp.assert_true(not public.can_access_company_jobs(:'company_a'),'flag false denies owner');
select pg_temp.denied(format('select public.create_job(%L,%L::jsonb)',:'company_a','{"title":"Test","client_name":"Test"}'),'42501');
select pg_temp.denied(format('update public.companies set jobs_enabled=true where id=%L',:'company_a'),'42501');
reset role;
select set_config('request.jwt.claims','{"role":"service_role"}',true);
update public.companies set jobs_enabled=true where id in (:'company_a',:'company_b');
set local role authenticated;
select set_config('request.jwt.claims',jsonb_build_object('role','authenticated','sub',:'owner')::text,true);
select pg_temp.assert_true(public.can_manage_company_jobs(:'company_a'),'owner manages');
select id as job_id,revision as revision,job_number as number from public.create_job(:'company_a','{"title":"Security test","client_name":"Neutral fixture"}') \gset
select public.assign_job_employee(:'company_a',:'job_id',:revision,:'lead_employee','lead') as revision \gset
select pg_temp.denied(format('select public.assign_job_employee(%L,%L,%s,%L,%L)',:'company_a',:'job_id',:revision,:'lead_employee','member'),'23505');
select pg_temp.denied(format('select public.assign_job_employee(%L,%L,%s,%L,%L)',:'company_a',:'job_id',:revision,:'second_employee','lead'),'23505');
select public.assign_job_employee(:'company_a',:'job_id',:revision,:'second_employee','member') as revision \gset
select public.assign_job_employee(:'company_a',:'job_id',:revision,:'member_employee','member') as revision \gset
select public.replace_job_lead(:'company_a',:'job_id',:revision,:'second_employee') as revision \gset
select pg_temp.assert_true((select count(*)=1 from public.job_assignments where job_id=:'job_id' and assignment_role='lead' and unassigned_at is null),'atomic lead replacement');
select public.replace_job_lead(:'company_a',:'job_id',:revision,:'lead_employee') as revision \gset
-- Re-add second as member after replacement ended that assignment.
select public.assign_job_employee(:'company_a',:'job_id',:revision,:'second_employee','member') as revision \gset
select public.schedule_job(:'company_a',:'job_id',:revision,now()) as revision \gset
select pg_temp.assert_true((select lifecycle_status='scheduled' from public.jobs where id=:'job_id'),'draft -> scheduled');
select set_config('request.jwt.claims',jsonb_build_object('role','authenticated','sub',:'admin')::text,true);
select pg_temp.assert_true(public.can_access_job(:'company_a',:'job_id'),'admin sees company job');
-- Every Jobs table must deny ordinary employee, outsider and platform-only user.
select set_config('request.jwt.claims',jsonb_build_object('role','authenticated','sub',:'employee')::text,true);
select pg_temp.assert_true(not public.can_access_job(:'company_a',:'job_id'),'assigned normal employee denied');
select pg_temp.denied(format('select public.start_job_work(%L,%L,%s)',:'company_a',:'job_id',:revision),'42501');
select pg_temp.denied(format('select public.finish_work_for_today(%L,%L,%s,%L)',:'company_a',:'job_id',:revision,'Work'),'42501');
select pg_temp.denied(format('select public.submit_job_for_review(%L,%L,%s)',:'company_a',:'job_id',:revision),'42501');
select pg_temp.assert_true((select count(*)=0 from public.job_assignments where job_id=:'job_id'),'employee assignment reads denied');
select set_config('request.jwt.claims',jsonb_build_object('role','authenticated','sub',:'unassigned')::text,true);
select pg_temp.assert_true(not public.can_access_job(:'company_a',:'job_id'),'unassigned supervisor denied');
select set_config('request.jwt.claims',jsonb_build_object('role','authenticated','sub',:'outsider')::text,true);
select pg_temp.assert_true((select count(*)=0 from public.jobs where id=:'job_id'),'cross tenant denied');
select set_config('request.jwt.claims',jsonb_build_object('role','authenticated','sub',:'platform')::text,true);
select pg_temp.assert_true(not public.can_access_job(:'company_a',:'job_id'),'platform content denied');
select set_config('request.jwt.claims',jsonb_build_object('role','authenticated','sub',:'lead')::text,true);
select pg_temp.assert_true(public.can_access_job(:'company_a',:'job_id'),'assigned supervisor reads');
select public.start_job_work(:'company_a',:'job_id',:revision) as session_one \gset
select revision from public.jobs where id=:'job_id' \gset
select pg_temp.denied(format('select public.start_job_work(%L,%L,%s)',:'company_a',:'job_id',:revision),'23505');
select pg_temp.denied(format('select public.submit_job_for_review(%L,%L,%s)',:'company_a',:'job_id',:revision));
select set_config('request.jwt.claims',jsonb_build_object('role','authenticated','sub',:'admin')::text,true);
select pg_temp.denied(format('select public.unassign_job_employee(%L,%L,%s,%L)',:'company_a',:'job_id',:revision,:'lead_employee'));
select set_config('request.jwt.claims',jsonb_build_object('role','authenticated','sub',:'second_supervisor')::text,true);
select public.start_job_work(:'company_a',:'job_id',:revision) as session_two \gset
select revision from public.jobs where id=:'job_id' \gset
select pg_temp.assert_true((select count(*)=2 from public.job_time_entries where job_id=:'job_id'),'assigned supervisor sees team time');
select set_config('request.jwt.claims',jsonb_build_object('role','authenticated','sub',:'lead')::text,true);
select public.finish_work_for_today(:'company_a',:'job_id',:revision,'First day work','Continue tomorrow');
select revision from public.jobs where id=:'job_id' \gset
select pg_temp.assert_true((select ended_at is null from public.job_time_entries where id=:'session_two'),'finish did not close teammate session');
select pg_temp.denied(format('select public.submit_job_for_review(%L,%L,%s)',:'company_a',:'job_id',:revision));
select set_config('request.jwt.claims',jsonb_build_object('role','authenticated','sub',:'second_supervisor')::text,true);
select public.finish_work_for_today(:'company_a',:'job_id',:revision,'Teammate work','');
select revision from public.jobs where id=:'job_id' \gset
select set_config('request.jwt.claims',jsonb_build_object('role','authenticated','sub',:'lead')::text,true);
select public.start_job_work(:'company_a',:'job_id',:revision);
select revision from public.jobs where id=:'job_id' \gset
select public.finish_work_for_today(:'company_a',:'job_id',:revision,'Second session work','');
select revision from public.jobs where id=:'job_id' \gset
select pg_temp.assert_true((select count(*)=3 from public.job_work_days where job_id=:'job_id'),'separate work records persist');
select public.submit_job_for_review(:'company_a',:'job_id',:revision) as revision \gset
select set_config('request.jwt.claims',jsonb_build_object('role','authenticated','sub',:'admin')::text,true);
select public.return_job_for_correction(:'company_a',:'job_id',:revision,'Record final test') as revision \gset
select set_config('request.jwt.claims',jsonb_build_object('role','authenticated','sub',:'lead')::text,true);
select public.add_job_evidence(:'company_a',:'job_id',:revision,'test','{"description":"Final check","result":"PASS"}');
select revision from public.jobs where id=:'job_id' \gset
select public.resubmit_job_for_review(:'company_a',:'job_id',:revision) as revision \gset
select set_config('request.jwt.claims',jsonb_build_object('role','authenticated','sub',:'admin')::text,true);
select public.approve_job_complete(:'company_a',:'job_id',:revision) as revision \gset
select pg_temp.assert_true((select payload->'job'->>'lifecycle_status'='completed' from public.job_completion_snapshots where job_id=:'job_id'),'completion snapshot');
select pg_temp.denied(format('select public.approve_job_complete(%L,%L,%s)',:'company_a',:'job_id',:revision));
select pg_temp.denied(format('update public.jobs set title=%L where id=%L','Changed',:'job_id'),'42501');
select pg_temp.denied(format('delete from public.job_activity where job_id=%L',:'job_id'),'42501');
-- Inspect every table's security configuration and employee SELECT isolation.
select set_config('request.jwt.claims',jsonb_build_object('role','authenticated','sub',:'employee')::text,true);
do $$
declare t text; n bigint;
begin
  foreach t in array array['jobs','job_assignments','job_time_entries','job_work_days','job_materials','job_test_results','job_notes','job_photos','job_client_signoffs','job_activity','job_completion_snapshots'] loop
    perform pg_temp.assert_true((select relrowsecurity from pg_class where oid=('public.'||t)::regclass),'RLS enabled: '||t);
    perform pg_temp.assert_true(not has_table_privilege('authenticated','public.'||t,'INSERT,UPDATE,DELETE'),'no direct browser writes: '||t);
    perform pg_temp.assert_true(not has_table_privilege('anon','public.'||t,'SELECT,INSERT,UPDATE,DELETE'),'anon denied: '||t);
    execute format('select count(*) from public.%I where company_id=$1',t) into n using current_setting('jobs.test_company')::uuid;
    perform pg_temp.assert_true(n=0,'employee cannot SELECT: '||t);
  end loop;
  perform pg_temp.assert_true(not has_table_privilege('authenticated','public.job_number_counters','SELECT,INSERT,UPDATE,DELETE'),'counter private');
end $$;
select set_config('request.jwt.claims',jsonb_build_object('role','authenticated','sub',:'lead')::text,true);
select pg_temp.denied(format('select public.add_job_evidence(%L,%L,%s,%L,%L::jsonb)',:'company_a',:'job_id',:revision,'note','{"note":"Changed"}'));
-- Numbering collision and tenant/year isolation; internal helper is inaccessible.
select pg_temp.denied(format('select public.jobs_next_job_number(%L,2027)',:'company_a'),'42501');
reset role;
select set_config('request.jwt.claims','{"role":"service_role"}',true);
select public.jobs_next_job_number(:'company_a',2098) as number_one \gset
select public.jobs_next_job_number(:'company_a',2098) as number_two \gset
select pg_temp.assert_true(:'number_one'<>:'number_two','unique year allocator');
select pg_temp.assert_true(public.jobs_next_job_number(:'company_a',2099)='JC-2099-0001','year rollover');
select pg_temp.assert_true(public.jobs_next_job_number(:'company_b',2099)='JC-2099-0001','company isolation');
-- Privileged accidental substantive edits are stopped by history trigger too.
select pg_temp.denied(format('update public.job_work_days set work_performed=%L where job_id=%L','Changed',:'job_id'));
select pg_temp.denied(format('delete from public.jobs where id=%L',:'job_id'));
rollback;
\echo 'Jobs SQL assertions passed; all changes rolled back.'

-- Concurrency rehearsal (two sessions, disposable DB only):
-- A: BEGIN; call start_job_work with current revision; keep transaction open.
-- B: call start_job_work for SAME employee on a DIFFERENT scheduled assigned Job.
-- B must wait, then fail 23505 after A commits. Roll fixture changes back/reset.
-- Also race two create_job_with_team calls: numbers must be distinct.
-- Race submit against teammate start: exactly one valid ordering must commit;
-- submitted Job must never retain an open session. These multi-session cases
-- require separate staging execution and are NOT claimed by this script.
