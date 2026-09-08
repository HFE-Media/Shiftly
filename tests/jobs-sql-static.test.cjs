// Source-level guardrails ONLY. These do not execute/validate PostgreSQL or RLS.
const test=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');
const sql=fs.readFileSync('supabase/migrations/20260904100000_jobs_foundation.sql','utf8');
const code=sql.replace(/--[^\n]*/g,'');
test('migration remains transactional, additive and Jobs isolated',()=>{
  assert.match(code,/^\s*begin;/);assert.match(code,/commit;\s*$/);
  assert.doesNotMatch(code,/\b(drop|truncate)\s|create\s+or\s+replace|on delete cascade/i);
  assert.doesNotMatch(code,/public\.(clock_events|clock_batch|time_entries|supervisors)\b/);
  assert.deepEqual([...code.matchAll(/alter table public\.(\w+)/gi)].map(m=>m[1]),['companies']);
  assert.match(code,/add column jobs_enabled boolean not null default false/);
});
test('all 12 Jobs tables participate in the explicit RLS/revoke loop',()=>{
  const tables=[...code.matchAll(/create table public\.(\w+)/g)].map(m=>m[1]);assert.equal(tables.length,12);
  for(const t of tables)assert.ok(code.includes(`'${t}'`),`${t} allowlisted`);
  assert.match(code,/enable row level security/);assert.match(code,/revoke all on public\.%I from public,anon,authenticated/);
  assert.match(code,/grant select on public\.%I to authenticated/);assert.doesNotMatch(code,/grant\s+(insert|update|delete|all)\b/i);
});
test('definers pin search_path and revoke every exact declared signature',()=>{
  const functions=[...code.matchAll(/create function public\.(\w+)\([^]*?\$\$;/g)].map(m=>m[0]);
  assert.ok(functions.length>=25);
  for(const f of functions){const name=f.match(/public\.(\w+)/)[1];assert.match(f,/set search_path\s*=\s*pg_catalog,\s*public/);assert.ok(code.includes(`'public.${name}(`),`${name} revoked`);}
  assert.match(code,/revoke all on function %s from public,anon,authenticated/);
});
test('concurrency and history controls remain explicit',()=>{
  for(const pattern of [/p_revision is null or j.revision<>p_revision/,/pg_advisory_xact_lock/,/job_time_entries_employee_open_key/,/job_assignments_active_lead_key/,/on conflict\(company_id,number_year\)/,/Jobs history cannot be hard deleted/,/Closed Job evidence is immutable/,/insert into public.job_completion_snapshots/])assert.match(code,pattern);
  assert.doesNotMatch(code,/lifecycle_status\s*=\s*'paused'/);
});
