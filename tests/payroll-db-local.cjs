// Explicitly isolated PostgreSQL test. Starts its own fresh loopback-only cluster.
// Does not read .env, Supabase config, production data, or run old migration/backfill files.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const { Client } = require('../tmp/jobs-pg-runtime/node_modules/pg');
const ph = require('../public/payroll-history.js');
const native = path.resolve('tmp/jobs-pg-runtime/node_modules/@embedded-postgres/windows-x64/native/bin');
const root = fs.mkdtempSync(path.resolve('tmp/payroll-isolated-'));
const dataDir = path.join(root, 'data');
const port = 54398;
const c1 = '10000000-0000-0000-0000-000000000001', c2 = '10000000-0000-0000-0000-000000000002';
const tr = 'f50d8e62-3006-462e-b2a9-b1cf7c500394';
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
// Browser authority/security tests below use independently loaded/calculated inputs.
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
  for (const c of [c1,c2,tr]) {
    await admin.query('insert into companies(id,name) values($1,$2)',[c,'Synthetic fixture']);
    await admin.query('insert into company_payroll_rules(company_id) values($1)',[c]);
    for(const e of ['E1','E2']) await admin.query('insert into employees(company_id,employee_id,full_name,rate) values($1,$2,$2,10000)',[c,e]);
  }
  await admin.query('insert into auth.users values($1),($2)',[owner,employee]);
  await admin.query("insert into company_users(company_id,user_id,role,employee_id) values($1,$2,'owner',null),($1,$3,'employee','E1'),($4,$2,'owner',null)",[c1,owner,employee,tr]);
  await admin.query("insert into employee_payroll_ytd_opening_balances(company_id,employee_id,tax_year_start,as_of_date,completed_periods,gross_remuneration,retirement_fund_contributions,paye_deducted,uif_combined) values($1,'E1','2026-03-01','2026-07-31',5,100000,1000,12000,1400)",[tr]);
  const before=(await admin.query('select to_jsonb(o) row from employee_payroll_ytd_opening_balances o')).rows.map(r=>r.row);
  await admin.query("insert into employee_payroll_period_totals(company_id,employee_id,tax_year_start,period_start,period_end,period_number,gross_remuneration,retirement_fund_contributions,paye_deducted) values($1,'E1','2026-03-01','2026-08-01','2026-08-31',6,10000,100,1500)",[tr]);
  const oldPeriods=(await admin.query('select to_jsonb(p) row from employee_payroll_period_totals p')).rows.map(r=>r.row);
  await admin.query(fs.readFileSync('supabase/migrations/20260917100000_payroll_finalisation.sql','utf8'));
  assert.deepEqual((await admin.query('select to_jsonb(o)-\'employee_uif\' row from employee_payroll_ytd_opening_balances o')).rows.map(r=>r.row),JSON.parse(JSON.stringify(before)));
  assert.deepEqual((await admin.query("select to_jsonb(p)-array['run_id','employee_uif','paye_enabled','uif_enabled','document_row'] row from employee_payroll_period_totals p")).rows.map(r=>r.row),oldPeriods);
  ok('additive migration preserves existing opening amounts and combined UIF');
  const a=await user(); const b=await user(); const emp=await user(employee);
  await fails(call(a,'get_payroll_history',[c1,'2026-09-01','2026-09-15']),/not activated/);
  await fails(admin.query("update employee_payroll_ytd_opening_balances set paye_deducted=0"),/immutable/);
  await admin.query('update company_payroll_rules set payroll_history_enabled=true where company_id=$1',[c1]);
  await fails(a.query('update company_payroll_rules set payroll_history_enabled=true where company_id=$1',[tr]),/approved release/);
  await admin.query('update company_payroll_rules set payroll_history_enabled=true where company_id=$1',[tr]);
  await fails(call(a,'get_payroll_history',[tr,'2026-08-01','2026-08-31']),/not activated/);
  await admin.query('update company_payroll_rules set payroll_tr_parity_verified=true where company_id=$1',[tr]);
  ok('activation disabled by default; ordinary admins cannot activate; TR parity gate enforced');
  const z=await call(a,'get_employee_payroll_ytd',[c1,'E1','2026-03-01']);
  assert.equal(z.paye,0); assert.equal(z.uif,0); assert.equal(z.has_opening,false);
  const trctx=await call(a,'get_employee_payroll_ytd',[tr,'E1','2026-03-01']);
  assert.equal(trctx.paye,13500); assert.equal(trctx.uif,0); assert.equal(trctx.completed_periods,5);
  assert.equal(trctx.finalized_periods,1); assert.equal(trctx.gross,110000); assert.equal(trctx.retirement,1100);
  ok('zero defaults, supplied PAYE, unknown employee UIF separate from combined UIF');
  await fails(call(emp,'get_employee_payroll_ytd',[c1,'E1','2026-03-01']),/access required/);
  await fails(call(a,'get_payroll_history',[c2,'2026-09-01','2026-09-15']),/access required/);
  await fails(emp.query('select public.payroll_revision($1)',[c1]),/permission denied/);
  ok('tenant isolation, employee write/read-manager denial, private helpers inaccessible');
  const p=await payload(a); const request=id();
  await fails(call(a,'finalise_payroll',[c1,id(),p]),/permission denied/);
  await fails(call(a,'commit_trusted_payroll',[c1,id(),p,owner]),/permission denied/);
  await fails(trusted(a,c1,id(),{...p,rows:p.rows.slice(0,1)}),/entire active employee/);
  await fails(trusted(a,c1,id(),{...p,revision:'stale'}),/changed/);
  const mismatched=JSON.parse(JSON.stringify(p)); mismatched.rows[0].retirement_fund_contributions='1.00';
  await fails(trusted(a,c1,id(),mismatched),/Retirement snapshot mismatch/);
  assert.equal((await admin.query('select count(*)::int n from payroll_runs')).rows[0].n,0);
  ok('partial roster, stale source and inconsistent retirement rejected without any committed header');
  const results=await Promise.all([trusted(a,c1,request,p),trusted(b,c1,request,p)]);
  assert.equal(results[0],results[1]);
  assert.equal(await trusted(a,c1,request,p),results[0]);
  assert.equal((await admin.query('select count(*)::int n from employee_payroll_period_totals where company_id=$1',[c1])).rows[0].n,2);
  ok('atomic complete run, concurrent identical requests, repeated/lost-response retry contribute once');
  await fails(trusted(a,c1,request,{...p,end:'2026-09-16'}),/different payroll/);
  const duplicate=await payload(a); await fails(trusted(a,c1,id(),duplicate),/overlapping/);
  const overlap=await payload(a,c1,'2026-09-10','2026-09-25'); await fails(trusted(a,c1,id(),overlap),/overlapping/);
  const cross=await payload(a,c1,'2027-02-20','2027-03-05'); await fails(trusted(a,c1,id(),cross),/two tax years/);
  ok('different payload, exact duplicate, overlap, and cross-tax-year finalisation rejected');
  const view=await call(a,'get_payroll_history',[c1,'2026-09-01','2026-09-15']);
  assert.equal(view.periods.length,2); assert.equal(view.run.employee_count,2);
  const own=await call(emp,'get_own_payroll_snapshot',[c1,'2026-09-01','2026-09-15']);
  assert.equal(own.document_row.employee_id,'E1'); assert.equal(own.company.id,c1);
  assert.equal(own.rules.calculate_paye,true); assert.equal(own.request_payload,undefined);
  await fails(call(emp,'get_own_payroll_snapshot',[c2,'2026-09-01','2026-09-15']),/access required/);
  assert.equal((await emp.query('select count(*)::int n from payroll_runs')).rows[0].n,0);
  assert.equal((await emp.query('select count(*)::int n from employee_payroll_period_totals')).rows[0].n,1);
  await fails(a.query('update employee_payroll_period_totals set paye_deducted=99'),/permission denied/);
  await fails(admin.query('update payroll_runs set employee_count=1'),/immutable/);
  ok('snapshot retrieval is read-only; employee sees own row only; immutable financial history');
  const edit=await call(a,'get_employee_payroll_ytd',[c1,'E1','2026-03-01']);
  assert.equal(edit.paye,1500); assert.equal(edit.uif,100); assert.equal(edit.finalized_periods,1);
  const details={company_id:c1,employee_id:'E1',full_name:'Edited name',employment_date:'2026-01-01',pay_type:'monthly',pay_cycle:'monthly',rate:10000,active:true};
  await call(a,'save_employee_with_ytd',[c1,'E1',false,details,{paye:'1350.00',uif:'90.00'},edit.revision,id()]);
  const adjusted=await call(a,'get_employee_payroll_ytd',[c1,'E1','2026-03-01']);
  assert.equal(adjusted.paye,1350); assert.equal(adjusted.uif,90);
  assert.equal(adjusted.paye_supplied,true); assert.equal(adjusted.uif_supplied,true);
  assert.deepEqual((await admin.query('select delta::text from payroll_financial_events order by value_type')).rows.map(r=>r.delta),['-150.00','-10.00']);
  assert.deepEqual((await call(a,'get_payroll_history',[c1,'2026-09-01','2026-09-15'])).periods,view.periods);
  await fails(call(a,'save_employee_with_ytd',[c1,'E1',false,details,{paye:'1300'},edit.revision,id()]),/changed/);
  ok('manual PAYE/UIF deltas, stale edit guard, original snapshot preserved');
  const second=await payload(a,c1,'2026-09-16','2026-09-30');
  await trusted(a,c1,id(),second);
  const accumulated=await call(a,'get_employee_payroll_ytd',[c1,'E1','2026-03-01']);
  assert.equal(accumulated.paye,2850); assert.equal(accumulated.uif,190); assert.equal(accumulated.finalized_periods,2);
  ok('future finalisation accumulates from corrected YTD; adjustments do not add periods');
  for(const [i,flags] of [{calculate_paye:true,calculate_uif:false},{calculate_paye:false,calculate_uif:true},{calculate_paye:false,calculate_uif:false}].entries()) {
    await admin.query('update company_payroll_rules set calculate_paye=$1,calculate_uif=$2 where company_id=$3',[flags.calculate_paye,flags.calculate_uif,c1]);
    const start=`2026-${String(10+i).padStart(2,'0')}-01`,end=`2026-${String(10+i).padStart(2,'0')}-15`;
    const toggled=await payload(a,c1,start,end,flags); await trusted(a,c1,id(),toggled);
    const h=await call(a,'get_payroll_history',[c1,start,end]);
    assert.equal(Number(h.periods[0].paye_deducted),flags.calculate_paye?1500:0);
    assert.equal(Number(h.periods[0].employee_uif),flags.calculate_uif?100:0);
  }
  ok('all four independent PAYE/UIF toggle combinations');
  const year=await call(a,'get_payroll_history',[c1,'2027-03-01','2027-03-31']); assert.equal(year.employees[0].paye,0); assert.equal(year.employees[0].uif,0);
  const invalid=await payload(a,c1,'2027-01-01','2027-01-15',{calculate_paye:false,calculate_uif:false}); invalid.rows[1].employee_id='OUTSIDER';
  const count=(await admin.query('select count(*)::int n from payroll_runs')).rows[0].n;
  await fails(trusted(a,c1,id(),invalid),/does not belong/);
  assert.equal((await admin.query('select count(*)::int n from payroll_runs')).rows[0].n,count);
  assert.equal((await admin.query("select count(*)::int n from employee_payroll_period_totals where period_start='2027-01-01'")).rows[0].n,0);
  ok('tax-year rollover zero; employee-two failure rolls back header and employee-one');
  assert.equal(passed,12,'original database scenario groups retained');
  await require('./payroll-authority-scenarios.cjs')({admin,connect,user,call,owner,employee,c:c2,id,ok});
  console.log(`${passed} PostgreSQL scenario groups passed. Retained isolated evidence: ${root}`);
}
main().catch(e=>{console.error(e.message,e.where||'');process.exitCode=1;}).finally(async()=>{
  await Promise.all(connections.map(c=>c.end().catch(()=>{})));
  if(started) nativeRun('pg_ctl',['-D',dataDir,'-m','fast','-w','stop']);
});
