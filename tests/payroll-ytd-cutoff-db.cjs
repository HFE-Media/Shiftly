// Explicitly isolated PostgreSQL test. Starts its own fresh loopback-only cluster.
// Does not read .env, Supabase config, production data, or run old migration/backfill files.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
// Local prerequisites (not installed by this test):
// npm install --prefix tmp/jobs-pg-runtime pg @embedded-postgres/windows-x64
// PAYROLL_TEST_RUNTIME may point to another installation of these dependencies.
const runtime = path.resolve(process.env.PAYROLL_TEST_RUNTIME || 'tmp/jobs-pg-runtime');
const runtimeRequire = require('node:module').createRequire(path.join(runtime, 'package.json'));
const { Client } = runtimeRequire('pg');
const ph = require('../public/payroll-history.js');
const native = path.join(runtime, 'node_modules/@embedded-postgres/windows-x64/native/bin');
fs.mkdirSync(path.resolve('tmp'), { recursive: true });
const root = fs.mkdtempSync(path.resolve('tmp/payroll-isolated-'));
const dataDir = path.join(root, 'data');
const port = 54398;
const c1 = '10000000-0000-0000-0000-000000000001', c2 = '10000000-0000-0000-0000-000000000002';
const owner = '20000000-0000-0000-0000-000000000001', employee = '20000000-0000-0000-0000-000000000002';
let admin, started = false, passed = 0;
const connections = [];
function nativeRun(name,args) {
  const r=spawnSync(path.join(native,name+'.exe'),args,{encoding:'utf8',windowsHide:true,timeout:30000});
  if (r.status !== 0) throw Error(`${name}: ${r.stderr || r.stdout || r.error}`);
}
async function connect() { const c=new Client({host:'127.0.0.1',port,user:'postgres',database:'postgres',connectionTimeoutMillis:3000}); await c.connect(); connections.push(c); return c; }
async function user(id=owner) { const c=await connect(); await c.query('set role authenticated'); await c.query("select set_config('request.jwt.claim.sub',$1,false)",[id]); return c; }
function ok(label) { passed++; console.log('PASS '+label); }
async function fails(promise, pattern) { await assert.rejects(promise, pattern); }
async function call(client, fn, args) { return (await client.query(`select public.${fn}(${args.map((_,i)=>'$'+(i+1)).join(',')}) result`,args)).rows[0].result; }
// Internal transaction tests submit synthetic fixtures through the private service boundary.
async function trusted(client, company, request, value) {
  const actor=(await client.query('select auth.uid() actor')).rows[0].actor;
  const service=await connect();
  try { await service.query('set role service_role'); return await call(service,'commit_trusted_payroll',[company,request,value,actor]); }
  finally { await service.end(); }
}
const id = () => require('node:crypto').randomUUID();
async function payload(client, company=c1, start='2026-09-01', end='2026-09-15', flags={calculate_paye:true,calculate_uif:true}) {
  const history=await call(client,'get_payroll_history',[company,start,end]);
  return {version:ph.VERSION,start,end,revision:history.revision,company:{id:company,name:'Synthetic fixture',logo_url:''},rules:flags,levy:null,
    rows:['E1','E2'].map(employee_id=>ph.employeeSnapshot({employee_id,employee_name:employee_id,gross:10000,pay_cycle:'monthly',rate:10000,
      deductions:[...(flags.calculate_paye?[{description:'Tax',amount:1500,active:true}]:[]),...(flags.calculate_uif?[{description:'UIF',amount:100,active:true}]:[])]},flags))};
}
async function main() {
  nativeRun('initdb',['-D',dataDir,'-U','postgres','-A','trust','--no-locale','-E','UTF8']);
  nativeRun('pg_ctl',['-D',dataDir,'-l',path.join(root,'postgres.log'),'-o',`-h 127.0.0.1 -p ${port}`,'-w','start']); started=true;
  admin=await connect();
  assert.equal((await admin.query('show data_directory')).rows[0].data_directory.replaceAll('\\','/'),dataDir.replaceAll('\\','/'));
  assert.equal((await admin.query('select host(inet_server_addr()) ip')).rows[0].ip,'127.0.0.1');
  await admin.query(`
    create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;
    create schema auth; create table auth.users(id uuid primary key);
    create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
    grant usage on schema public,auth to authenticated,anon; grant execute on function auth.uid() to authenticated;
    create table companies(id uuid primary key,name text,status text default 'active',logo_url text);
    create table company_users(company_id uuid,user_id uuid,role text,active boolean default true,employee_id text);
    create table employees(company_id uuid,employee_id text,full_name text,id_number text,employment_date date,pay_type text default 'monthly',pay_cycle text default 'monthly',rate numeric,active boolean default true,nbcei_designation_code text,sbf_member boolean default false,saewa_member boolean default false,primary key(company_id,employee_id));
    create table company_payroll_rules(company_id uuid primary key,calculate_paye boolean default true,calculate_uif boolean default true);
    create table company_deduction_types(id uuid primary key,company_id uuid,name text,active boolean default true);
    create table payroll_deductions(id uuid primary key,company_id uuid,employee_id text,period_start date,period_end date,description text,amount numeric,active boolean default true);
    create table payroll_adjustments(id uuid primary key,company_id uuid,employee_id text,period_start date,period_end date,type text,hours numeric,amount numeric,active boolean default true);
    create table company_payroll_levy_periods(id uuid primary key,company_id uuid,period_start date,period_end date,levy_scheme text default 'nbcei',levy_weeks integer,rate_version text,employee_designations jsonb,employee_levy_memberships jsonb);
    create table clock_events(entry_id uuid primary key,company_id uuid,employee_id text,employee_name text,created_at timestamptz,action text,result text,message text);
    create table employee_payroll_ytd_opening_balances(id uuid primary key default gen_random_uuid(),company_id uuid,employee_id text,tax_year_start date,as_of_date date,completed_periods smallint,gross_remuneration numeric(14,2) default 0,retirement_fund_contributions numeric(14,2) default 0,paye_deducted numeric(14,2) default 0,uif_combined numeric(14,2),unique(company_id,employee_id,tax_year_start));
    create table employee_payroll_period_totals(id uuid primary key default gen_random_uuid(),company_id uuid,employee_id text,tax_year_start date,period_start date,period_end date,period_number smallint check(period_number between 1 and 52),gross_remuneration numeric(14,2),retirement_fund_contributions numeric(14,2),paye_deducted numeric(14,2),finalized_by uuid,finalized_at timestamptz default now(),updated_at timestamptz default now(),unique(company_id,employee_id,period_start,period_end));
    alter table employee_payroll_period_totals enable row level security; alter table employee_payroll_ytd_opening_balances enable row level security;
    create policy "company admins can manage payroll period totals" on employee_payroll_period_totals for all to authenticated using(true);
    create policy "company users can view payroll period totals" on employee_payroll_period_totals for select to authenticated using(true);
    create policy "company admins can manage payroll ytd opening balances" on employee_payroll_ytd_opening_balances for all to authenticated using(true);
    create policy "company users can view payroll ytd opening balances" on employee_payroll_ytd_opening_balances for select to authenticated using(true);
    grant all on all tables in schema public to authenticated;
  `);

  for(const c of [c1,c2]) {
    await admin.query('insert into companies(id,name) values($1,$2)',[c,'Synthetic cutoff only']);
    await admin.query('insert into company_payroll_rules(company_id) values($1)',[c]);
    for(const e of ['E1','E2']) await admin.query('insert into employees(company_id,employee_id,full_name,rate) values($1,$2,$2,10000)',[c,e]);
  }
  await admin.query('insert into auth.users values($1),($2)',[owner,employee]);
  for(const c of [c1,c2]) await admin.query("insert into company_users(company_id,user_id,role) values($1,$2,'owner')",[c,owner]);
  await admin.query(fs.readFileSync('supabase/migrations/20260917100000_payroll_finalisation.sql','utf8'));
  await admin.query(fs.readFileSync('supabase/migrations/20260919120000_payroll_ytd_explicit_cutoff.sql','utf8'));
  await admin.query('update company_payroll_rules set payroll_history_enabled=true');
  const a=await user();
  const details=(c,e)=>({company_id:c,employee_id:e,full_name:e,pay_type:'monthly',pay_cycle:'monthly',rate:10000,active:true});
  async function edit(c,e,cutoff,targets={paye:'12500.00',uif:'1600.00'}) {
    const h=await call(a,'get_payroll_history',[c,'2026-09-01','2026-09-30']);
    return call(a,'save_employee_with_ytd',[c,e,false,details(c,e),{...targets,as_at:cutoff},h.revision,id()]);
  }
  async function finalise(c,s,t){const p=await payload(a,c,s,t);p.company.name='Synthetic cutoff only';return trusted(a,c,id(),p);}
  async function balances(c,asAt){return call(a,'get_employee_payroll_ytd_at',[c,'E1','2026-03-01',asAt]);}
  function amounts(h,paye,uif){assert.equal(Number(h.paye),paye);assert.equal(Number(h.uif),uif);}
  await finalise(c1,'2026-08-01','2026-08-31');
  await edit(c1,'E1','2026-08-31');
  amounts(await balances(c1,'2026-08-31'),12500,1600);
  await finalise(c1,'2026-09-01','2026-09-30');
  amounts(await balances(c1,'2026-09-30'),14000,1700);
  const audit=(await admin.query("select previous_value,target_value,delta,ytd_as_at::text,applies_after::text from payroll_financial_events where company_id=$1 and value_type='paye'",[c1])).rows[0];
  assert.equal(Number(audit.previous_value),1500);assert.equal(Number(audit.delta),11000);
  assert.equal(audit.ytd_as_at,'2026-08-31');assert.equal(audit.applies_after,'2026-08-31');
  ok('August target reconciles existing August once; September adds; explicit cutoff audited');

  await finalise(c2,'2026-08-01','2026-08-31');await finalise(c2,'2026-09-01','2026-09-30');
  const frozen=JSON.stringify((await admin.query('select to_jsonb(p) as row from employee_payroll_period_totals p where company_id=$1 order by employee_id,period_end',[c2])).rows);
  await edit(c2,'E1','2026-08-31');
  amounts(await balances(c2,'2026-09-30'),14000,1700);
  assert.equal(JSON.stringify((await admin.query('select to_jsonb(p) as row from employee_payroll_period_totals p where company_id=$1 order by employee_id,period_end',[c2])).rows),frozen);
  await edit(c2,'E1','2026-08-31');amounts(await balances(c2,'2026-09-30'),14000,1700);
  ok('September already finalised stays additive; repeated same target does not double count; snapshots unchanged');

  const before=(await admin.query('select count(*)::int n from payroll_runs')).rows[0].n;
  await fails(finalise(c1,'2026-07-01','2026-07-31'),/covered by an accountant/);
  assert.equal((await admin.query('select count(*)::int n from payroll_runs')).rows[0].n,before);
  await fails(edit(c1,'E1','2026-08-15'),/inside a finalised payroll/);
  ok('covered historical finalisation rolls back atomically; straddling accountant cutoff rejected');

  await fails(edit(c1,'E1','2026-02-28'),/applicable tax year/);
  await fails(edit(c1,'E1','2027-03-01'),/applicable tax year/);
  await fails(edit(c1,'E1',undefined),/Explicit YTD as at/);
  await fails(call(a,'get_employee_payroll_ytd_at',[c1,'E1','2026-03-01','2027-03-01']),/applicable tax year/);
  ok('wrong tax-year/missing cutoff rejected by server and dated reader');

  await edit(c1,'E2','2026-09-30',{paye:'5000.00'});
  await fails(edit(c1,'E2','2026-08-31',{paye:'3000.00'}),/later accountant/);
  await edit(c1,'E2','2026-08-31',{uif:'1600.00'});
  await admin.query('update company_payroll_rules set calculate_uif=false where company_id=$1',[c1]);
  await fails(edit(c1,'E1','2026-08-31',{uif:'1700.00'}),/setting is disabled/);
  await edit(c1,'E1','2026-08-31',{paye:'12600.00'});
  amounts(await balances(c1,'2026-09-30'),14100,1700);
  ok('independent targets/toggles preserved; later absolute accountant target protected');

  const unauthorised=await user(employee);
  await fails(call(unauthorised,'get_employee_payroll_ytd_at',[c1,'E1','2026-03-01','2026-08-31']),/owner\/admin access/);
  assert.equal((await admin.query("select has_function_privilege('authenticated','public.finalise_payroll(uuid,uuid,jsonb)','execute') allowed")).rows[0].allowed,false);
  ok('dated reader retains manager authorization; private finalisation remains private');
  console.log(passed+' focused cutoff PostgreSQL groups passed. Local evidence: '+root);
}
main().catch(e=>{console.error(e.message,e.where||'');process.exitCode=1;}).finally(async()=>{
  await Promise.all(connections.map(c=>c.end().catch(()=>{})));
  if(started) nativeRun('pg_ctl',['-D',dataDir,'-m','fast','-w','stop']);
});
