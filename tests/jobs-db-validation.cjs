// Disposable LOCAL PostgreSQL 17.6 only. No Supabase CLI, URLs, environment
// credentials or production connections. Requires the supplied offline CSV.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {spawnSync}=require('node:child_process');const assert=require('node:assert/strict');
const {Client}=require('../tmp/jobs-pg-runtime/node_modules/pg');
const config={host:'127.0.0.1',port:54397,user:'postgres',database:'postgres',connectionTimeoutMillis:3000};
const csv=process.argv[2];if(!csv)throw Error('Provide offline catalog CSV path');
const text=fs.readFileSync(csv,'utf8'),field=text.slice(text.indexOf('\n')+1).trim();
const catalog=JSON.parse(field.startsWith('"')?field.slice(1,-1).replace(/""/g,'"'):field);
assert.equal(catalog.server_version,'17.6');
const db='jobs_validation_'+Date.now();const output=path.resolve('tmp',db);fs.mkdirSync(output,{recursive:true});
const qid=s=>'"'+s.replace(/"/g,'""')+'"';
const reports=[];const log=(name,detail='PASS')=>{reports.push({name,detail});console.log(name+': '+detail);};
const fixture={company_a:'10000000-0000-0000-0000-000000000001',company_b:'10000000-0000-0000-0000-000000000002',lead_employee:'E100',second_employee:'E101',member_employee:'E102'};
['owner','admin','lead','second_supervisor','unassigned','employee','outsider','platform','billing','viewer'].forEach((name,i)=>fixture[name]=`20000000-0000-0000-0000-${String(i+1).padStart(12,'0')}`);
let admin;
async function connect(database=db){const c=new Client({...config,database});await c.connect();return c;}
function foundation(){
  const statements=[`create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;`,
    `create schema auth; create table auth.users(id uuid primary key);`,
    `create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claims',true),'')::jsonb->>'sub'$$;`];
  statements[2]=`create function auth.uid() returns uuid language sql stable as $$select (nullif(current_setting('request.jwt.claims',true),'')::jsonb->>'sub')::uuid$$;`;
  statements.push(`create function auth.role() returns text language sql stable as $$select nullif(current_setting('request.jwt.claims',true),'')::jsonb->>'role'$$; grant usage on schema public,auth to anon,authenticated,service_role;`);
  for(const {table} of catalog.tables){
    const cols=catalog.columns.filter(c=>c.table===table).sort((a,b)=>a.ordinal_position-b.ordinal_position);
    statements.push(`create table public.${qid(table)} (${cols.map(c=>`${qid(c.column)} ${c.data_type}${c.default?' default '+c.default:''}${c.nullable==='NO'?' not null':''}`).join(',')});`);
  }
  for(const c of [...catalog.constraints].sort((a,b)=>(a.constraint_type==='f')-(b.constraint_type==='f')))
    statements.push(`alter table public.${qid(c.table)} add constraint ${qid(c.constraint_name)} ${c.definition};`);
  for(const i of catalog.indexes){if(!catalog.constraints.some(c=>c.constraint_name===i.index_name))statements.push(i.definition+';');}
  statements.push(...[...catalog.functions].sort((a,b)=>(b.name==='is_platform_admin')-(a.name==='is_platform_admin')).map(f=>f.definition+';'));
  for(const t of catalog.tables)if(t.rls_enabled)statements.push(`alter table public.${qid(t.table)} enable row level security;`);
  for(const p of catalog.policies)statements.push(`create policy ${qid(p.policy_name)} on public.${qid(p.table)} as ${p.permissive} for ${p.command} to ${p.roles.map(qid).join(',')}${p.using?' using ('+p.using+')':''}${p.with_check?' with check ('+p.with_check+')':''};`);
  for(const g of catalog.grants)statements.push(`grant ${g.privilege} on public.${qid(g.table)} to ${qid(g.grantee)};`);
  // Storage test doubles: shape needed to compile/read metadata checks, NOT policies.
  statements.push(`create schema storage;create table storage.buckets(id text primary key,public boolean not null default false);create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text references storage.buckets(id),name text,unique(bucket_id,name));`);
  return statements.join('\n');
}
async function fixtures(){
  await admin.query(`insert into companies(id,name)values($1,'Local A'),($2,'Local B')`,[fixture.company_a,fixture.company_b]);
  await admin.query(`insert into sites(company_id,site_id,name,company_name,lat,lon)values($1,'S01','Original Site','Local A',0,0)`,[fixture.company_a]);
  for(const [i,id] of ['E100','E101','E102','E103'].entries())await admin.query(`insert into employees(company_id,employee_id,full_name,company_name)values($1,$2,$3,'Local A')`,[fixture.company_a,id,'Fixture '+i]);
  for(const name of ['owner','admin','lead','second_supervisor','unassigned','employee','outsider','platform','billing','viewer']){
    await admin.query('insert into auth.users values($1)',[fixture[name]]);
    if(name==='platform'){await admin.query(`insert into platform_admins(user_id,email,full_name)values($1,'platform@example.test','Platform')`,[fixture[name]]);continue;}
    const role={lead:'supervisor',second_supervisor:'supervisor',unassigned:'supervisor',outsider:'owner'}[name]||name;
    const emp={lead:'E100',second_supervisor:'E101',employee:'E102',unassigned:'E103'}[name]||null;
    await admin.query(`insert into company_users(company_id,user_id,role,employee_id,full_name,email,company_name)values($1,$2,$3,$4,$5,$6,'Local fixture')`,[name==='outsider'?fixture.company_b:fixture.company_a,fixture[name],role,emp,name,name+'@example.test']);
  }
}
async function signature(){return (await admin.query(`select jsonb_build_object('policies',(select jsonb_agg(to_jsonb(p) order by tablename,policyname)from pg_policies p where tablename in('companies','company_users','employees','sites','platform_admins')),'functions',(select jsonb_agg(pg_get_functiondef(p.oid) order by proname)from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and proname in('can_access_company','can_manage_company','is_platform_admin'))) as s`)).rows[0].s;}
async function main(){
  const root=await connect('postgres');
  try{assert.equal((await root.query("select host(inet_server_addr()) a,current_setting('server_version') v")).rows[0].a,'127.0.0.1');
    await root.query('create database '+qid(db));}finally{await root.end();}admin=await connect();
  // Roles are cluster-scoped and may exist from a previous retained disposable run.
  const existing=(await admin.query("select rolname from pg_roles where rolname in ('anon','authenticated','service_role')")).rows;
  let sql=foundation();if(existing.length===3)sql=sql.replace(/^create role[^\n]+\n/,'');
  fs.writeFileSync(path.join(output,'foundation.sql'),sql);await admin.query(sql);await fixtures();
  log('Offline foundation','5 exact core table column/key/policy sets; auth/storage fixtures; trigger bodies absent from snapshot are not simulated');
  const before=await signature();
  const migration=fs.readFileSync('supabase/migrations/20260904100000_jobs_foundation.sql','utf8');
  const started=performance.now();const notices=[];admin.on('notice',n=>notices.push(n.message));
  try{await admin.query(migration);}catch(e){await admin.query('rollback');fs.writeFileSync(path.join(output,'migration-error.json'),JSON.stringify({message:e.message,where:e.where,position:e.position},null,2));throw e;}
  log('Migration executed',Math.round(performance.now()-started)+'ms');log('Migration notices',JSON.stringify(notices));
  assert.deepEqual(await signature(),before);log('Shared policies/helpers unchanged');
  assert.equal((await admin.query('select count(*)::int n from companies where jobs_enabled or billing_enabled')).rows[0].n,0);log('Existing companies Jobs and Billing defaults false');
  const objects=(await admin.query("select relname,relrowsecurity from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind='r' and (c.relname='jobs' or c.relname like 'job_%') order by relname")).rows;
  assert.equal(objects.length,12);assert.ok(objects.every(t=>t.relrowsecurity));log('12 Jobs tables with RLS');
  fs.writeFileSync(path.join(output,'objects.json'),JSON.stringify(objects,null,2));
  const inventory={tables:objects};
  for(const [key,query] of Object.entries({
    constraints:"select c.conrelid::regclass::text as table_name,c.contype,pg_get_constraintdef(c.oid) as definition from pg_constraint c where c.conrelid in(select oid from pg_class where relnamespace='public'::regnamespace and (relname='jobs' or relname like 'job_%')) order by 1,2,3",
    indexes:"select tablename,indexname,indexdef from pg_indexes where schemaname='public' and (tablename='jobs' or tablename like 'job_%') order by 1,2",
    triggers:"select c.relname,pg_get_triggerdef(t.oid) as definition from pg_trigger t join pg_class c on c.oid=t.tgrelid where not t.tgisinternal and c.relnamespace='public'::regnamespace order by 1,2",
    policies:"select * from pg_policies where schemaname='public' and (tablename='jobs' or tablename like 'job_%') order by tablename,policyname",
    grants:"select table_name,grantee,privilege_type from information_schema.table_privileges where table_schema='public' and (table_name='jobs' or table_name like 'job_%') order by 1,2,3",
    functions:"select p.proname,pg_get_function_identity_arguments(p.oid) as arguments,p.prosecdef,p.proconfig,p.proacl::text,pg_get_functiondef(p.oid) as definition from pg_proc p where p.pronamespace='public'::regnamespace order by 1,2"
  }))inventory[key]=(await admin.query(query)).rows;
  assert.equal(inventory.constraints.filter(c=>c.contype==='p').length,12);
  assert.equal(inventory.policies.length,11);
  assert.equal(inventory.triggers.filter(t=>t.definition.includes('jobs_protect_history')).length,11);
  assert.ok(inventory.grants.filter(g=>['anon','authenticated','PUBLIC'].includes(g.grantee)).every(g=>g.grantee==='authenticated'&&g.privilege_type==='SELECT'&&g.table_name!=='job_number_counters'));
  fs.writeFileSync(path.join(output,'catalog.json'),JSON.stringify(inventory,null,2));
  log('Object inventory: keys, constraints, indexes, triggers, policies, grants, function definitions','PASS; catalog.json');
  const security=[];
  try{await require('./jobs-psql-harness.cjs')(admin,fs.readFileSync('tests/jobs-security.sql','utf8'),{...fixture,jobs_disposable_test_database:'on'},r=>security.push(r));}
  finally{fs.writeFileSync(path.join(output,'security.json'),JSON.stringify(security,null,2));}
  log('SQL security suite','PASS ('+security.length+' statements)');
  await require('./jobs-db-scenarios.cjs')({admin,connect,fixture,log,assert});
  assert.deepEqual(await signature(),before);log('Final shared helper/policy equality');
}
main().then(()=>log('RESULT','PASS')).catch(e=>{log('RESULT','FAIL '+e.message);console.error(e.where||e.stack);process.exitCode=1;}).finally(async()=>{
  if(admin)await admin.end();fs.writeFileSync(path.join(output,'report.json'),JSON.stringify({db,config,catalogSha256:crypto.createHash('sha256').update(text).digest('hex'),reports},null,2));console.log('Evidence: '+output);
});
