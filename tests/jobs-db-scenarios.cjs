const crypto=require('node:crypto');
module.exports=async({admin,connect,fixture:f,log,assert})=>{
  const A=f.company_a,B=f.company_b;
  const tables=['jobs','job_assignments','job_time_entries','job_work_days','job_materials','job_test_results','job_notes','job_photos','job_client_signoffs','job_activity','job_completion_snapshots'];
  async function setup(c,name){await c.query('begin');await c.query('set local role '+(name==='anon'?'anon':'authenticated'));await c.query("select set_config('request.jwt.claims',$1,true)",[JSON.stringify({role:name==='anon'?'anon':'authenticated',sub:f[name]})]);await c.query("set local statement_timeout='8s'");}
  async function as(name,sql,args=[]){const c=await connect();try{await setup(c,name);const r=await c.query(sql,args);await c.query('commit');return r.rows;}catch(e){await c.query('rollback');throw e;}finally{await c.end();}}
  async function denied(name,sql,args=[],code){let err;try{await as(name,sql,args);}catch(e){err=e;}assert.ok(err,'Expected rejection '+name+' '+sql);if(code)assert.equal(err.code,code);return err.code;}
  async function job(id){return(await admin.query('select * from jobs where id=$1',[id])).rows[0];}
  async function create(company=A,actor='owner'){return (await as(actor,`select * from create_job_with_team($1,$2,array['E101','E102'],'E100',true,now())`,[company,{title:'Validation Job',client_name:'Neutral fixture',site_id:'S01'}]))[0];}
  async function call(name,fn,j,...args){const r=await as(name,`select public.${fn}(${Array.from({length:3+args.length},(_,i)=>'$'+(i+1)).join(',')}) result`,[j.company_id,j.id,j.revision,...args]);return r[0].result;}
  async function currentCall(name,fn,id,...args){return call(name,fn,await job(id),...args);}
  // Two simultaneous database transactions. First holds its write while second
  // is observed waiting on a PostgreSQL lock, then first commits.
  async function race(name,sql1,args1,sql2,args2){
    const c1=await connect(),c2=await connect();try{
      await setup(c1,name);await setup(c2,name);const pid=(await c2.query('select pg_backend_pid() pid')).rows[0].pid;
      const first=await c1.query(sql1,args1);let settled=false;
      const second=c2.query(sql2,args2).then(r=>{settled=true;return {ok:true,rows:r.rows};},e=>{settled=true;return {ok:false,code:e.code,message:e.message};});
      await c1.query('select pg_sleep(0.15)');assert.equal(settled,false,'Second transaction must actually overlap');
      const wait=(await admin.query('select wait_event_type from pg_stat_activity where pid=$1',[pid])).rows[0];assert.equal(wait.wait_event_type,'Lock');
      await c1.query('commit');const result=await second;await c2.query(result.ok?'commit':'rollback');return {first:first.rows,second:result};
    }finally{await c1.query('rollback').catch(()=>{});await c2.query('rollback').catch(()=>{});await c1.end();await c2.end();}
  }
  await as('platform','update companies set jobs_enabled=true where id in($1,$2)',[A,B]);
  assert.equal((await as('platform','select * from jobs')).length,0);log('Platform entitlement update without implicit content');
  // Shared settings still work with feature disabled; explicit escalation denied.
  await as('platform','update companies set jobs_enabled=false where id=$1',[A]);
  await as('owner',"update companies set logo_url='local-logo-reference' where id=$1",[A]);
  await denied('owner','update companies set jobs_enabled=true where id=$1',[A],'42501');
  await as('platform','update companies set jobs_enabled=true where id=$1',[A]);log('Ordinary company updates preserved, self-entitlement denied');
  const first=await create();assert.equal(first.lifecycle_status,'scheduled');
  for(const actor of ['owner','admin']){assert.equal((await as(actor,'select * from jobs where id=$1',[first.id])).length,1);}
  await call('lead','start_job_work',first);
  await currentCall('lead','add_job_evidence',first.id,'material',{description:'Cable',quantity:2,unit:'m'});
  await currentCall('lead','add_job_evidence',first.id,'test',{description:'Check',result:'PASS'});
  await currentCall('lead','add_job_evidence',first.id,'note',{note:'Recorded note'});
  await admin.query("insert into storage.buckets values('shiftly-jobs-media',false)");
  for(const kind of ['photo','signoff']){
    const objectPath=`${A}/${first.id}/${kind==='photo'?'photos':'signatures'}/${crypto.randomUUID()}.png`;
    await admin.query("insert into storage.objects(bucket_id,name)values('shiftly-jobs-media',$1)",[objectPath]);
    await currentCall('lead','add_job_evidence',first.id,kind,{object_path:objectPath,category:'before',client_name:'Local Client'});
  }
  await currentCall('lead','finish_work_for_today',first.id,'Day 1 work','Next step');
  for(let day=2;day<=3;day++){
    await currentCall('lead','start_job_work',first.id);
    // Test-only prior-day starts make all three dates distinct, no clock mocking.
    await admin.query('update job_time_entries set started_at=now()-($2::int*interval \'1 day\') where job_id=$1 and ended_at is null',[first.id,day]);
    await currentCall('lead','finish_work_for_today',first.id,`Day ${day} work`,'');
  }
  const days=(await admin.query('select * from job_work_days where job_id=$1 order by created_at',[first.id])).rows;
  assert.equal(days.length,3);assert.equal(new Set(days.map(d=>String(d.work_date))).size,3);log('Three-day history retained',days.map(d=>d.work_performed).join(', '));
  await currentCall('second_supervisor','start_job_work',first.id);
  await denied('lead','select submit_job_for_review($1,$2,$3)',[A,first.id,(await job(first.id)).revision]);
  assert.equal((await admin.query('select count(*)::int n from job_time_entries where job_id=$1 and ended_at is null',[first.id])).rows[0].n,1);
  await currentCall('second_supervisor','finish_work_for_today',first.id,'Teammate work','');
  log('Submission blocks teammate open session without auto-close');
  let j=await job(first.id);let result=await race('lead','select submit_job_for_review($1,$2,$3)',[A,j.id,j.revision],'select submit_job_for_review($1,$2,$3)',[A,j.id,j.revision]);assert.equal(result.second.code,'40001');log('Concurrent double submit',result.second.code);
  await currentCall('admin','return_job_for_correction',j.id,'Capture final check');
  await currentCall('lead','add_job_evidence',j.id,'test',{description:'Final check',result:'PASS'});
  await currentCall('lead','resubmit_job_for_review',j.id);
  j=await job(j.id);result=await race('admin','select approve_job_complete($1,$2,$3)',[A,j.id,j.revision],'select approve_job_complete($1,$2,$3)',[A,j.id,j.revision]);assert.equal(result.second.code,'40001');
  j=await job(j.id);assert.ok(j.completed_at&&j.completed_by&&j.submitted_for_review_at);log('Correction loop and concurrent completion',result.second.code);
  const events=(await admin.query('select event_type,summary from job_activity where job_id=$1',[j.id])).rows;
  assert.ok(events.some(e=>e.summary==='Capture final check'));assert.equal(events.filter(e=>e.event_type==='completed').length,1);assert.ok(events.some(e=>e.event_type==='resubmitted'));
  for(const actor of ['employee','billing','viewer','unassigned','outsider','platform']){
    for(const t of tables)assert.equal((await as(actor,`select * from ${t} where company_id=$1`,[A])).length,0,actor+' '+t);
    for(const fn of ['start_job_work','submit_job_for_review','approve_job_complete'])await denied(actor,`select ${fn}($1,$2,$3)`,[A,j.id,j.revision],'42501');
    log(actor+' exclusion across all content tables/RPCs');
  }
  for(const t of tables){await denied('anon',`select * from ${t}`,[],'42501');await denied('owner',`delete from ${t} where false`,[],'42501');await denied('owner',`update ${t} set company_id=company_id where false`,[],'42501');await denied('owner',`insert into ${t}(company_id)values($1)`,[A],'42501');}
  log('Anon excluded and authenticated INSERT/UPDATE/DELETE blocked');
  const foreign=(await as('outsider',`select * from create_job($1,'{"title":"B Job","client_name":"B Client"}')`,[B]))[0];
  for(const actor of ['owner','admin','lead']){assert.equal((await as(actor,'select * from jobs where id=$1',[foreign.id])).length,0);await denied(actor,'select cancel_job($1,$2,$3,$4)',[B,foreign.id,foreign.revision,'Cross tenant'],'42501');}log('Bidirectional tenant isolation');
  for(const fn of ['assign_job_employee','return_job_for_correction','approve_job_complete']){
    const args=fn==='assign_job_employee'?[A,j.id,j.revision,'E103','member']:fn==='return_job_for_correction'?[A,j.id,j.revision,'Invalid']:[A,j.id,j.revision];
    await denied('lead',`select ${fn}(${args.map((_,i)=>'$'+(i+1)).join(',')})`,args);
  }log('Supervisor cannot expand assignments or perform manager actions');
  // Substantive UPDATE blocked even for migration owner; all evidence populated.
  const fields={jobs:"title='Changed'",job_assignments:"employee_name='Changed'",job_time_entries:"employee_name='Changed'",job_work_days:"work_performed='Changed'",job_materials:"description='Changed'",job_test_results:"result='Changed'",job_notes:"note='Changed'",job_photos:"note='Changed'",job_client_signoffs:"client_name='Changed'",job_activity:"summary='Changed'",job_completion_snapshots:"payload='{}'::jsonb"};
  for(const [t,set]of Object.entries(fields))await assert.rejects(admin.query(`update ${t} set ${set} where ${t==='jobs'?'id':'job_id'}=$1`,[j.id]),/immutable|append-only/);
  const snap=(await admin.query('select payload from job_completion_snapshots where job_id=$1',[j.id])).rows[0].payload;
  await admin.query("update employees set full_name='Renamed' where company_id=$1 and employee_id='E100'",[A]);await admin.query("update sites set name='Renamed Site' where company_id=$1 and site_id='S01'",[A]);
  assert.deepEqual((await admin.query('select payload from job_completion_snapshots where job_id=$1',[j.id])).rows[0].payload,snap);log('Completed immutability and employee/site rename snapshot stability');
  // Atomic numbering: actual overlapping transactions on same allocator.
  const counterBefore=(await admin.query("select last_number from job_number_counters where company_id=$1 and number_year=extract(year from now() at time zone 'UTC')",[A])).rows[0].last_number;
  result=await race('owner',"select * from create_job($1,'{\"title\":\"Race1\",\"client_name\":\"C\"}')",[A],"select * from create_job($1,'{\"title\":\"Race2\",\"client_name\":\"C\"}')",[A]);assert.equal(result.second.ok,true);assert.notEqual(result.first[0].job_number,result.second.rows[0].job_number);
  const counterAfter=(await admin.query("select last_number from job_number_counters where company_id=$1 and number_year=extract(year from now() at time zone 'UTC')",[A])).rows[0].last_number;assert.equal(Number(counterAfter),Number(counterBefore)+2);log('Concurrent numbering',result.first[0].job_number+' / '+result.second.rows[0].job_number);
  assert.equal((await admin.query('select jobs_next_job_number($1,2099) n',[A])).rows[0].n,'JC-2099-0001');assert.equal((await admin.query('select jobs_next_job_number($1,2099) n',[B])).rows[0].n,'JC-2099-0001');
  assert.equal((await admin.query("select extract(year from '2027-01-01 00:30+02'::timestamptz at time zone 'UTC')::int y")).rows[0].y,2026);log('Independent company/year allocation and UTC boundary');
  const s1=await create(),s2=await create();
  result=await race('lead','select start_job_work($1,$2,$3)',[A,s1.id,s1.revision],'select start_job_work($1,$2,$3)',[A,s1.id,s1.revision]);assert.equal(result.second.code,'40001');log('Concurrent same-job start',result.second.code);
  await currentCall('lead','finish_work_for_today',s1.id,'Finish first race','');
  const fresh1=await job(s1.id);
  result=await race('lead','select start_job_work($1,$2,$3)',[A,s1.id,fresh1.revision],'select start_job_work($1,$2,$3)',[A,s2.id,s2.revision]);assert.equal(result.second.code,'23505');
  assert.equal((await admin.query("select count(*)::int n from job_time_entries where company_id=$1 and employee_id='E100' and ended_at is null",[A])).rows[0].n,1);log('Concurrent different-job start',result.second.code);
  await denied('owner','select unassign_job_employee($1,$2,$3,$4)',[A,s1.id,(await job(s1.id)).revision,'E100']);
  // Fail activity insertion after finish has written a day and closed session.
  await admin.query(`create function public.jobs_test_fail_activity()returns trigger language plpgsql as $$begin if new.event_type='work_paused' then raise exception 'Injected failure';end if;return new;end$$;create trigger jobs_test_fail before insert on job_activity for each row execute function jobs_test_fail_activity();`);
  const beforeDays=(await admin.query('select count(*)::int n from job_work_days where job_id=$1',[s1.id])).rows[0].n;
  await denied('lead','select finish_work_for_today($1,$2,$3,$4)',[A,s1.id,(await job(s1.id)).revision,'Must rollback']);
  assert.equal((await admin.query('select count(*)::int n from job_work_days where job_id=$1',[s1.id])).rows[0].n,beforeDays);assert.equal((await admin.query('select count(*)::int n from job_time_entries where job_id=$1 and ended_at is null',[s1.id])).rows[0].n,1);
  await admin.query('drop trigger jobs_test_fail on job_activity;drop function jobs_test_fail_activity()');log('Finish Work injected-failure atomic rollback');
  const session=(await admin.query('select * from job_time_entries where job_id=$1 and ended_at is null',[s1.id])).rows[0];
  await admin.query("update employees set active=false where company_id=$1 and employee_id='E100'",[A]);
  await denied('lead','select finish_work_for_today($1,$2,$3,$4)',[A,s1.id,(await job(s1.id)).revision,'Inactive'],'42501');
  await denied('owner','select admin_close_job_session($1,$2,$3,$4,$5)',[A,s1.id,(await job(s1.id)).revision,session.id,'']);
  for(const actor of ['second_supervisor','employee','billing','viewer','platform','outsider'])await denied(actor,'select admin_close_job_session($1,$2,$3,$4,$5)',[A,s1.id,(await job(s1.id)).revision,session.id,'Unauthorized recovery'],'42501');
  await currentCall('owner','admin_close_job_session',s1.id,session.id,'Supervisor inactive; explicit recovery');
  const recovered=(await admin.query('select * from job_time_entries where id=$1',[session.id])).rows[0];assert.deepEqual(recovered.started_at,session.started_at);assert.ok(recovered.ended_at);assert.equal(recovered.ended_by,f.owner);
  assert.ok((await admin.query("select * from job_activity where job_id=$1 and event_type='session_admin_closed'",[s1.id])).rows.length);log('Inactive Supervisor session recovery, reason and audit');
  await admin.query("update employees set active=true where company_id=$1 and employee_id='E100'",[A]);
  let leadjob=await job(s2.id);result=await race('owner','select replace_job_lead($1,$2,$3,$4)',[A,s2.id,leadjob.revision,'E101'],'select replace_job_lead($1,$2,$3,$4)',[A,s2.id,leadjob.revision,'E100']);assert.equal(result.second.code,'40001');
  assert.equal((await admin.query("select count(*)::int n from job_assignments where job_id=$1 and assignment_role='lead' and unassigned_at is null",[s2.id])).rows[0].n,1);log('Concurrent lead replacement',result.second.code);
  const cancel=await create();await currentCall('admin','cancel_job',cancel.id,'No longer required');const cancelled=await job(cancel.id);assert.equal(cancelled.lifecycle_status,'cancelled');assert.ok(cancelled.cancelled_at&&cancelled.cancelled_by);assert.equal(cancelled.cancel_reason,'No longer required');log('Cancellation reason/actor/time');
  const disable=await create();await currentCall('lead','start_job_work',disable.id);const rowCount=(await admin.query('select count(*)::int n from jobs')).rows[0].n;
  await as('platform','update companies set jobs_enabled=false where id=$1',[A]);
  for(const actor of ['owner','admin','lead']){assert.equal((await as(actor,'select * from jobs where company_id=$1',[A])).length,0);await denied(actor,'select cancel_job($1,$2,$3,$4)',[A,disable.id,(await job(disable.id)).revision,'Disabled'],'42501');}
  assert.equal((await admin.query('select count(*)::int n from jobs')).rows[0].n,rowCount);assert.equal((await admin.query('select count(*)::int n from job_time_entries where job_id=$1 and ended_at is null',[disable.id])).rows[0].n,1);log('Entitlement disable hides data without deleting/open-session closure');
  await as('platform','update companies set jobs_enabled=true where id=$1',[A]);const open=(await admin.query('select id from job_time_entries where job_id=$1 and ended_at is null',[disable.id])).rows[0];await currentCall('admin','admin_close_job_session',disable.id,open.id,'Reenabled for recovery');
  await assert.rejects(admin.query('delete from companies where id=$1',[A]));await assert.rejects(admin.query("delete from employees where company_id=$1 and employee_id='E100'",[A]));
  // Remove the existing membership FK first so this proves the NEW Jobs FK,
  // not the pre-existing company_users composite SET NULL/NOT NULL conflict.
  await admin.query('delete from company_users where company_id=$1 and user_id=$2',[A,f.employee]);
  await assert.rejects(admin.query("delete from employees where company_id=$1 and employee_id='E102'",[A]),e=>e.code==='23503'&&e.table==='job_assignments');
  await admin.query("delete from sites where company_id=$1 and site_id='S01'",[A]);await admin.query('delete from company_users where company_id=$1 and user_id=$2',[A,f.admin]);assert.deepEqual((await admin.query('select payload from job_completion_snapshots where job_id=$1',[j.id])).rows[0].payload,snap);log('Delete consequences: company/employee restricted; site/user deletion preserves snapshot');
};
