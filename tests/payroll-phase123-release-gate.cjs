// Explicitly isolated Phase 1-3 release gate. Starts a fresh loopback-only PostgreSQL
// cluster from the repository's existing embedded runtime and never reads .env/config.
const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
const crypto=require('node:crypto');
const {spawnSync}=require('node:child_process');
const {Client}=require('../tmp/jobs-pg-runtime/node_modules/pg');
const Authority=require('../src/payroll-authority.js');

const native=path.resolve('tmp/jobs-pg-runtime/node_modules/@embedded-postgres/windows-x64/native/bin');
const reuseRoot=process.argv[2]?path.resolve(process.argv[2]):null;
const root=reuseRoot||fs.mkdtempSync(path.resolve('tmp/payroll-phase123-gate-'));
const dataDir=path.join(root,'data');
const port=54396;
const owner='20000000-0000-0000-0000-000000000001';
const outsider='20000000-0000-0000-0000-000000000002';
const cExisting='10000000-0000-0000-0000-000000000001';
const cSdl='10000000-0000-0000-0000-000000000002';
const cItems='10000000-0000-0000-0000-000000000003';
const pvs='58f6d52b-fc34-4976-8330-c661008942ce';
let admin,started=false;const clients=[];
const migration=name=>fs.readFileSync(`supabase/migrations/${name}`,'utf8');
function nativeRun(name,args){const r=spawnSync(path.join(native,name+'.exe'),args,{encoding:'utf8',windowsHide:true,timeout:30000});if(r.status!==0)throw Error(`${name}: ${r.stderr||r.stdout||r.error}`);}
async function connect(){const client=new Client({host:'127.0.0.1',port,user:'postgres',database:'postgres',connectionTimeoutMillis:3000});await client.connect();clients.push(client);return client;}
async function role(name,id=null){const client=await connect();await client.query(`set role ${name}`);if(id)await client.query("select set_config('request.jwt.claim.sub',$1,false)",[id]);return client;}
async function call(client,name,args){return (await client.query(`select public.${name}(${args.map((_,i)=>'$'+(i+1)).join(',')}) result`,args)).rows[0].result;}
async function inputs(client,company,start,end){return call(client,'get_payroll_calculation_inputs',[company,start,end]);}
async function calculate(client,company,start,end){return Authority.calculate(await inputs(client,company,start,end),{start,end,levyWeeks:null});}
async function finalise(company,payload){const service=await role('service_role');try{return await call(service,'commit_trusted_payroll',[company,crypto.randomUUID(),{...payload,confirmation:crypto.randomUUID()},owner]);}finally{await service.end();}}
async function main(){
  if(!reuseRoot){
  nativeRun('initdb',['-D',dataDir,'-U','postgres','-A','trust','--no-locale','-E','UTF8']);
  nativeRun('pg_ctl',['-D',dataDir,'-l',path.join(root,'postgres.log'),'-o',`-h 127.0.0.1 -p ${port}`,'-w','start']);started=true;
  admin=await connect();
  assert.equal((await admin.query('select host(inet_server_addr()) ip')).rows[0].ip,'127.0.0.1');
  assert.equal((await admin.query('show data_directory')).rows[0].data_directory.replaceAll('\\','/'),dataDir.replaceAll('\\','/'));
  await admin.query(`
    create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;
    create schema auth; create table auth.users(id uuid primary key);
    create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
    grant usage on schema public,auth to authenticated,anon; grant execute on function auth.uid() to authenticated;
    create table companies(id uuid primary key,name text,status text default 'active',logo_url text);
    create table company_users(company_id uuid,user_id uuid,role text,active boolean default true,employee_id text);
    create table employees(company_id uuid,employee_id text,full_name text,id_number text,employment_date date,pay_type text default 'monthly',pay_cycle text default 'monthly',rate numeric,active boolean default true,nbcei_designation_code text,sbf_member boolean default false,saewa_member boolean default false,primary key(company_id,employee_id));
    create table company_payroll_rules(company_id uuid primary key,calculate_paye boolean default true,calculate_uif boolean default true);
    create table company_deduction_types(id uuid primary key default gen_random_uuid(),company_id uuid,company_name text,name text,calculation_type text default 'manual',default_amount numeric default 0,active boolean default true,sort_order integer default 100);
    create table payroll_deductions(id uuid primary key default gen_random_uuid(),company_id uuid,company_name text,employee_id text,employee_name text,deduction_type_id uuid,description text,amount numeric,period_start date,period_end date,active boolean default true,created_by uuid,created_at timestamptz default now(),updated_at timestamptz default now());
    create table payroll_adjustments(id uuid primary key default gen_random_uuid(),company_id uuid,company_name text,employee_id text,employee_name text,adjustment_type text,description text,hours numeric default 0,amount numeric,period_start date,period_end date,active boolean default true,created_by uuid,created_at timestamptz default now(),updated_at timestamptz default now(),constraint payroll_adjustments_type_check check(adjustment_type in ('paid_leave','allowance','bonus','manual_normal_hours','manual_ot1','manual_ot2')));
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
  for(const [id,name] of [[cExisting,'Existing Company'],[cSdl,'SDL Company'],[cItems,'Items Company'],[pvs,'PVS Construction']]){
    await admin.query('insert into companies(id,name) values($1,$2)',[id,name]);
    await admin.query('insert into company_payroll_rules(company_id) values($1)',[id]);
  }
  for(const company of [cExisting,cSdl,cItems])await admin.query("insert into employees(company_id,employee_id,full_name,employment_date,rate) values($1,'E1','Employee One','2026-01-01',20000)",[company]);
  for(const [id,name] of [['PVSC001','Legacy One'],['PVSC006','Legacy Six']])await admin.query('insert into employees(company_id,employee_id,full_name,rate) values($1,$2,$3,0)',[pvs,id,name]);
  await admin.query('insert into auth.users values($1),($2)',[owner,outsider]);
  for(const company of [cExisting,cSdl,cItems])await admin.query("insert into company_users(company_id,user_id,role) values($1,$2,'owner')",[company,owner]);
  await admin.query("insert into employee_payroll_ytd_opening_balances(company_id,employee_id,tax_year_start,as_of_date,completed_periods,gross_remuneration,retirement_fund_contributions,paye_deducted,uif_combined) values($1,'E1','2026-03-01','2026-08-31',6,90000,0,5000,1000)",[cExisting]);
  await admin.query("insert into payroll_adjustments(company_id,company_name,employee_id,employee_name,adjustment_type,description,amount,period_start,period_end) values($1,'Existing Company','E1','Employee One','allowance','Allowance',0,'2026-09-01','2026-09-30')",[cExisting]);
  await admin.query("insert into company_deduction_types(company_id,company_name,name) values($1,'Existing Company','Loan'),($2,'Items Company','Loan')",[cExisting,cItems]);
  await admin.query("insert into payroll_deductions(company_id,company_name,employee_id,employee_name,deduction_type_id,description,amount,period_start,period_end) select $1,'Existing Company','E1','Employee One',id,'Loan',100,'2026-09-01','2026-09-30' from company_deduction_types where company_id=$1 and name='Loan'",[cExisting]);
  await admin.query("insert into employee_payroll_period_totals(id,company_id,employee_id,tax_year_start,period_start,period_end,period_number,gross_remuneration,retirement_fund_contributions,paye_deducted,finalized_at) values('c2254d6d-ee97-45d6-9b64-4d144df8b037',$1,'PVSC001','2026-03-01','2026-09-01','2026-09-15',7,6022.91,0,0,'2026-09-15T11:37:51.908+02:00'),('a34325c5-e1e9-41f1-87a6-44c80ec1e1bc',$1,'PVSC006','2026-03-01','2026-09-01','2026-09-15',7,23093.85,0,2314.64,'2026-09-15T19:06:26.361+02:00')",[pvs]);

  await admin.query(migration('20260917100000_payroll_finalisation.sql'));
  await admin.query(migration('20260919120000_payroll_ytd_explicit_cutoff.sql'));
  await admin.query(migration('20260919150000_payroll_monthly_uif.sql'));
  await admin.query(migration('20260920120000_payroll_legacy_demo_voids.sql'));
  await admin.query(migration('20260923100000_payroll_reports.sql'));
  await admin.query('update company_payroll_rules set payroll_history_enabled=true where company_id=any($1)',[[cExisting,cSdl,cItems]]);

  const before={rules:(await admin.query('select calculate_paye,calculate_uif from company_payroll_rules where company_id=$1',[cExisting])).rows[0],
    employees:(await admin.query('select count(*)::int n from employees where company_id=$1',[cExisting])).rows[0].n,
    opening:(await admin.query('select gross_remuneration::text,paye_deducted::text,uif_combined::text from employee_payroll_ytd_opening_balances where company_id=$1',[cExisting])).rows[0],
    adjustment:(await admin.query('select adjustment_type,description,amount::text from payroll_adjustments where company_id=$1',[cExisting])).rows[0],
    deduction:(await admin.query('select description,amount::text from payroll_deductions where company_id=$1',[cExisting])).rows[0]};
  for(const file of ['20260923130000_dynamic_payroll_items.sql','20260923150000_payroll_item_classifications.sql','20260923170000_authoritative_sdl.sql'])await admin.query(migration(file));
  const after={rules:(await admin.query('select calculate_paye,calculate_uif from company_payroll_rules where company_id=$1',[cExisting])).rows[0],
    employees:(await admin.query('select count(*)::int n from employees where company_id=$1',[cExisting])).rows[0].n,
    opening:(await admin.query('select gross_remuneration::text,paye_deducted::text,uif_combined::text from employee_payroll_ytd_opening_balances where company_id=$1',[cExisting])).rows[0],
    adjustment:(await admin.query('select adjustment_type,description,amount::text from payroll_adjustments where company_id=$1',[cExisting])).rows[0],
    deduction:(await admin.query('select description,amount::text from payroll_deductions where company_id=$1',[cExisting])).rows[0]};
  assert.deepEqual(after,before);assert.equal((await admin.query('select calculate_sdl from company_payroll_rules where company_id=$1',[cExisting])).rows[0].calculate_sdl,false);
  assert.equal((await admin.query('select count(*)::int n from company_payroll_sdl_configurations')).rows[0].n,0);
  assert.equal((await admin.query('select count(*)::int n from payroll_adjustments where payroll_item_classification_id is not null')).rows[0].n,0);
  assert.equal((await admin.query('select count(*)::int n from employee_payroll_period_totals where sdl_amount is not null')).rows[0].n,0);
  console.log('PASS migrations preserve existing company and historical rows; SDL defaults OFF');
  if(process.env.SHIFTLY_GATE_SETUP_ONLY==='1'){
    started=false;
    console.log(`GATE DATABASE READY: ${root}`);
    return;
  }
  }else{
    started=true;
    admin=await connect();
  }

  const manager=await role('authenticated',owner);
  const unauthorised=await role('authenticated',outsider);
  await assert.rejects(inputs(unauthorised,cExisting,'2026-09-01','2026-09-30'),/permission|access|manager/i);
  await assert.rejects(manager.query("update payroll_item_definitions set display_name='Forged'"),/permission denied/i);
  await assert.rejects(call(manager,'commit_trusted_payroll',[cExisting,crypto.randomUUID(),{},owner]),/permission denied/i);
  await assert.rejects(manager.query("insert into payroll_financial_events(company_id) values($1)",[cExisting]),/permission denied/i);
  console.log('PASS tenant, catalogue, trusted-commit and SDL-YTD write boundaries reject browser authority');
  const off=await calculate(manager,cExisting,'2026-09-01','2026-09-30');
  assert.equal(off.rows[0].sdl_amount,'0.00');assert.equal(off.rows[0].document_row.net,Number(off.rows[0].document_row.gross)-Number(off.rows[0].document_row.totalDeductions));
  await finalise(cExisting,off);
  assert.deepEqual((await admin.query("select sdl_enabled,sdl_amount::text from employee_payroll_period_totals where company_id=$1 and employee_id='E1' and period_start='2026-09-01'",[cExisting])).rows[0],{sdl_enabled:false,sdl_amount:'0.00'});
  console.log('PASS SDL OFF leaves gross/PAYE/UIF/deductions/net unchanged and follows normal finalisation');

  await manager.query("update company_payroll_rules set calculate_sdl=true,sdl_effective_from='2026-09-01' where company_id=any($1)",[[cSdl,cItems]]);
  const basic=await calculate(manager,cSdl,'2026-09-01','2026-09-30');
  assert.equal(basic.rows[0].sdl_leviable_remuneration,'20000.00');assert.equal(basic.rows[0].sdl_amount,'200.00');assert.equal(basic.rows[0].document_row.net,20000-Number(basic.rows[0].document_row.totalDeductions));
  console.log('PASS basic 1% SDL is employer-only');
  await manager.query("update employees set rate=20001 where company_id=$1 and employee_id='E1'",[cSdl]);
  await assert.rejects(finalise(cSdl,basic),/inputs or history changed/i);
  await manager.query("update employees set rate=20000 where company_id=$1 and employee_id='E1'",[cSdl]);
  console.log('PASS stale preview cannot finalise');

  const provident=(await admin.query("select d.id definition_id,x.id classification_id from payroll_item_definitions d join payroll_item_classifications x on x.payroll_item_definition_id=d.id where d.item_key='provident_fund_contribution'")).rows[0];
  await manager.query("insert into payroll_deductions(company_id,company_name,employee_id,employee_name,description,amount,period_start,period_end,payroll_item_definition_id) values($1,'Items Company','E1','Employee One','Forged Name Is Replaced',500,'2026-09-01','2026-09-30',$2)",[cItems,provident.definition_id]);
  await manager.query("insert into payroll_deductions(company_id,company_name,employee_id,employee_name,deduction_type_id,description,amount,period_start,period_end) select $1,'Items Company','E1','Employee One',id,'Loan',100,'2026-09-01','2026-09-30' from company_deduction_types where company_id=$1 and name='Loan'",[cItems]);
  const classified=await calculate(manager,cItems,'2026-09-01','2026-09-30');
  assert.equal(classified.rows[0].sdl_leviable_remuneration,'19500.00');assert.equal(classified.rows[0].sdl_amount,'195.00');
  assert.equal(classified.rows[0].document_row.net,Number(classified.rows[0].document_row.gross)-Number(classified.rows[0].document_row.totalDeductions));
  assert.equal(classified.rows[0].document_row.deductions.find(item=>item.payroll_item_classification?.statutory_category==='employee_provident_fund_contribution')?.payroll_item_classification_id,provident.classification_id);
  console.log('PASS classified retirement reduces SDL base; Loan reduces net only');
  for(const [field,value,pattern] of [['sdl_leviable_remuneration',19501,/SDL calculation snapshot changed/],['sdl_amount',196,/SDL calculation snapshot changed/],['sdl_rate',0.02,/SDL rate or configuration snapshot changed/]]){
    const forged=structuredClone(classified);forged.rows[0].document_row[field]=value;
    await assert.rejects(finalise(cItems,forged),pattern);
  }
  console.log('PASS forged SDL base, amount and rate fail closed at finalisation');

  await manager.query("insert into payroll_adjustments(company_id,company_name,employee_id,employee_name,adjustment_type,description,amount,period_start,period_end) values($1,'Items Company','E1','Employee One','allowance','Allowance',50,'2026-09-01','2026-09-30')",[cItems]);
  await assert.rejects(calculate(manager,cItems,'2026-09-01','2026-09-30'),/Generic Allowance/);
  console.log('PASS unresolved generic Allowance fails closed');

  await manager.query("update employees set rate=15000 where company_id=$1 and employee_id='E1'",[cSdl]);
  const edit=await call(manager,'get_employee_payroll_ytd_at',[cSdl,'E1','2026-03-01','2026-08-31']);
  const details={company_id:cSdl,employee_id:'E1',full_name:'Employee One',employment_date:'2026-01-01',pay_type:'monthly',pay_cycle:'monthly',rate:15000,active:true,sdl_circumstance:'standard',sdl_circumstance_effective_from:'2026-03-01'};
  await call(manager,'save_employee_with_ytd',[cSdl,'E1',false,details,{sdl:'650.00',as_at:'2026-08-31',reason:'Synthetic release gate'},edit.revision,crypto.randomUUID()]);
  const sep=await calculate(manager,cSdl,'2026-09-01','2026-09-30');await finalise(cSdl,sep);
  assert.equal((await call(admin,'payroll_ytd_value',[cSdl,'E1','2026-03-01','2026-10-01'])).sdl,800);
  await manager.query("update employees set rate=16000 where company_id=$1 and employee_id='E1'",[cSdl]);
  const oct=await calculate(manager,cSdl,'2026-10-01','2026-10-31');await finalise(cSdl,oct);
  assert.equal((await call(admin,'payroll_ytd_value',[cSdl,'E1','2026-03-01','2026-10-01'])).sdl,800);
  assert.equal((await call(admin,'payroll_ytd_value',[cSdl,'E1','2026-03-01','2026-11-01'])).sdl,960);
  console.log('PASS opening SDL and September/October cutoff YTD accumulate exactly');

  const sepRun=(await admin.query("select id from payroll_runs where company_id=$1 and period_start='2026-09-01'",[cSdl])).rows[0].id;
  const sepReport=await call(manager,'get_payroll_report',[cSdl,sepRun]);
  assert.equal(Number(sepReport.monthly[0].sdl),150);assert.equal(Number(sepReport.ytd[0].sdl),800);
  assert.equal(Number(sepReport.monthly[0].sdl),sepReport.monthly.reduce((n,r)=>n+Number(r.sdl),0));
  await manager.query("update company_payroll_rules set calculate_sdl=false,sdl_effective_from='2026-11-01' where company_id=$1",[cSdl]);
  await manager.query("update employees set rate=99999 where company_id=$1 and employee_id='E1'",[cSdl]);
  const unchanged=await call(manager,'get_payroll_report',[cSdl,sepRun]);
  assert.deepEqual(unchanged.monthly,sepReport.monthly);assert.deepEqual(unchanged.ytd,sepReport.ytd);
  console.log('PASS frozen historical SDL and Monthly/YTD report values survive current config/rate changes');

  await manager.query("update payroll_adjustments set active=false where company_id=$1 and adjustment_type='allowance'",[cItems]);
  const classifiedFinal=await calculate(manager,cItems,'2026-09-01','2026-09-30');
  await finalise(cItems,classifiedFinal);
  const classifiedStored=(await admin.query("select retirement_fund_contributions::text,sdl_leviable_remuneration::text,sdl_amount::text from employee_payroll_period_totals where company_id=$1 and employee_id='E1' and period_start='2026-09-01'",[cItems])).rows[0];
  assert.deepEqual(classifiedStored,{retirement_fund_contributions:'500.00',sdl_leviable_remuneration:'19500.00',sdl_amount:'195.00'});
  console.log('PASS authoritative classified retirement finalises with frozen retirement and SDL values');
  console.log(`ISOLATED DATABASE REHEARSAL COMPLETE: ${root}`);
}
main().catch(error=>{console.error('GATE FAILURE:',error.stack||error.message,error.where||'');process.exitCode=1;}).finally(async()=>{
  await Promise.all(clients.map(client=>client.end().catch(()=>{})));
  if(started)nativeRun('pg_ctl',['-D',dataDir,'-m','fast','-w','stop']);
});
