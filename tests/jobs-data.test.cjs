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
function setup() {
  let day=0;
  const adapter=API.createMock({location:{protocol:'http:',hostname:'localhost'},fixtures:()=>({sequence:1,jobs:[]}),identity:person,team:[person],qa:true,now:()=>new Date(Date.UTC(2026,8,1+day++,8)).toISOString()});
  adapter.setContext(ctx('admin'));
  const job=adapter.create({title:'Test work',clientName:'Neutral client',scheduledDate:'2026-09-01',teamIds:[]});
  const rev=()=>adapter.getState().jobs.find(j=>j.id===job.id).revision;
  return {adapter,job,rev};
}
test('production cannot create a mock adapter',()=>assert.throws(()=>API.createMock({location:{protocol:'https:',hostname:'shiftlyapp.co.za'}}),/local-only/));
test('employee, disabled entitlement and missing identity are denied',()=>{
  for(const c of [{...ctx('employee')},{...ctx('admin'),jobsEnabled:false},{...ctx('supervisor'),employeeId:''},{...ctx('admin'),userId:''}]) assert.equal(API.canOpen(c),false);
  const {adapter,job,rev}=setup(); adapter.setContext(ctx('employee'));
  assert.throws(()=>adapter.list(),/denied/); assert.throws(()=>adapter.start(job.id,rev()),/denied/);
});
test('unassigned supervisor cannot read a job',()=>{const {adapter,job}=setup();adapter.setContext({...ctx('supervisor'),employeeId:'other'});assert.equal(adapter.list().length,0);assert.throws(()=>adapter.detail(job.id),/denied/);});
test('multi-day lifecycle, correction, immutability and snapshot',()=>{
  const {adapter,job,rev}=setup();adapter.setContext(ctx('supervisor'));
  adapter.start(job.id,rev()); assert.throws(()=>adapter.submit(job.id,rev()),/open/);
  adapter.evidence(job.id,rev(),'material',{description:'Cable',quantity:2,unit:'metres'});
  adapter.finish(job.id,rev(),'Day one','Continue tomorrow');
  adapter.start(job.id,rev());adapter.finish(job.id,rev(),'Day two','');
  assert.equal(adapter.detail(job.id).workDays.length,2);
  assert.equal(adapter.detail(job.id).workDays[0].materialIds.length,1);
  adapter.submit(job.id,rev());adapter.setContext(ctx('admin'));adapter.returnCorrection(job.id,rev(),'Add test');
  adapter.setContext(ctx('supervisor'));adapter.evidence(job.id,rev(),'test',{description:'Check',result:'PASS'});adapter.submit(job.id,rev());
  adapter.setContext(ctx('admin'));adapter.approve(job.id,rev(),{name:'Original Company',logoUrl:''});
  const completed=adapter.detail(job.id);assert.equal(completed.status,'completed');assert.equal(completed.cardSnapshot.company.name,'Original Company');
  assert.throws(()=>adapter.approve(job.id,rev(),{}),/read-only/);
});
test('one open session across jobs and stale revisions',()=>{
  const {adapter,job,rev}=setup();const other=adapter.create({title:'Other',clientName:'Client',scheduledDate:'2026-09-02',teamIds:[]});
  adapter.setContext(ctx('supervisor'));const before=rev();adapter.start(job.id,before);
  assert.throws(()=>adapter.start(job.id,before),/changed/);
  assert.throws(()=>adapter.start(other.id,other.revision),/open/);
});
test('bad evidence is atomic; empty and storage failure are not fake success',()=>{
  const {adapter,job,rev}=setup();adapter.setContext(ctx('supervisor'));adapter.start(job.id,rev());const before=JSON.stringify(adapter.getState());
  assert.throws(()=>adapter.evidence(job.id,rev(),'material',{description:'X',quantity:-1,unit:'unit'}),/positive/);
  assert.equal(JSON.stringify(adapter.getState()),before);
  const empty=API.createMock({location:{protocol:'file:'},fixtures:()=>({jobs:[],sequence:1}),storage:{getItem:()=>JSON.stringify({jobs:[],sequence:2}),setItem:()=>{throw Error('full');}},identity:person,team:[]});
  assert.equal(empty.getState().sequence,2);assert.throws(()=>empty.create({title:'X',teamIds:[]}),/storage/);assert.equal(empty.getState().jobs.length,0);
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
