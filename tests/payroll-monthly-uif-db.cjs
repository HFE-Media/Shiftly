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


  const Authority=require('../src/payroll-authority.js');
  for(const c of [c1,c2]){
    await admin.query('insert into companies(id,name) values($1,$2)',[c,'Synthetic UIF']);
    await admin.query('insert into company_payroll_rules(company_id) values($1)',[c]);
    for(const e of ['E1','E2'])await admin.query("insert into employees(company_id,employee_id,full_name,rate) values($1,$2,$2,10000)",[c,e]);
  }
  await admin.query('insert into auth.users values($1),($2)',[owner,employee]);
  for(const c of [c1,c2])await admin.query("insert into company_users(company_id,user_id,role) values($1,$2,'owner')",[c,owner]);
  await admin.query(fs.readFileSync('supabase/migrations/20260917100000_payroll_finalisation.sql','utf8'));
  await admin.query(fs.readFileSync('supabase/migrations/20260919120000_payroll_ytd_explicit_cutoff.sql','utf8'));
  await admin.query('update company_payroll_rules set payroll_history_enabled=true');
  const a=await user();
  const legacy=await payload(a,c2,'2026-10-01','2026-10-07');
  legacy.company.name='Synthetic UIF';await trusted(a,c2,id(),legacy);
  const old=JSON.stringify((await admin.query('select to_jsonb(p) row from employee_payroll_period_totals p where company_id=$1',[c2])).rows);
  await admin.query(fs.readFileSync('supabase/migrations/20260919150000_payroll_monthly_uif.sql','utf8'));
  assert.equal(JSON.stringify((await admin.query('select to_jsonb(p)-array[\'employer_uif\',\'uif_liable_remuneration\'] row from employee_payroll_period_totals p where company_id=$1',[c2])).rows),old);
  await admin.query('update company_payroll_rules set calculate_paye=false');
  const execute=Authority.create({
    secret:require('node:crypto').randomBytes(32).toString('hex'),
    user:async()=>({id:owner}),logo:async()=>'',
    inputs:(_auth,c,s,t)=>call(a,'get_payroll_calculation_inputs',[c,s,t]),
    request:(_auth,c,r)=>call(a,'get_payroll_request',[c,r]),
    commit:(_actor,c,r,p)=>trusted(a,c,r,p)
  });
  const preview=(s,t,c=c1)=>execute('local',{action:'preview',c,start:s,end:t});
  const finish=(p,c=c1,r=id())=>execute('local',{action:'finalise',c,request:r,token:p.token});
  const row=p=>p.rows.find(r=>r.employee_id==='E1');
  function contribution(p,n){
    assert.equal(Number(row(p).employer_uif),n);
    assert.equal(Number(row(p).combined_uif),n*2);
    assert.equal(Number(row(p).deductions.find(d=>d.description==='UIF').amount),n);
    assert.equal(row(p).net,row(p).gross-n);
  }
  const p1=await preview('2026-09-23','2026-10-07');
  contribution(p1,100);
  const again=await preview('2026-09-23','2026-10-07');contribution(again,100);
  assert.equal((await admin.query('select count(*)::int n from payroll_runs where company_id=$1',[c1])).rows[0].n,0);
  ok('fortnight below ceiling; repeated previews consume nothing; employer does not reduce net');
  const competing=await preview('2026-10-08','2026-10-21');
  const outcomes=await Promise.allSettled([finish(p1),finish(competing)]);
  assert.equal(outcomes.filter(x=>x.status==='fulfilled').length,1);
  assert.match(outcomes.find(x=>x.status==='rejected').reason.message,/changed/);
  const saved=(await admin.query('select period_end::text from payroll_runs where company_id=$1',[c1])).rows[0].period_end;
  const second=saved==='2026-10-07'?await preview('2026-10-08','2026-10-21'):await preview('2026-09-23','2026-10-07');
  contribution(second,77.12);await finish(second);
  ok('concurrent stale confirmation rejected; refreshed second fortnight caps both sides at 177.12');
  const full=await preview('2026-10-22','2026-10-28');contribution(full,0);await finish(full);
  ok('same month exhausted contributes zero');
  const snapshot=await call(a,'get_payroll_history',[c1,'2026-10-22','2026-10-28']);
  assert.equal(Number(snapshot.periods[0].employer_uif),0);
  assert.equal(Number(snapshot.periods[0].uif_liable_remuneration),10000);
  assert.equal(Number(snapshot.periods[0].document_row.combined_uif),0);
  const ytd=await call(a,'get_employee_payroll_ytd_at',[c1,'E1','2026-03-01','2026-10-31']);
  assert.equal(Number(ytd.uif),177.12);
  ok('snapshot/reprint retains fields; YTD sums employee contribution only');
  await admin.query("update employees set rate=5000,pay_cycle='weekly' where company_id=$1",[c1]);
  for(const [s,t,n] of [['2026-11-22','2026-11-28',50],['2026-11-01','2026-11-07',50],['2026-11-08','2026-11-14',50],['2026-11-15','2026-11-21',27.12]]){
    const p=await preview(s,t);contribution(p,n);await finish(p);
  }
  ok('new month resets; four weekly runs including out-of-order share one ceiling');
  await admin.query("update employees set rate=25000,pay_cycle='monthly' where company_id=$1",[c1]);
  const capped=await preview('2026-11-29','2026-12-25');contribution(capped,177.12);
  // Forging service-boundary figures is rejected even with a current revision.
  const inputs=await call(a,'get_payroll_calculation_inputs',[c1,'2026-11-29','2026-12-25']);
  const forged=Authority.calculate(inputs,{start:'2026-11-29',end:'2026-12-25',levyWeeks:null});
  forged.rows[0].document_row.employer_uif='999.00';
  await fails(trusted(a,c1,id(),forged),/Monthly UIF/);
  await finish(capped);
  await admin.query('update employees set rate=5000 where company_id=$1',[c1]);
  const below=await preview('2026-12-26','2027-01-25');contribution(below,50);await finish(below);
  ok('custom monthly cycles below/above ceiling; database independently guards employer amount');
  await fails(preview('2026-10-08','2026-10-21',c2),/legacy payroll/);
  const fresh=await preview('2026-11-01','2026-11-30',c2);contribution(fresh,100);
  ok('ambiguous legacy same month blocks; unaffected new month works without historical backfill');
  console.log(passed+' focused monthly UIF PostgreSQL groups passed.');
}
main().catch(e=>{console.error(e.message,e.where||'');process.exitCode=1;}).finally(async()=>{
  await Promise.all(connections.map(c=>c.end().catch(()=>{})));
  if(started)nativeRun('pg_ctl',['-D',dataDir,'-m','fast','-w','stop']);
});
