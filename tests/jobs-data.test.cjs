const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const crypto = require('node:crypto');
const sandbox = {window:{},crypto,Intl,Date,TypeError};
vm.runInNewContext(fs.readFileSync('public/jobs-data.js','utf8'),sandbox);
const API = sandbox.window.ShiftlyJobsData;
const person={employeeId:'E100',name:'Demo Supervisor',role:'supervisor'};
const ctx=role=>({companyId:'demo',userId:role,role,jobsEnabled:true,employeeId:'E100'});
test('review facade maps only reviewed lifecycle arguments and enforces role boundary',async()=>{
  let c=ctx('supervisor');const calls=[];
  const api=API.createSupabase({readOnly:true,review:true,getContext:()=>c,client:{rpc:async(name,args)=>{calls.push({name,args});return {data:8};}}});
  assert.equal(api.evidence,undefined);assert.equal(api.setEntitlement,undefined);
  await api.submit('j',3);await api.resubmit('j',4);assert.equal(calls[0].name,'submit_job_for_review');assert.equal(calls[1].name,'resubmit_job_for_review');
  for(const method of ['returnCorrection','approve','cancel'])assert.throws(()=>api[method]('j',5,'reason'),/Manager/);
  c=ctx('admin');assert.throws(()=>api.submit('j',5),/Supervisor/);assert.throws(()=>api.resubmit('j',5),/Supervisor/);
  await api.returnCorrection('j',5,'Fix');await api.approve('j',6);await api.cancel('j',7,'Reason');
  assert.deepEqual(JSON.parse(JSON.stringify(calls[2])),{name:'return_job_for_correction',args:{p_company_id:'demo',p_job_id:'j',p_revision:5,p_reason:'Fix'}});
  assert.deepEqual(JSON.parse(JSON.stringify(calls[3])),{name:'approve_job_complete',args:{p_company_id:'demo',p_job_id:'j',p_revision:6}});
  assert.equal(calls[4].args.p_reason,'Reason');assert.equal(calls.length,5);
});
test('execution facade uses exact lifecycle arguments and blocks other roles/review/evidence',async()=>{
  let c=ctx('supervisor');const calls=[];
  const api=API.createSupabase({readOnly:true,execution:true,getContext:()=>c,client:{rpc:async(name,args)=>{calls.push({name,args});return {data:name==='admin_close_job_session'?9:'server-uuid'};}}});
  for(const key of ['create','submit','resubmit','returnCorrection','approve','cancel','evidence','setEntitlement'])assert.equal(api[key],undefined);
  assert.equal(await api.start('job',3),'server-uuid');assert.deepEqual(JSON.parse(JSON.stringify(calls[0])),{name:'start_job_work',args:{p_company_id:'demo',p_job_id:'job',p_revision:3}});
  await api.finish('job',4,'Work','Notes');assert.deepEqual(JSON.parse(JSON.stringify(calls[1].args)),{p_company_id:'demo',p_job_id:'job',p_revision:4,p_work:'Work',p_notes:'Notes'});
  assert.throws(()=>api.adminCloseSession('job',4,'session','reason'),/Manager/);
  c=ctx('admin');assert.throws(()=>api.start('job',4),/Supervisor/);assert.throws(()=>api.finish('job',4,'Work'),/Supervisor/);
  await api.adminCloseSession('job',8,'session','Recovery');assert.deepEqual(JSON.parse(JSON.stringify(calls[2].args)),{p_company_id:'demo',p_job_id:'job',p_revision:8,p_session_id:'session',p_reason:'Recovery'});
  c={...ctx('supervisor'),jobsEnabled:false};assert.throws(()=>api.start('job',4),/denied/);assert.equal(calls.length,3);
});
test('planning adapter exposes only approved RPCs and no entitlement/lifecycle/evidence writes',async()=>{
  let c=ctx('admin');const calls=[];
  const service=API.createSupabase({getContext:()=>c,planning:true,readOnly:true,client:{rpc:async(name,args)=>{calls.push({name,args});return {data:8};}}});
  for(const key of ['start','finish','adminCloseSession','submit','resubmit','returnCorrection','approve','cancel','evidence','setEntitlement'])assert.equal(service[key],undefined);
  for(const [method,args,rpc] of [['assign',['j',7,'E2','member'],'assign_job_employee'],['replaceLead',['j',7,'E3'],'replace_job_lead'],['unassign',['j',7,'E2'],'unassign_job_employee'],['schedule',['j',7,'2026-09-10T08:00:00+02:00',null],'schedule_job']]){
    assert.equal(await service[method](...args),8);assert.equal(calls.at(-1).name,rpc);assert.equal(calls.at(-1).args.p_revision,7);
  }
  const before=calls.length;
  for(const role of ['supervisor','employee','viewer','billing']){c=ctx(role);assert.throws(()=>service.assign('j',7,'E2'),/Manager|denied/);await assert.rejects(service.directories(),/Manager|denied/);}
  c={...ctx('admin'),jobsEnabled:false};await assert.rejects(service.directories(),/denied/);assert.equal(calls.length,before);
});
test('entitlements fail closed across all roles and inactive linked employees',()=>{
  for(const role of ['owner','admin','supervisor','employee','billing','viewer','unknown']) {
    assert.equal(API.canOpen(ctx(role)),['owner','admin','supervisor'].includes(role));
    for(const jobsEnabled of [false,undefined,null,'true',1]) assert.equal(API.canOpen({...ctx(role),jobsEnabled}),false);
  }
  assert.equal(API.canOpen({...ctx('supervisor'),linkedEmployeeActive:false}),false);
  assert.equal(API.canOpen({...ctx('admin'),membershipActive:false}),false);
});
test('date alone never schedules mock or prepared RPC payload',async()=>{
  const {adapter}=await setup();
  const draft=await adapter.create({title:'Draft',scheduledDate:'2026-09-10',teamIds:[]});
  assert.equal(draft.status,'draft');
  const calls=[];
  const live=API.createSupabase({client:{rpc:async(name,args)=>{calls.push(args);return {data:{id:'x',status:'draft'},error:null};}},getContext:()=>ctx('admin')});
  await live.create({title:'Draft',scheduledDate:'2026-09-10',siteId:'real-site'});
  assert.equal(calls[0].p_schedule,false);assert.equal(calls[0].p_start,null);assert.equal(calls[0].p_data.site_id,'real-site');
});
async function setup() {
  let day=0;
  const adapter=API.createMock({location:{protocol:'http:',hostname:'localhost'},fixtures:()=>({sequence:1,jobs:[]}),identity:person,team:[person],qa:true,now:()=>new Date(Date.UTC(2026,8,1+day++,8)).toISOString()});
  adapter.setContext(ctx('admin'));
  const job=await adapter.create({title:'Test work',clientName:'Neutral client',scheduleRequested:true,scheduledDate:'2026-09-01',teamIds:[]});
  const rev=()=>adapter.getState().jobs.find(j=>j.id===job.id).revision;
  return {adapter,job,rev};
}
test('production cannot create a mock adapter',()=>assert.throws(()=>API.createMock({location:{protocol:'https:',hostname:'shiftlyapp.co.za'}}),/local-only/));
test('employee, disabled entitlement and missing identity are denied',async()=>{
  for(const c of [{...ctx('employee')},{...ctx('admin'),jobsEnabled:false},{...ctx('supervisor'),employeeId:''},{...ctx('admin'),userId:''}]) assert.equal(API.canOpen(c),false);
  const {adapter,job,rev}=await setup(); adapter.setContext(ctx('employee'));
  await assert.rejects(adapter.list(),/denied/); await assert.rejects(adapter.start(job.id,rev()),/denied/);
});
test('unassigned supervisor cannot read a job',async()=>{const {adapter,job}=await setup();adapter.setContext({...ctx('supervisor'),employeeId:'other'});assert.equal((await adapter.list()).length,0);await assert.rejects(adapter.detail(job.id),/denied/);});
test('multi-day lifecycle, correction, immutability and snapshot',async()=>{
  const {adapter,job,rev}=await setup();adapter.setContext(ctx('supervisor'));
  await adapter.start(job.id,rev()); await assert.rejects(adapter.submit(job.id,rev()),/open/);
  await adapter.evidence(job.id,rev(),'material',{description:'Cable',quantity:2,unit:'metres'});
  await adapter.finish(job.id,rev(),'Day one','Continue tomorrow');
  await adapter.start(job.id,rev());await adapter.finish(job.id,rev(),'Day two','');
  assert.equal((await adapter.detail(job.id)).workDays.length,2);
  assert.equal((await adapter.detail(job.id)).workDays[0].materialIds.length,1);
  await adapter.submit(job.id,rev());adapter.setContext(ctx('admin'));await adapter.returnCorrection(job.id,rev(),'Add test');
  adapter.setContext(ctx('supervisor'));await adapter.evidence(job.id,rev(),'test',{description:'Check',result:'PASS'});await adapter.resubmit(job.id,rev());
  adapter.setContext(ctx('admin'));await adapter.approve(job.id,rev(),{name:'Original Company',logoUrl:''});
  const completed=await adapter.detail(job.id);assert.equal(completed.status,'completed');assert.equal(completed.cardSnapshot.company.name,'Original Company');
  await assert.rejects(adapter.approve(job.id,rev(),{}),/read-only/);
});
test('one open session across jobs and stale revisions',async()=>{
  const {adapter,job,rev}=await setup();const other=await adapter.create({title:'Other',clientName:'Client',scheduleRequested:true,scheduledDate:'2026-09-02',teamIds:[]});
  adapter.setContext(ctx('supervisor'));const before=rev();await adapter.start(job.id,before);
  await assert.rejects(adapter.start(job.id,before),/changed/);
  await assert.rejects(adapter.start(other.id,other.revision),/open/);
});
test('bad evidence is atomic; empty and storage failure are not fake success',async()=>{
  const {adapter,job,rev}=await setup();adapter.setContext(ctx('supervisor'));await adapter.start(job.id,rev());const before=JSON.stringify(adapter.getState());
  await assert.rejects(adapter.evidence(job.id,rev(),'material',{description:'X',quantity:-1,unit:'unit'}),/positive/);
  assert.equal(JSON.stringify(adapter.getState()),before);
  const empty=API.createMock({location:{protocol:'file:'},fixtures:()=>({jobs:[],sequence:1}),storage:{getItem:()=>JSON.stringify({jobs:[],sequence:2}),setItem:()=>{throw Error('full');}},identity:person,team:[]});
  assert.equal(empty.getState().sequence,2);await assert.rejects(empty.create({title:'X',teamIds:[]}),/storage/);assert.equal(empty.getState().jobs.length,0);
});
test('Supabase adapter blocks context changes and only patches entitlement field',async()=>{
  let context={...ctx('admin'),companyId:'a'};let resolve;const gate=new Promise(r=>resolve=r);
  const client={from(){return{select(){return this;},eq(){return this;},order(){return this;},range(){return gate;}};}};
  const service=API.createSupabase({client,getContext:()=>context});const request=service.list();context={...context,companyId:'b'};resolve({data:[],error:null});await assert.rejects(request,/changed/);
  let update;const settings=API.createSupabase({client:{from:()=>({update(value){update=value;return this;},eq(){return this;},select(){return this;},single(){return Promise.resolve({data:{}});}})},getContext:()=>({platformAdmin:true})});
  await settings.setEntitlement('a',true);assert.deepEqual(Object.keys(update),['jobs_enabled']);
});
test('loading/empty/error/session/disabled states and company-switch clearing',async()=>{
  let context=ctx('admin'),resolve;
  const adapter={list:()=>new Promise(r=>resolve=r)};
  const view=API.createViewState({adapter,getContext:()=>context});
  const pending=view.load();assert.equal(view.getState().kind,'loading');
  context={...context,companyId:'other'};resolve([{id:'private-old-company'}]);await pending;
  assert.equal(view.getState().rows.length,0);assert.equal(view.getState().kind,'company-changed');
  adapter.list=async()=>[];await view.load();assert.equal(view.getState().kind,'empty');
  adapter.list=async()=>{throw Object.assign(Error('offline'),{code:'NETWORK'});};await view.load();assert.equal(view.getState().kind,'network');
  context={...context,jobsEnabled:false};await view.load();assert.equal(view.getState().kind,'disabled');
  context={};await view.load();assert.equal(view.getState().kind,'session');
});
test('normalizer freezes names from persisted data and maps linked daily evidence',()=>{
  const job=API.normalize({job:{id:'j',company_id:'c',title:'Historical',company_name:'Old Company',lifecycle_status:'completed',completed_at:'2026-09-01T12:00:00Z',completed_actor_name:'Old Manager'},
    job_assignments:[{employee_id:'E1',employee_name:'Old Employee',assignment_role:'lead'}],
    job_materials:[{id:'m',session_id:'s',description:'Cable',quantity:2,unit:'m',actor_name:'Old Employee'}],
    job_work_days:[{id:'w',session_id:'s',work_date:'2026-09-01',work_performed:'Old work'}]});
  assert.equal(job.company.name,'Old Company');assert.equal(job.lead.name,'Old Employee');
  assert.equal(job.completion.by,'Old Manager');assert.equal(job.workDays[0].materialIds[0],'m');
});

test('compatible async methods, summary/detail boundaries and mock mutation scalars',async()=>{
  const {adapter,job,rev}=await setup();
  const live=API.createSupabase({client:{},getContext:()=>ctx('admin')});
  const methods=['list','detail','create','assign','replaceLead','unassign','schedule','start','finish','submit','resubmit','returnCorrection','approve','cancel','adminCloseSession','evidence'];
  for(const name of methods){assert.equal(typeof adapter[name],'function');assert.equal(typeof live[name],'function');}
  const promise=adapter.list();assert.equal(typeof promise.then,'function');
  const rows=await promise;assert.equal(rows[0].detailLoaded,false);assert.equal('sessions' in rows[0],false);assert.equal('team' in rows[0],false);
  assert.equal((await adapter.detail(job.id)).detailLoaded,true);
  assert.equal((await adapter.list({offset:1,limit:1})).length,0);
  assert.equal(adapter.capabilities.mediaPersistence,false);assert.equal(live.capabilities.mediaPersistence,false);
  adapter.setContext(ctx('supervisor'));
  const session=await adapter.start(job.id,rev());assert.match(session,/^[0-9a-f-]{36}$/);
  const evidence=await adapter.evidence(job.id,rev(),'note',{text:'Record'});assert.match(evidence,/^[0-9a-f-]{36}$/);
  const day=await adapter.finish(job.id,rev(),'Completed work','');assert.match(day,/^[0-9a-f-]{36}$/);
  assert.equal(await adapter.submit(job.id,rev()),rev());
});

test('every live RPC mapping matches frozen SQL names/arguments and scalar returns',async()=>{
  const calls=[];const sql=fs.readFileSync('supabase/migrations/20260904100000_jobs_foundation.sql','utf8');
  const jobRow={id:'j',company_id:'demo',revision:1,job_number:'JC-2026-0001',title:'T',lifecycle_status:'draft'};
  const client={rpc:async(name,args)=>{calls.push({name,args});return {data:name==='create_job_with_team'?jobRow:['start_job_work','finish_work_for_today','add_job_evidence'].includes(name)?'uuid-result':9,error:null};}};
  const live=API.createSupabase({client,getContext:()=>ctx('admin')});
  const cases=[
    ['create',[{title:'T',clientName:'C',teamIds:['E100'],leadId:'E100',siteId:'S1',scheduleRequested:true,scheduledDate:'2026-09-01'}],'create_job_with_team',{p_data:{title:'T',client_name:'C',site_id:'S1'},p_team:['E100'],p_lead:'E100',p_schedule:true,p_start:'2026-09-01T08:00:00+02:00'}],
    ['assign',['j',8,'E2'],'assign_job_employee',{p_employee_id:'E2',p_assignment_role:'member'}],
    ['replaceLead',['j',8,'E2'],'replace_job_lead',{p_employee_id:'E2'}],
    ['unassign',['j',8,'E2'],'unassign_job_employee',{p_employee_id:'E2'}],
    ['schedule',['j',8,'2026-09-01T08:00:00+02:00'],'schedule_job',{p_start:'2026-09-01T08:00:00+02:00',p_end:null}],
    ['start',['j',8],'start_job_work',{}],['finish',['j',8,'Work','Notes'],'finish_work_for_today',{p_work:'Work',p_notes:'Notes'}],
    ['submit',['j',8],'submit_job_for_review',{}],['resubmit',['j',8],'resubmit_job_for_review',{}],
    ['returnCorrection',['j',8,'Reason'],'return_job_for_correction',{p_reason:'Reason'}],
    ['approve',['j',8],'approve_job_complete',{}],['cancel',['j',8,'Reason'],'cancel_job',{p_reason:'Reason'}],
    ['adminCloseSession',['j',8,'s','Reason'],'admin_close_job_session',{p_session_id:'s',p_reason:'Reason'}],
    ['evidence',['j',8,'note',{text:'Text'}],'add_job_evidence',{p_kind:'note',p_data:{note:'Text'}}]
  ];
  for(const [method,args,name,extras] of cases){
    const request=live[method](...args);assert.equal(typeof request.then,'function');const result=await request;
    const call=calls.at(-1);assert.equal(call.name,name);assert.equal(call.args.p_company_id,'demo');
    if(method!=='create'){assert.equal(call.args.p_job_id,'j');assert.equal(call.args.p_revision,8);assert.equal(result,['start','finish','evidence'].includes(method)?'uuid-result':9);}
    else {assert.equal(result.jobNumber,'JC-2026-0001');assert.equal(result.detailLoaded,false);assert.equal('sessions' in result,false);}
    for(const [key,value] of Object.entries(extras)){const actual=JSON.parse(JSON.stringify(call.args[key]));assert.deepEqual(actual,value);}
    const declaration=sql.match(new RegExp('create function public\\.'+name+'\\(([^\\n]*)\\) returns ([^\\n]+)'));
    assert.ok(declaration,name);for(const key of Object.keys(call.args))assert.match(declaration[1],new RegExp('\\b'+key+'\\b'));
  }
  await live.approve('j',8,{outcome:'partially_completed'});assert.equal(calls.at(-1).args.p_outcome,'partially_completed');
  assert.match(sql,/create function public\.create_job\(p_company_id uuid,p_data jsonb\) returns public.jobs/);
  // Standalone create_job is intentionally not selected: current Create UI is atomic create-with-team.
});

test('error categories retain backend diagnostics and unknown is not a validation claim',()=>{
  for(const [code,category] of [['42501','ACCESS_DENIED'],['40001','STALE_REVISION'],['23505','CONFLICT'],['P0001','VALIDATION'],['NETWORK','NETWORK_OR_UNKNOWN'],['unexpected','NETWORK_OR_UNKNOWN']]){
    const original={code,message:'M',details:'D',hint:'H'};const result=API.errorState(original);
    assert.equal(result.category,category);assert.equal(result.original,original);assert.equal(result.details,'D');assert.equal(result.hint,'H');
  }
});

test('live summaries paginate and completed detail reads persisted snapshot',async()=>{
  const requests=[];const row={id:'j',company_id:'demo',revision:4,lifecycle_status:'completed',company_name:'Frozen Company',completed_at:'2026-09-01T12:00:00Z',completed_actor_name:'Manager'};
  const client={from(name){const request={name};requests.push(request);return {select(){return this;},eq(){return this;},order(){return this;},range(a,b){request.range=[a,b];return Promise.resolve({data:name==='job_completion_snapshots'?[{payload:{job:row,job_time_entries:[{id:'s',employee_id:'E1'}]}}]:[row]});},single(){return Promise.resolve({data:row});}};}};
  const live=API.createSupabase({client,getContext:()=>ctx('admin')});
  const rows=await live.list({offset:10,limit:500});assert.deepEqual(requests[0].range,[10,209]);assert.equal(rows[0].detailLoaded,false);assert.equal('sessions' in rows[0],false);
  const detail=await live.detail('j');assert.equal(detail.company.name,'Frozen Company');assert.equal(detail.sessions[0].id,'s');assert.equal(detail.detailLoaded,true);
  assert.equal(requests.filter(r=>r.name==='job_completion_snapshots').length,1);
});

test('late mutation discarded on context switch; uncertain writes never retried',async()=>{
  let context=ctx('admin'),resolve,calls=0;
  const adapter={start:()=>{calls++;return new Promise(r=>resolve=r);},list:async()=>[{id:'fresh'}],clear(){}};
  const view=API.createViewState({adapter,getContext:()=>context});
  const p=view.mutate('start',['j',1]);assert.equal(view.getState().mutationPending,true);
  await assert.rejects(view.mutate('start',['j',1]),/pending/);
  context={...context,companyId:'b'};view.clear();resolve('s');assert.equal((await p).discarded,true);assert.equal(view.getState().rows.length,0);assert.equal(calls,1);
  adapter.start=async()=>{calls++;throw Object.assign(Error('lost response'),{code:'NETWORK'});};
  await assert.rejects(view.mutate('start',['j',1]),/lost response/);assert.equal(calls,2);assert.equal(view.getState().error.category,'NETWORK_OR_UNKNOWN');assert.equal(view.getState().mutationPending,false);
});

test('successful mutation returns scalar separately from refreshed paginated view',async()=>{
  let reads=0;const adapter={cancel:async()=>8,list:async({offset,limit})=>{reads++;assert.equal(offset,2);assert.equal(limit,1);return [{id:'fresh',revision:8}];}};
  const view=API.createViewState({adapter,getContext:()=>ctx('admin')});
  const result=await view.mutate('cancel',['j',7,'reason'],{offset:2,limit:1});
  assert.equal(result.result,8);assert.equal(result.state.rows[0].revision,8);assert.equal(reads,1);assert.equal(view.getState().pagination.hasMore,true);
});

test('mock team, scheduling, cancellation and explicit recovery return revisions',async()=>{
  const {adapter,job,rev}=await setup();
  assert.equal(await adapter.replaceLead(job.id,rev(),'E100'),rev());
  assert.equal(await adapter.schedule(job.id,rev(),'2026-09-02T08:00:00+02:00'),rev());
  adapter.setContext(ctx('supervisor'));const session=await adapter.start(job.id,rev());
  const start=(await adapter.detail(job.id)).sessions[0].startedAt;
  adapter.setContext(ctx('admin'));await assert.rejects(adapter.adminCloseSession(job.id,rev(),session,''),/reason/);
  assert.equal(await adapter.adminCloseSession(job.id,rev(),session,'Recovery'),rev());
  assert.equal((await adapter.detail(job.id)).sessions[0].startedAt,start);
  assert.equal(await adapter.cancel(job.id,rev(),'Cancelled by request'),rev());
  const draft=await adapter.create({title:'Draft',teamIds:[]});
  assert.equal(await adapter.unassign(draft.id,draft.revision,'E100'),draft.revision+1);
  assert.equal(await adapter.assign(draft.id,draft.revision+1,'E100','lead'),draft.revision+2);
});

test('live mutation transport is called once on failure and rejects late context',async()=>{
  let count=0,resolve,context=ctx('admin');
  const live=API.createSupabase({client:{rpc(){count++;return new Promise(r=>resolve=r);}},getContext:()=>context});
  const first=live.start('j',1);context={...context,companyId:'other'};resolve({data:'session'});
  await assert.rejects(first,/changed/);assert.equal(count,1);
  const second=live.start('j',1);resolve({error:{code:'NETWORK',message:'Uncertain'}});
  await assert.rejects(second,e=>e.code==='NETWORK');assert.equal(count,2);
});
