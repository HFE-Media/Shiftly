const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');

const path='supabase/migrations/20260925190000_jobs_admin_field_work.sql';
const sql=fs.readFileSync(path,'utf8');
const code=sql.replace(/--[^\n]*/g,'');

test('admin field-work migration is forward-only and isolated from attendance, payroll and staffing',()=>{
  assert.match(code,/^\s*begin;/);
  assert.match(code,/commit;\s*$/);
  assert.doesNotMatch(code,/\b(drop table|truncate|delete from)\b/i);
  assert.doesNotMatch(code,/public\.(clock_events|time_entries|payroll_|employee_payroll|company_payroll)/i);
  assert.doesNotMatch(code,/(insert into|update|delete from)\s+public\.job_assignments/i);
  assert.match(code,/alter table public\.job_time_entries alter column employee_id drop not null/);
  assert.match(code,/alter table public\.job_work_days alter column employee_id drop not null/);
});

test('manager sessions use authenticated user ownership and preserve open-session protection',()=>{
  assert.match(code,/job_time_entries_manager_open_key[\s\S]*\(company_id,started_by\)[\s\S]*employee_id is null/);
  assert.match(code,/a\.role in \('owner','admin'\)[\s\S]*e\.employee_id is null and e\.started_by=a\.user_id/);
  assert.match(code,/pg_advisory_xact_lock/);
  assert.match(code,/jobs_require_lead\(p_company_id,p_job_id\)/);
  assert.match(code,/jobs_lock\(p_company_id,p_job_id,p_revision\)/);
  assert.match(code,/worker_id:=null/);
});

test('supervisor execution remains employee and assignment scoped',()=>{
  const foundation=fs.readFileSync('supabase/migrations/20260904100000_jobs_foundation.sql','utf8');
  assert.match(foundation,/u\.role='supervisor'[\s\S]*a\.job_id=p_job_id and a\.unassigned_at is null/);
  assert.match(code,/a\.role='supervisor' and e\.employee_id=a\.employee_id/);
  assert.match(code,/a\.role='supervisor'[\s\S]*job_assignments[\s\S]*employee_id=a\.employee_id[\s\S]*unassigned_at is null/);
});

test('operational RPCs retain pinned definers, exact grants and lifecycle checks',()=>{
  for(const name of ['start_job_work','finish_work_for_today','add_job_evidence','jobs_r2_photo_context','jobs_register_r2_photo']){
    const body=code.match(new RegExp(`create or replace function public\\.${name}\\([\\s\\S]*?end \\$\\$;`,'i'))?.[0];
    assert.ok(body,name);
    assert.match(body,/security definer set search_path=pg_catalog,public/);
  }
  assert.match(code,/lifecycle_status not in \('scheduled','in_progress','correction_required'\)/);
  assert.match(code,/j\.lifecycle_status<>'in_progress'/);
  assert.match(code,/Own open session required/);
  assert.match(code,/revoke all on function public\.start_job_work\(uuid,uuid,bigint\) from public,anon,authenticated/);
  assert.match(code,/grant execute on function public\.jobs_register_r2_photo\([^;]+\) to service_role/);
});

test('manager evidence is limited to active-session work and cannot claim assignment identity',()=>{
  assert.match(code,/a\.role in \('owner','admin'\) and p_kind not in \('material','test','note'\)/);
  assert.match(code,/case when a\.role='supervisor' then a\.employee_id else null end/);
  assert.match(code,/worker_id:=null/);
  assert.match(code,/existing\.actor_user_id=p_actor/);
});
