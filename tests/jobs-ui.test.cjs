// No app.js, network, Supabase, real credentials or persistent browser state.
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const {parseHTML}=require('linkedom');
const crypto=require('node:crypto');
test('job actions menu is hidden at the workspace mobile breakpoint',()=>{
  const css=fs.readFileSync('public/jobs.css','utf8');
  assert.match(css,/@media \(max-width: 700px\)\s*\{\s*\.jobsMoreActions\s*\{\s*display: none;/);
});
test('job card print restores desktop columns and avoids doubled page padding',()=>{
  const css=fs.readFileSync('public/jobs.css','utf8');
  const print=css.slice(css.lastIndexOf('@media print'));
  assert.match(print,/\.jobsPaperHead \{ display: flex; flex-direction: row/);
  assert.match(print,/\.jobsPaperNumber \{ text-align: right/);
  assert.match(print,/\.jobsPaperGrid \{ display: grid; grid-template-columns: repeat\(2, minmax\(0, 1fr\)\)/);
  assert.match(print,/\.jobsJobCardPaper \{[^}]*padding: 0/);
  assert.match(print,/@page jobsCard/);
});
test('printed job card excludes its app toolbar without hiding the paper',()=>{
  const css=fs.readFileSync('public/jobs.css','utf8');
  assert.match(css,/@media print\s*\{\s*body\.jobsPrinting \.jobsPrintPanel > \.jobsPanelHead\s*\{\s*display: none !important;/);
  assert.match(css,/body\.jobsPrinting \.jobsPrintPanel\s*\{\s*display: block !important;/);
});
const tick=()=>new Promise(resolve=>setImmediate(resolve));
const liveCtx={userId:'u',companyId:'company-a',role:'admin',employeeId:'real-employee',jobsEnabled:true,version:1};
const liveRow={id:'real-job',company_id:'company-a',job_number:'JC-2026-0100',title:'Stored work',client_name:'Stored client',company_name:'Stored company',lifecycle_status:'scheduled',revision:1,priority:'normal',updated_at:'2026-09-08T10:00:00Z'};
function transport(respond) {
  const requests=[];
  return {requests,rpc(){assert.fail('Mutation RPC forbidden');},storage:new Proxy({},{get(){assert.fail('Storage forbidden');}}),from(table){
    const r={table,filters:{}};requests.push(r);
    const q={select(fields){r.fields=fields;return q;},eq(k,v){r.filters[k]=v;return q;},order(){return q;},range(a,b){r.range=[a,b];return q;},single(){r.single=true;return q;},
      insert(){assert.fail('Insert forbidden');},update(){assert.fail('Update forbidden');},delete(){assert.fail('Delete forbidden');},
      then(resolve,reject){return Promise.resolve().then(()=>respond(r)).then(resolve,reject);}};return q;
  }};
}
function storedResponse(r) {return {data:r.table==='jobs'?(r.single?liveRow:[liveRow]):r.table==='job_assignments'?[{job_id:liveRow.id,employee_id:liveCtx.employeeId,employee_name:'Stored Supervisor',assignment_role:'lead'}]:[],error:null};}
function planningTransport() {
  let job={...liveRow},revision=1;
  const calls=[];
  const client=transport(r=>{
    const directories={sites:[{site_id:'SITE-REAL',name:'Stored site',active:true}],employees:[{employee_id:'LEAD',full_name:'Lead Person',active:true},{employee_id:'MEMBER',full_name:'Team Person',active:true},{employee_id:'INACTIVE',full_name:'Inactive',active:false}],company_users:[{user_id:'lead-user',employee_id:'LEAD',active:true,role:'supervisor'},{user_id:'inactive-user',employee_id:'INACTIVE',active:true,role:'supervisor'}]};
    if(directories[r.table])return {data:directories[r.table]};
    if(r.table==='jobs')return {data:r.single?{...job,revision}:[{...job,revision}]};
    if(r.table==='job_assignments')return {data:[{employee_id:'LEAD',employee_name:'Lead Person',assignment_role:'lead'},{employee_id:'MEMBER',employee_name:'Team Person',assignment_role:'member'}]};
    return {data:[]};
  });
  client.calls=calls;
  client.rpc=async(name,args)=>{
    if(name==='jobs_lead_directory'){assert.equal(args.p_company_id,'company-a');return {data:[{employee_id:'LEAD',full_name:'Lead Person',supervisor_id:'SUP01'}]};}
    assert.ok(['create_job_with_team','assign_job_employee','replace_job_lead','unassign_job_employee','schedule_job'].includes(name),name);
    calls.push({name,args});revision++;
    if(name==='create_job_with_team'){job={...job,...args.p_data,id:'created-real',job_number:'BACKEND-900',lifecycle_status:args.p_schedule?'scheduled':'draft'};return {data:{...job,revision}};}
    return {data:revision};
  };
  return client;
}
function executionTransport({active=true,assigned=true,status='scheduled',otherSession=false,lead=true}={}) {
  const model={job:{...liveRow,lifecycle_status:status},revision:1,sessions:otherSession?[{id:'other-session',employee_id:'OTHER',employee_name:'Other technician',started_at:'2026-09-08T08:00:00Z',ended_at:null}]:[],days:[],activity:[],calls:[]};
  const client=transport(r=>{
    assert.ok(['jobs','employees','job_assignments','job_time_entries','job_work_days','job_materials','job_test_results','job_notes','job_activity','job_completion_snapshots'].includes(r.table),'Forbidden table: '+r.table);
    if(r.table==='job_completion_snapshots')return {data:model.snapshot?[{payload:model.snapshot}]:[]};
    if(r.table==='jobs')return {data:r.single?{...model.job,revision:model.revision}:[{...model.job,revision:model.revision}]};
    if(r.table==='job_materials')return {data:model.materials||[]};
    if(r.table==='employees')return {data:active?[{employee_id:liveCtx.employeeId,active:true}]:[]};
    const rows={job_assignments:assigned?[{employee_id:liveCtx.employeeId,employee_name:'Stored Supervisor',assignment_role:lead?'lead':'member'}]:[],job_time_entries:model.sessions,job_work_days:model.days,job_activity:model.activity};
    return {data:JSON.parse(JSON.stringify((rows[r.table]||[]).map(row=>({job_id:model.job.id,...row}))))};
  });
  client.model=model;
  client.rpc=async(name,args)=>{
    model.calls.push({name,args});assert.equal(args.p_revision,model.revision);
    if(name==='add_job_evidence'){
      assert.equal(args.p_kind,'material');const session=model.sessions.find(s=>s.employee_id===liveCtx.employeeId&&!s.ended_at);assert.ok(session);
      model.materials=[...(model.materials||[]),{id:'saved-material',...args.p_data,session_id:session.id,actor_name:'Stored Supervisor',created_at:'2026-09-09T09:00:00Z'}];model.revision++;return {data:'saved-material'};
    }
    if(name==='start_job_work') {
      model.job.lifecycle_status='in_progress';model.sessions.push({id:'stored-session-'+model.revision,employee_id:liveCtx.employeeId,employee_name:'Stored Supervisor',started_at:`2026-09-${String(8+model.days.length).padStart(2,'0')}T08:00:00Z`,ended_at:null});model.revision++;return {data:'ack-session-not-for-render'};
    }
    if(name==='finish_work_for_today') {
      const s=model.sessions.find(s=>s.employee_id===liveCtx.employeeId&&!s.ended_at);assert.ok(s);s.ended_at=s.started_at.replace('08:00','16:00');
      model.days.push({id:'stored-day-'+model.revision,session_id:s.id,work_date:s.started_at.slice(0,10),work_performed:args.p_work,notes:args.p_notes,created_at:s.ended_at});model.revision++;return {data:'ack-day-not-for-render'};
    }
    const lifecycle={submit_job_for_review:['submitted_for_review','submitted_for_review'],resubmit_job_for_review:['submitted_for_review','resubmitted'],return_job_for_correction:['correction_required','returned_for_correction'],approve_job_complete:['completed','completed'],cancel_job:['cancelled','cancelled']}[name];
    if(lifecycle){
      model.revision++;model.job.lifecycle_status=lifecycle[0];
      if(name==='return_job_for_correction'){model.job.corrected_at='2026-09-09T09:00:00Z';model.job.correction_reason=args.p_reason;}
      if(name==='resubmit_job_for_review')model.job.correction_reason=null;
      if(name==='cancel_job')model.job.cancel_reason=args.p_reason;
      model.activity.push({id:'event-'+model.revision,event_type:lifecycle[1],summary:args.p_reason||lifecycle[1],actor_name:'Backend actor',occurred_at:'2026-09-09T10:00:00Z'});
      if(name==='approve_job_complete'){
        model.job.completed_at='2026-09-09T10:00:00Z';model.job.completed_actor_name='Backend manager';
        model.snapshot=JSON.parse(JSON.stringify({job:{...model.job,revision:model.revision,company_name:'Frozen Company'},job_assignments:[{employee_id:liveCtx.employeeId,employee_name:'Frozen Lead',assignment_role:'lead'}],job_time_entries:model.sessions,job_work_days:model.days,job_activity:model.activity,job_notes:[{id:'note',note:'Frozen historical note',created_at:'2026-09-08T09:00:00Z'}]}));
      }
      return {data:model.revision};
    }
    assert.equal(name,'admin_close_job_session');const s=model.sessions.find(s=>s.id===args.p_session_id);assert.ok(s);s.ended_at='2026-09-08T17:00:00Z';model.revision++;
    model.activity.push({id:'audit',event_type:'session_admin_closed',summary:args.p_reason,actor_name:'Manager',occurred_at:s.ended_at});return {data:model.revision};
  };
  return client;
}
async function harness(role='admin',host='localhost',appContext=null,client=null) {
  const hostDocument=parseHTML(fs.readFileSync('public/login.html','utf8')).document;
  const companyNavigation=hostDocument.querySelector('#companyAdminShell .platformActions').outerHTML;
  const supervisorNavigation=hostDocument.querySelector('#appShell .headerActions').outerHTML;
  const {window}=parseHTML(`<html><body><div id="authScreen"></div><main id="companyAdminShell">${companyNavigation}</main><main id="appShell">${supervisorNavigation}</main></body></html>`);
  const timers=[];
  const context={window,document:window.document,location:new URL(`http://${host}/login?jobsDemo=${role}&jobsQa=1`),
    URL,URLSearchParams,crypto,Intl,Date,console,MutationObserver:window.MutationObserver,
    localStorage:{getItem:()=>null,setItem:()=>assert.fail('QA must not persist')},
    setTimeout:fn=>{timers.push(fn);return timers.length;},clearTimeout:()=>{},setInterval:()=>0,clearInterval:()=>{},
    requestAnimationFrame:fn=>fn(),getComputedStyle:()=>({}),
    FormData:class {constructor(form){this.form=form;}get(name){return this.form.querySelector(`[name="${name}"]`)?.value ?? null;}getAll(name){return [...this.form.querySelectorAll(`[name="${name}"]`)].filter(el=>el.type!=='checkbox'||el.checked).map(el=>el.value);}}
  };
  window.location=context.location;window.scrollTo=()=>{};
  window.HTMLElement.prototype.getClientRects=()=>[{width:100,height:40}];
  if(client)context.sb=client;
  let currentContext=appContext;
  window.ShiftlyJobsContext={get:()=>currentContext||{}};
  window.fetch=()=>assert.fail('Network forbidden');
  window.supabase={createClient:()=>assert.fail('No Supabase client may be created')};
  context.history={replaceState:(_,__,url)=>{window.location=context.location=new URL(url);}};
  vm.createContext(context);
  vm.runInContext(fs.readFileSync('public/jobs-data.js','utf8'),context);
  // Test-only closure inspection; never included in production Jobs exports.
  const source=fs.readFileSync('public/jobs.js','utf8').replace(/\}\)\(\);\s*$/,`window.__jobsTest={context:currentJobsContext,employee:jobsEmployeeId,directories:getDirectories,
    photos:photosTab,signoff:signoffTab,media:mediaAvailable,loadLiveDetail,
    state:()=>state,seed:()=>{state={jobs:[{id:'old-company'}]};liveDrafts.set('old','draft');directoryCache={team:[]};},
    draftCount:()=>liveDrafts.size,generation:()=>contextGeneration,mutate:performAction,start:startJob,finish:finishWork,adapter:()=>liveAdapter,detail:()=>liveDetail,validate:validatePlanCreate,openPlanning,planningMutation,closeJobs,refreshRequired:()=>planningRefreshRequired};})();`);
  vm.runInContext(source,context);
  if(role!=='employee'&&host==='localhost') await (role==='supervisor'?window.ShiftlyJobs.openSupervisor():window.ShiftlyJobs.openAdmin());
  const click=async selector=>{
    // Workflow tests navigate to the action's new home before exercising it.
    if(/data-action="(?:plan-team|plan-schedule|execute-recover)"/.test(selector)&&window.document.querySelector('[data-tab="team-time"]')){
      window.document.querySelector('[data-tab="team-time"]').dispatchEvent(new window.Event('click',{bubbles:true}));await tick();
    }
    const el=window.document.querySelector(selector);assert.ok(el,`Missing ${selector}`);el.dispatchEvent(new window.Event('click',{bubbles:true}));await tick();};
  const submit=async values=>{const form=window.document.querySelector('#jobsModal form');assert.ok(form,'modal form');for(const [name,value] of Object.entries(values)){const el=form.querySelector(`[name="${name}"]`);assert.ok(el,name);if(el.tagName==='SELECT'){for(const option of el.querySelectorAll('option')) option.removeAttribute('selected');el.querySelector(`option[value="${value}"]`).selected=true;}else el.value=value;}form.dispatchEvent(new window.Event('submit',{bubbles:true,cancelable:true}));await tick();};
  return {window,document:window.document,click,submit,changeContext(value){currentContext=value;window.dispatchEvent(new window.Event('shiftly:company-context'));}};
}
test('Admin dashboard, All Jobs, modal and Job Card render through adapter',async()=>{
  const h=await harness();
  assert.match(h.document.body.textContent,/Active Jobs/);
  await h.click('[data-action="all-jobs"]');assert.ok(h.document.querySelector('#jobsSearch'));
  await h.click('[data-action="open"]');assert.ok(h.document.querySelector('#jobsWorkspaceTitle'));
  await h.click('[data-tab="card"]');assert.ok(h.document.querySelector('.jobsJobCardPaper'));
});
test('Supervisor dashboard and start/finish modal stay functional',async()=>{
  const h=await harness('supervisor');
  await h.click('.current [data-action="open"]');
  assert.ok(h.document.querySelector('#jobsWorkspaceTitle'),h.document.body.textContent);
  const form=h.document.querySelector('#jobsTodayForm');assert.ok(form);
  form.querySelector('[name="todayWork"]').value='Test work completed locally';
  form.querySelector('[name="todayNotes"]').value='Continue tomorrow';
  form.dispatchEvent(new h.window.Event('submit',{bubbles:true,cancelable:true}));await tick();
  assert.match(h.document.body.textContent,/Test work completed locally/);
  await h.click('[data-tab="today"]');await h.click('[data-action="start"]');
  assert.ok(h.document.querySelector('#jobsTodayForm'));
});
test('Employee and non-local jobsDemo never open Jobs',async()=>{
  for(const [role,host] of [['employee','localhost'],['admin','shiftlyapp.co.za']]){
    const h=await harness(role,host);if(host!=='localhost')await h.window.ShiftlyJobs.openAdmin();
    assert.equal(h.document.querySelector('#jobsShell').hidden,true);
  }
});
test('Create Job preserves the existing fields and opens the new workspace',async()=>{
  const h=await harness();await h.click('[data-action="create"]');
  await h.submit({title:'Local QA job',clientName:'Neutral client',address:'Demo address',description:'Local work',scheduled:'2026-09-10'});
  assert.match(h.document.querySelector('#jobsWorkspaceTitle').textContent,/Local QA job/);
});
test('UI review, correction, resubmission and approval create a read-only card',async()=>{
  const h=await harness();await h.click('[data-action="open"][data-id="job-0045"]');
  await h.click('[data-action="return"]');await h.submit({reason:'Record final check'});
  await h.window.ShiftlyJobs.openSupervisor();await h.click('[data-action="open"][data-id="job-0045"]');
  await h.click('[data-action="submit"]');await h.submit({});
  await h.window.ShiftlyJobs.openAdmin();await h.click('[data-action="open"][data-id="job-0045"]');
  await h.click('[data-action="approve"]');await h.submit({});
  assert.ok(h.document.querySelector('.jobsJobCardPaper'));
  assert.match(h.document.querySelector('.jobsJobCardPaper').textContent,/Completed/);
  assert.equal(h.document.querySelector('[data-action="approve"]'),null);
});

test('live context gates navigation and programmatic entry without initializing Jobs transport',async()=>{
  const base={userId:'u',companyId:'c',role:'admin',employeeId:'REAL-42',jobsEnabled:true};
  for(const [role,enabled,employeeId,eligible] of [
    ['owner',true,'',true],['admin',true,'',true],['supervisor',true,'REAL-42',true],
    ['admin',false,'',false],['owner',undefined,'',false],['admin',null,'',false],
    ['employee',true,'REAL-42',false],['billing',true,'',false],['viewer',true,'',false],['supervisor',true,'',false]]){
    const h=await harness('admin','preview.invalid',{...base,role,jobsEnabled:enabled,employeeId});
    assert.equal(h.document.querySelector(role==='supervisor'?'#btnOpenJobsSupervisor':'#btnOpenJobsAdmin').hidden,!eligible);
    await h.window.ShiftlyJobs.openAdmin();await h.window.ShiftlyJobs.openSupervisor();
    assert.equal(h.document.querySelector('#jobsShell').hidden,true);
    assert.equal(h.window.__jobsTest.employee(),employeeId);
    assert.equal(h.window.__jobsTest.directories(),null);
    assert.equal(h.window.__jobsTest.state().jobs.length,0);
    assert.equal(h.window.__jobsTest.media(),false);
    assert.match(h.window.__jobsTest.photos({photos:[]}),/disabled/);
    assert.match(h.window.__jobsTest.signoff({}),/later phase/);
  }
});

test('company switch and sign-out clear prepared rows, directories, drafts and dialogs',async()=>{
  const h=await harness('admin','preview.invalid',{userId:'u',companyId:'a',role:'admin',jobsEnabled:true});
  const api=h.window.__jobsTest;let generation=api.generation();api.seed();
  h.changeContext({userId:'u',companyId:'b',role:'admin',jobsEnabled:false});
  assert.ok(api.generation()>generation);assert.equal(api.state().jobs.length,0);assert.equal(api.directories(),null);assert.equal(api.draftCount(),0);
  generation=api.generation();api.seed();h.changeContext({});
  assert.ok(api.generation()>generation);assert.equal(api.state().jobs.length,0);assert.equal(api.draftCount(),0);
  assert.equal(h.document.querySelector('#jobsShell').hidden,true);assert.equal(h.document.querySelector('#jobsModal').hidden,true);
});

test('mock directories use IDs and explicit scheduling, never a date-only transition',async()=>{
  const h=await harness();assert.equal(h.window.__jobsTest.employee(),'E100');assert.ok(h.window.__jobsTest.directories().team.length);
  await h.click('[data-action="create"]');
  const site=h.document.querySelector('[name="site"] option[value="WORKSHOP"]');assert.equal(site.textContent,'Workshop');
  assert.equal(h.document.querySelector('[name="scheduled"]').required,undefined); // linkedom: absent required attribute
  await h.submit({title:'Draft with date',clientName:'Neutral',address:'Area',description:'Work',scheduled:'2026-09-10',site:'WORKSHOP'});
  let job=h.window.__jobsTest.state().jobs.find(j=>j.title==='Draft with date');
  assert.equal(job.status,'draft');assert.equal(job.siteId,'WORKSHOP');assert.equal(job.site,'Workshop');
  await h.window.ShiftlyJobs.openAdmin();await h.click('[data-action="create"]');
  h.document.querySelector('[name="scheduleIntent"]').checked=true;
  await h.submit({title:'Scheduled explicitly',clientName:'Neutral',address:'Area',description:'Work',scheduled:'2026-09-11'});
  job=h.window.__jobsTest.state().jobs.find(j=>j.title==='Scheduled explicitly');assert.equal(job.status,'scheduled');
});

test('app bridge and loader preserve existing context and fail closed for missing flag',async()=>{
  const source=fs.readFileSync('public/app.js','utf8');
  const bridge=source.slice(source.indexOf('window.ShiftlyJobsContext ='),source.indexOf('\n} });',source.indexOf('window.ShiftlyJobsContext ='))+6);
  const c={window:{},currentUser:{id:'u'},currentCompanyId:'c',currentCompanyRole:'supervisor',currentCompanyEmployeeId:'REAL',jobsContextVersion:3,currentCompany:()=>({id:'c',jobs_enabled:true})};
  vm.runInNewContext(bridge,c);assert.equal(c.window.ShiftlyJobsContext.get().employeeId,'REAL');assert.equal(c.window.ShiftlyJobsContext.get().jobsEnabled,true);
  c.currentCompany=()=>({id:'c'});assert.equal(c.window.ShiftlyJobsContext.get().jobsEnabled,false);
  assert.match(source,/select\("id,name,plan,status,logo_url,billing_enabled,jobs_enabled"\)/);
  assert.match(source,/jobs_enabled: c.jobs_enabled === true/);
});

test('company loader fails closed on refresh errors and preserves Billing in Jobs-column fallback',async()=>{
  const source=fs.readFileSync('public/app.js','utf8');
  const loader=source.slice(source.indexOf('async function loadCompanyAccess()'),source.indexOf('function canUseCompanyDashboard()'));
  for(const fail of [true,false]) {
    const selections=[];let companyQueries=0;
    const c={currentUser:{id:'u'},companies:[{id:'c',jobs_enabled:true,billing_enabled:true}],jobsContextVersion:0,
      currentCompanyId:'c',COMPANIES_TABLE:'companies',COMPANY_USERS_TABLE:'company_users',COMPANY_USERS_COMPANY_COL:'company_id',COMPANY_USERS_ROLE_COL:'role',COMPANY_USERS_ACTIVE_COL:'active',COMPANY_USERS_USER_COL:'user_id',
      Event:class{},window:{dispatchEvent(){}},populateCompanySelect(){},sb:{from(table){
        const q={select(fields){selections.push(fields);return q;},eq(){return q;},in(){return q;},order(){return q;},
          then(resolve){return Promise.resolve(table==='company_users'
            ? {data:[{company_id:'c',role:'admin',employee_id:'REAL'}],error:fail?{message:'offline'}:null}
            : ++companyQueries===1 ? {error:{message:'column jobs_enabled does not exist'}}
            : {data:[{id:'c',name:'Company',billing_enabled:true,logo_url:'logo'}],error:null}).then(resolve);}};return q;
      }}};
    vm.runInNewContext(loader,c);
    if(fail) await assert.rejects(c.loadCompanyAccess(),/offline/);else await c.loadCompanyAccess();
    assert.equal(c.companies[0].jobs_enabled,false);
    assert.equal(c.companies[0].billing_enabled,true);
    if(!fail){assert.ok(selections.includes('id,name,plan,status,logo_url,billing_enabled'));assert.equal(c.currentCompanyEmployeeId,'REAL');}
  }
});

test('eligible live roles read scoped dashboard relationships without per-job fanout; mutations remain locked',async()=>{
  for(const role of ['owner','admin','supervisor']){
    const client=transport(storedResponse),h=await harness('admin','preview.invalid',{...liveCtx,role},client);
    await h.window.ShiftlyJobs.openAdmin();
    assert.equal(client.requests.length,3);assert.ok(client.requests.every(r=>r.filters.company_id==='company-a'));
    assert.equal(h.window.__jobsTest.state().jobs[0].detailLoaded,false);
    assert.equal(h.window.__jobsTest.state().jobs[0].sessions.length,0);
    assert.match(h.document.body.textContent,/Stored work/);assert.doesNotMatch(h.document.body.textContent,/E100|Thabo|Highveld|Demo Service/);
    assert.equal(!!h.document.querySelector('[data-action="plan-create"]'),role!=='supervisor');
    assert.equal(h.window.__jobsTest.adapter().evidence,undefined);
    await h.window.__jobsTest.mutate(()=>assert.fail('Mutation handler ran'));
    await assert.rejects(h.window.__jobsTest.start({id:'real-job'}),/read-only/);
    await assert.rejects(h.window.__jobsTest.finish({id:'real-job'}),/read-only/);
    await h.click('[data-action="open"]');
    assert.match(h.document.querySelector('#jobsWorkspaceTitle').textContent,/Stored work/);
    assert.equal(h.window.__jobsTest.detail().detailLoaded,true);
    assert.equal(client.requests.some(r=>/job_photos|job_client_signoffs/.test(r.table)),false);
    assert.equal(h.document.querySelector('[data-action="start"]'),null);
    assert.equal(h.document.querySelector('[data-action="approve"]'),null);
  }
});

test('live Jobs mirrors role-specific host navigation, active Jobs, logout and Billing visibility',async()=>{
  for(const role of ['owner','admin','supervisor']){
    const h=await harness('admin','preview.invalid',{...liveCtx,role},transport(storedResponse));
    const admin=role!=='supervisor';
    const logout=h.document.getElementById(admin?'btnCompanyAdminLogout':'btnLogout');let signedOut=0;
    logout.addEventListener('click',()=>signedOut++);
    const switchButton=h.document.getElementById(admin?'btnCompanyAdminPortfolio':'btnBackToPortfolio');switchButton.hidden=false;
    await h.window.ShiftlyJobs.openAdmin();
    const nav=()=>h.document.querySelector('.jobsGlobalActions');
    assert.ok(nav().querySelector(`[data-host-id="${logout.id}"]`));
    assert.equal(nav().querySelector(`[data-host-id="${switchButton.id}"]`),null);
    assert.equal(nav().querySelector('[data-host-id="btnOpenBilling"]'),null);
    assert.equal(nav().querySelector('[aria-current="page"].jobsNavActive'),null);
    assert.ok(nav().querySelector('[data-action="close"]'));
    assert.equal(nav().querySelector('[data-action="close"]').getAttribute('aria-label'),admin?'Company Dashboard':'Open scanner');
    assert.equal(h.document.querySelector('[aria-label="Refresh Jobs"]'),null);
    if(admin){
      const billing=h.document.getElementById('btnOpenBilling');let opened=0;billing.addEventListener('click',()=>opened++);
      billing.hidden=false;await tick();assert.ok(nav().querySelector('[data-host-id="btnOpenBilling"]'));
      const stale=nav().querySelector('[data-host-id="btnOpenBilling"]');billing.hidden=true;
      stale.click();await tick();assert.equal(opened,0);assert.equal(nav().querySelector('[data-host-id="btnOpenBilling"]'),null);
    }
    await h.click(`.jobsGlobalActions [data-host-id="${logout.id}"]`);
    assert.equal(signedOut,1);assert.equal(h.document.querySelector('#jobsShell').hidden,true);
    assert.equal(h.window.__jobsTest.adapter(),null);assert.equal(h.window.__jobsTest.state().jobs.length,0);
  }
});

test('host company-navigation handlers are reused and clear the Jobs workspace before running',async()=>{
  const h=await harness('admin','preview.invalid',liveCtx,transport(storedResponse));
  const button=h.document.getElementById('btnOpenClocking');button.hidden=false;let calls=0;
  button.addEventListener('click',()=>{calls++;assert.equal(h.document.querySelector('#jobsShell').hidden,true);assert.equal(h.window.__jobsTest.state().jobs.length,0);});
  await h.window.ShiftlyJobs.openAdmin();await h.click('.jobsGlobalActions [data-host-id="btnOpenClocking"]');assert.equal(calls,1);
});

test('live Admin reuses approved dashboard, All Jobs and sectioned Create form',async()=>{
  const h=await harness('admin','preview.invalid',{...liveCtx,company:{name:'Actual company'}},planningTransport());
  await h.window.ShiftlyJobs.openAdmin();
  assert.ok(h.document.querySelector('.jobsCompanyContext'));
  assert.equal(h.document.querySelectorAll('.jobsNativeStats .stat').length,5);
  assert.equal(h.document.querySelectorAll('.jobsAdminGroups .jobsGroupPanel').length,4);
  assert.match(h.document.querySelector('.jobsCompanyContext').textContent,/Actual company/);
  await h.click('[data-action="all-jobs"]');
  assert.ok(h.document.querySelector('.jobsAllJobsCard'));
  await h.click('.jobsAllJobsCard [data-action="open"]');
  await h.click('[data-action="dashboard"]');
  assert.ok(h.document.querySelector('.jobsAllJobsCard'));
  await h.click('[data-action="all-jobs-close"]');
  await h.click('[data-action="plan-create"]');
  assert.equal(h.document.querySelectorAll('.jobsCreateSections > section').length,4);
  assert.ok(h.document.querySelector('#jobsTeamSearch'));
  assert.match(h.document.querySelector('#jobsModal').textContent,/Lead Supervisor/);
});

test('live Supervisor uses grouped dashboard and Today form without mock evidence writes',async()=>{
  const client=executionTransport({status:'in_progress'});
  client.model.sessions.push({id:'own',employee_id:liveCtx.employeeId,started_at:'2026-09-09T08:00:00Z',ended_at:null});
  const h=await harness('admin','preview.invalid',{...liveCtx,role:'supervisor'},client);
  await h.window.ShiftlyJobs.openSupervisor();
  assert.equal(h.document.querySelectorAll('.jobsSupervisorGroup').length,5);
  assert.ok(h.document.querySelector('.jobsSupervisorRow.current'));
  await h.click('[data-action="open"]');
  const form=h.document.querySelector('#jobsTodayForm');assert.ok(form);
  assert.ok(h.document.querySelector('[data-action="add-material"]'));
  form.querySelector('[name="todayWork"]').value='Draft work';
  form.dispatchEvent(new h.window.Event('submit',{bubbles:true,cancelable:true}));await tick();
  assert.equal(h.document.querySelector('#jobsModal [name="work"]').value,'Draft work');
  assert.equal(client.model.calls.length,0,'opening finish confirmation must not write');
});
test('live materials save through revision RPC and refresh into work record and Job Card',async()=>{
  const client=executionTransport({status:'in_progress'});
  client.model.sessions.push({id:'own',employee_id:liveCtx.employeeId,started_at:'2026-09-09T08:00:00Z',ended_at:null});
  const h=await harness('admin','preview.invalid',{...liveCtx,role:'supervisor'},client);
  await h.window.ShiftlyJobs.openSupervisor();await h.click('[data-action="open"]');await h.click('[data-action="add-material"]');
  await h.submit({description:'Cable',quantity:'0',unit:'metres'});assert.equal(client.model.calls.length,0);
  await h.submit({description:'Cable',quantity:'2.5',unit:'metres'});assert.equal(client.model.calls.length,1);
  const job=h.window.__jobsTest.detail();assert.equal(job.materials[0].sessionId,'own');assert.equal(job.materials[0].quantity,2.5);assert.equal(job.revision,2);
  assert.match(h.document.body.textContent,/Cable/);
});

test('disabled, missing entitlement and ineligible roles initialize no adapter and perform zero reads',async()=>{
  for(const c of [{...liveCtx,jobsEnabled:false},{...liveCtx,jobsEnabled:undefined},{...liveCtx,jobsEnabled:null},
    ...['employee','billing','viewer','unknown'].map(role=>({...liveCtx,role})),{...liveCtx,role:'supervisor',employeeId:''}]){
    const client=transport(()=>assert.fail('Unexpected read')),h=await harness('admin','preview.invalid',c,client);
    await h.window.ShiftlyJobs.openAdmin();await h.window.ShiftlyJobs.openSupervisor();
    assert.equal(client.requests.length,0);assert.equal(h.window.__jobsTest.adapter(),null);
    assert.equal(h.document.querySelector('#jobsShell').hidden,true);
  }
});

test('live dashboard loading, empty and explicit retry never use fixtures',async()=>{
  let resolve,mode='loading';const client=transport(r=>r.table!=='jobs'?{data:[]}:mode==='loading'?new Promise(done=>resolve=done):mode==='error'?{error:{code:'NETWORK',message:'offline'}}:{data:[]});
  const h=await harness('admin','preview.invalid',liveCtx,client);
  const opening=h.window.ShiftlyJobs.openAdmin();await tick();assert.match(h.document.body.textContent,/Loading Jobs/);
  resolve({data:Array.from({length:25},(_,i)=>({...liveRow,id:'j'+i}))});await opening;
  mode='empty';await h.window.ShiftlyJobs.openAdmin();
  assert.match(h.document.body.textContent,/No active jobs/i);
  mode='error';await h.window.ShiftlyJobs.openAdmin();
  assert.match(h.document.body.textContent,/Retry list/);assert.doesNotMatch(h.document.body.textContent,/Thabo|Highveld/);
  const count=client.requests.length;await tick();assert.equal(client.requests.length,count);
  mode='empty';await h.click('[data-action="live-retry"]');assert.equal(client.requests.length,count+3);
});

test('late list and detail are discarded on company switch and sign-out',async()=>{
  for(const detail of [false,true]) for(const nextContext of [{...liveCtx,companyId:'company-b',version:2},{}]){
    let resolve;const client=transport(r=>(detail?r.single:r.table==='jobs')?new Promise(done=>resolve=done):storedResponse(r));
    const h=await harness('admin','preview.invalid',liveCtx,client);
    let pending=h.window.ShiftlyJobs.openAdmin();
    if(detail){await pending;pending=h.click('[data-action="open"]');}
    await tick();assert.match(h.document.body.textContent,detail?/Loading Job detail/:/Loading Jobs/);
    h.changeContext(nextContext);resolve({data:detail?liveRow:[liveRow]});await pending;await tick();
    assert.equal(h.document.querySelector('#jobsShell').hidden,true);
    assert.equal(h.window.__jobsTest.state().jobs.length,0);assert.equal(h.window.__jobsTest.detail(),null);
    assert.doesNotMatch(h.document.querySelector('#jobsRoot').textContent,/Stored work/);
  }
});

test('denied access clears and closes; deleted Job returns to list',async()=>{
  for(const code of ['42501','PGRST301','PGRST302','SESSION_EXPIRED','PGRST116']){
    const client=transport(r=>r.single?{error:{code,message:'Unavailable'}}:storedResponse(r));
    const h=await harness('admin','preview.invalid',liveCtx,client);await h.window.ShiftlyJobs.openAdmin();
    await h.click('[data-action="open"]');assert.equal(h.document.querySelector('#jobsWorkspaceTitle'),null);
    assert.equal(h.window.__jobsTest.detail(),null);
    if(code!=='PGRST116'){assert.equal(h.document.querySelector('#jobsShell').hidden,true);assert.equal(h.window.__jobsTest.state().jobs.length,0);assert.equal(h.window.__jobsTest.directories(),null);}
    else {assert.equal(h.document.querySelector('#jobsShell').hidden,false);assert.match(h.document.body.textContent,/no longer available/);}
  }
});

test('completed live Job Card uses persisted snapshot, not current company names',async()=>{
  const client=transport(r=>r.table==='job_completion_snapshots'?{data:[{payload:{job:{...liveRow,title:'Frozen title',company_name:'Frozen Company',lifecycle_status:'completed',completed_at:'2026-09-08T11:00:00Z',completed_actor_name:'Stored approver'}}}]}:{data:r.single?{...liveRow,lifecycle_status:'completed'}:[{...liveRow,lifecycle_status:'completed'}]});
  const h=await harness('admin','preview.invalid',{...liveCtx,company:{name:'New Company'}},client);
  await h.window.ShiftlyJobs.openAdmin();await h.click('[data-action="open"]');await h.click('[data-tab="card"]');
  const card=h.document.querySelector('.jobsJobCardPaper');assert.ok(card);
  assert.match(card.textContent,/Frozen Company/);assert.match(card.textContent,/Frozen title/);assert.doesNotMatch(card.textContent,/New Company/);
  assert.deepEqual([...new Set(client.requests.map(r=>r.table))],['jobs','job_assignments','job_time_entries','job_completion_snapshots']);
});

test('live detail loads stored child records and rejects revision mismatch without retry',async()=>{
  for(const stale of [false,true]) {
    const client=transport(r=>{
      if(r.table==='jobs')return {data:r.single?(r.fields==='revision'?{revision:stale?2:1}:liveRow):[liveRow]};
      const rows={job_assignments:[{employee_id:'real-employee',employee_name:'Stored Supervisor',assignment_role:'lead'}],
        job_time_entries:[{id:'session',employee_id:'real-employee',employee_name:'Stored Supervisor',started_at:'2026-09-08T08:00:00Z',ended_at:'2026-09-08T09:00:00Z'}],
        job_work_days:[{id:'day',session_id:'session',work_date:'2026-09-08',work_performed:'Stored work record',created_at:'2026-09-08T09:00:00Z'}]};
      return {data:rows[r.table]||[]};
    });
    const h=await harness('admin','preview.invalid',liveCtx,client);await h.window.ShiftlyJobs.openAdmin();await h.click('[data-action="open"]');
    if(stale){assert.equal(h.window.__jobsTest.detail(),null);assert.match(h.document.body.textContent,/changed/);}
    else {await h.click('[data-tab="work"]');assert.match(h.document.body.textContent,/Stored work record/);assert.equal(h.window.__jobsTest.detail().lead.name,'Stored Supervisor');}
    const count=client.requests.length;await tick();assert.equal(client.requests.length,count);
  }
});

test('planning directories are minimal, company scoped, active, and isolate eligible leads',async()=>{
  const client=planningTransport(),h=await harness('admin','preview.invalid',liveCtx,client);
  await h.window.ShiftlyJobs.openAdmin();await h.click('[data-action="plan-create"]');
  const dirs=h.window.__jobsTest.directories();assert.equal(dirs.team.length,2);assert.deepEqual(Array.from(dirs.leads,e=>e.employeeId),['LEAD']);
  for(const r of client.requests.filter(r=>['sites','employees','company_users'].includes(r.table))){assert.equal(r.filters.company_id,'company-a');assert.equal(r.filters.active,true);assert.doesNotMatch(r.fields,/salary|rate|email|pay|attendance|id_number/);}
  assert.equal(client.requests.some(r=>r.table==='company_users'),false);
  assert.match(h.document.querySelector('[name="lead"]').textContent,/SUP01 · Lead Person/);
  const select=h.document.querySelector('[name="lead"]');select.querySelector('[value="LEAD"]').selected=true;
  select.dispatchEvent(new h.window.Event('change',{bubbles:true}));
  const leadBox=h.document.querySelector('[name="team"][value="LEAD"]');
  assert.equal(leadBox.checked,true);
  assert.match(leadBox.closest('label').textContent,/Lead Technician · LEAD/);
  assert.match(h.document.querySelector('[name="team"][value="MEMBER"]').closest('label').textContent,/Assigned Technician · MEMBER/);
  assert.match(h.document.querySelector('#jobsModal').textContent,/Team Person/);assert.doesNotMatch(h.document.querySelector('#jobsModal').textContent,/Thabo|E100/);
  const valid={title:'T',clientName:'C',siteId:'SITE-REAL',leadId:'LEAD',teamIds:['MEMBER'],scheduleRequested:false,scheduledDate:'2026-09-10'};
  assert.deepEqual(Array.from(h.window.__jobsTest.validate(valid,dirs).teamIds),['LEAD','MEMBER']);
  for(const invalid of [{siteId:'foreign'},{leadId:'MEMBER'},{teamIds:['MEMBER','MEMBER']},{teamIds:['foreign']},{title:''},{scheduleRequested:true,scheduledDate:''}])assert.throws(()=>h.window.__jobsTest.validate({...valid,...invalid},dirs));
});

test('create submits IDs via atomic RPC, uses backend number, and refreshes authoritative detail',async()=>{
  const client=planningTransport(),h=await harness('admin','preview.invalid',liveCtx,client);
  await h.window.ShiftlyJobs.openAdmin();await h.click('[data-action="plan-create"]');
  h.document.querySelector('[name="team"][value="MEMBER"]').checked=true;
  await h.submit({title:'New Job',clientName:'New client',site:'SITE-REAL',lead:'LEAD',scheduled:'2026-09-10'});
  assert.equal(client.calls.length,1);const call=client.calls[0];assert.equal(call.name,'create_job_with_team');
  assert.equal(call.args.p_data.site_id,'SITE-REAL');assert.equal(call.args.p_lead,'LEAD');assert.deepEqual(Array.from(call.args.p_team),['LEAD','MEMBER']);
  assert.equal(call.args.p_schedule,false);assert.equal(call.args.p_start,null);assert.equal('job_number' in call.args.p_data,false);
  assert.match(h.document.querySelector('#jobsWorkspaceTitle').textContent,/BACKEND-900/);assert.equal(h.window.__jobsTest.detail().revision,2);
});

test('duplicate Create submits are blocked and late create/directory responses do not cross companies',async()=>{
  for(const directory of [true,false]){
    const client=planningTransport();let resolve;let count=0;
    if(directory){const from=client.from;client.from=table=>{const q=from(table);if(table==='employees')q.then=(yes,no)=>new Promise(done=>resolve=done).then(yes,no);return q;};}
    else {const readRpc=client.rpc;client.rpc=(name,args)=>{if(name==='jobs_lead_directory')return readRpc(name,args);count++;return new Promise(done=>resolve=done);};}
    const h=await harness('admin','preview.invalid',liveCtx,client);await h.window.ShiftlyJobs.openAdmin();
    await h.click('[data-action="plan-create"]');
    if(!directory){await h.submit({title:'New',clientName:'C',lead:'LEAD'});await h.submit({});assert.equal(count,1);assert.equal(h.document.querySelector('#jobsModal button[type="submit"]').disabled,true);}
    h.changeContext({...liveCtx,companyId:'company-b',version:2});resolve({data:directory?[{employee_id:'OLD',full_name:'Old',active:true}]:{...liveRow,id:'old-created'}});await tick();await tick();
    assert.equal(h.window.__jobsTest.directories(),null);assert.equal(h.window.__jobsTest.detail(),null);assert.equal(h.document.querySelector('#jobsModal').hidden,true);
  }
});

test('unknown create outcome requires explicit refresh and never retries itself',async()=>{
  const client=planningTransport();let count=0;const readRpc=client.rpc;client.rpc=async(name,args)=>{if(name==='jobs_lead_directory')return readRpc(name,args);count++;return {error:{code:'NETWORK',message:'lost response'}};};
  const h=await harness('admin','preview.invalid',liveCtx,client);await h.window.ShiftlyJobs.openAdmin();await h.click('[data-action="plan-create"]');
  await h.submit({title:'New',clientName:'C',lead:'LEAD'});assert.equal(count,1);assert.match(h.document.querySelector('#jobsModal').textContent,/Outcome could not be confirmed/);
  assert.equal(h.document.querySelector('#jobsModal button[type="submit"]').disabled,true);await h.submit({});assert.equal(count,1);
  await h.click('[data-plan-refresh]');assert.equal(count,1);assert.equal(h.window.__jobsTest.refreshRequired(),false);
  assert.equal(h.document.querySelector('[name="title"]').value,'New');
});

test('Assigned team has a far-right pencil opening the existing team editor without a planning card',async()=>{
  const client=planningTransport(),h=await harness('admin','preview.invalid',liveCtx,client);
  await h.window.ShiftlyJobs.openAdmin();await h.click('[data-action="open"]');await h.click('[data-tab="team-time"]');
  const edit=h.document.querySelector('.jobsTeamEdit');
  assert.ok(edit);
  assert.equal(edit.parentElement.querySelector('h2').textContent,'Assigned team');
  assert.equal(edit.parentElement.lastElementChild,edit);
  assert.ok(edit.querySelector('.ph-pencil-simple'));
  assert.ok(!h.document.querySelector('.jobsWorkspaceBody').textContent.includes('Job planning'));
  assert.match(fs.readFileSync('public/jobs.css','utf8'),/\.jobsTeamEdit \{ margin-left: auto;/);
  await h.click('[data-action="plan-team"]');
  assert.equal(h.document.querySelector('#jobsModal').hidden,false);
  assert.ok(h.document.querySelector('[name="operation"]'));
  assert.equal(client.calls.length,0);
});

test('team and schedule operations use fetched revision and authoritative refresh only',async()=>{
  for(const method of ['assign','replaceLead','unassign','schedule']){
    const client=planningTransport(),h=await harness('admin','preview.invalid',liveCtx,client);await h.window.ShiftlyJobs.openAdmin();await h.click('[data-action="open"]');
    if(method==='schedule'){await h.click('[data-action="plan-schedule"]');await h.submit({startDate:'2026-09-10',startTime:'08:00',endDate:'2026-09-10',endTime:'17:00'});}
    else {await h.click('[data-action="plan-team"]');
      if(method==='assign')h.window.__jobsTest.detail().team=h.window.__jobsTest.detail().team.filter(e=>e.employeeId!=='MEMBER');
      await h.submit({operation:method,employee:'MEMBER',lead:'LEAD'});}
    assert.equal(client.calls.length,1,method);assert.equal(client.calls[0].args.p_revision,1);assert.equal(client.calls[0].args.p_company_id,'company-a');
    assert.equal(h.window.__jobsTest.detail().revision,2);assert.equal(client.calls[0].name,{assign:'assign_job_employee',replaceLead:'replace_job_lead',unassign:'unassign_job_employee',schedule:'schedule_job'}[method]);
  }
});

test('planning stale revision/conflict refresh, access denial cleanup and validation preserve input',async()=>{
  for(const code of ['40001','23505','42501','P0001']){
    const client=planningTransport();let calls=0;
    const readRpc=client.rpc;client.rpc=async(name,args)=>{if(name==='jobs_lead_directory')return readRpc(name,args);calls++;return {error:{code,message:'Backend validation'}};};
    const h=await harness('admin','preview.invalid',liveCtx,client);await h.window.ShiftlyJobs.openAdmin();await h.click('[data-action="open"]');await h.click('[data-action="plan-schedule"]');
    const before=client.requests.length;
    await h.submit({startDate:'2026-09-12',startTime:'09:00'});assert.equal(calls,1);
    if(code==='42501'){assert.equal(h.document.querySelector('#jobsShell').hidden,true);assert.equal(h.window.__jobsTest.detail(),null);}
    else {assert.equal(h.document.querySelector('[name="startDate"]').value,'2026-09-12');assert.ok(h.document.querySelector('.jobsPlanningError'));
      assert.equal(client.requests.length>before,['40001','23505'].includes(code));}
    await tick();assert.equal(calls,1);
  }
});

test('confirmed create with refresh failure cannot send a second create',async()=>{
  const client=planningTransport();const rpc=client.rpc,from=client.from;let saved=false,failReads=true;
  client.rpc=async(...args)=>{const response=await rpc(...args);if(args[0]!=='jobs_lead_directory')saved=true;return response;};
  client.from=table=>{const q=from(table);if(saved&&failReads)q.then=(yes,no)=>Promise.resolve({error:{code:'NETWORK'}}).then(yes,no);return q;};
  const h=await harness('admin','preview.invalid',liveCtx,client);await h.window.ShiftlyJobs.openAdmin();await h.click('[data-action="plan-create"]');
  await h.submit({title:'Confirmed',clientName:'Client',lead:'LEAD'});assert.equal(client.calls.length,1);
  assert.match(h.document.querySelector('#jobsModal').textContent,/Saved, but refreshed state/);
  failReads=false;await h.click('[data-plan-refresh]');await h.submit({});assert.equal(client.calls.length,1);
});

test('unknown team, schedule and recovery outcomes never retry before authoritative refresh',async()=>{
  for(const method of ['assign','replaceLead','unassign','schedule','adminCloseSession']) {
    const client=method==='adminCloseSession'?executionTransport({status:'in_progress',otherSession:true}):planningTransport();let calls=0;
    const readRpc=client.rpc;client.rpc=async(name,args)=>{if(name==='jobs_lead_directory')return readRpc(name,args);calls++;return {error:{code:'NETWORK',message:'Lost reply'}};};
    const h=await reviewHarness('admin',client);
    if(method==='adminCloseSession') {
      await h.click('[data-action="execute-recover"]');h.document.querySelector('[name="confirmRecovery"]').checked=true;
      await h.submit({reason:'Device unavailable'});
    } else if(method==='schedule') {
      await h.click('[data-action="plan-schedule"]');await h.submit({startDate:'2026-09-10',startTime:'08:00'});
    } else {
      if(method==='assign')h.window.__jobsTest.detail().team=h.window.__jobsTest.detail().team.filter(e=>e.employeeId!=='MEMBER');
      await h.click('[data-action="plan-team"]');await h.submit({operation:method,employee:'MEMBER',lead:'LEAD'});
    }
    assert.equal(calls,1,method);assert.match(h.document.querySelector('#jobsModal').textContent,/Outcome could not be confirmed/);
    await h.submit({});await tick();assert.equal(calls,1,method);
    assert.equal(h.document.querySelector('#jobsModal button[type="submit"]').disabled,true);
    await h.click('[data-plan-refresh]');assert.equal(calls,1,method);
  }
});

test('create scheduling requires explicit choice and schedule rejects reversed end times',async()=>{
  const client=planningTransport(),h=await harness('admin','preview.invalid',liveCtx,client);await h.window.ShiftlyJobs.openAdmin();await h.click('[data-action="plan-create"]');
  h.document.querySelector('[name="scheduleIntent"]').checked=true;
  await h.submit({title:'Scheduled',clientName:'Client',lead:'LEAD',scheduled:'2026-09-12',scheduledTime:'09:30'});
  assert.equal(client.calls[0].args.p_schedule,true);assert.equal(client.calls[0].args.p_start,'2026-09-12T09:30:00+02:00');
  assert.equal(client.calls[0].args.p_data.site_id,null);
  await h.click('[data-action="plan-schedule"]');await h.submit({startDate:'2026-09-12',startTime:'10:00',endDate:'2026-09-12',endTime:'09:00'});
  assert.equal(client.calls.length,1);assert.match(h.document.querySelector('#jobsModal').textContent,/End must not precede/);
});

test('assigned active Supervisor starts, finishes and continues multi-day work without attendance',async()=>{
  const client=executionTransport(),h=await harness('admin','preview.invalid',{...liveCtx,role:'supervisor'},client);
  await h.window.ShiftlyJobs.openSupervisor();await h.click('[data-action="open"]');await h.click('[data-action="execute-start"]');await h.submit({});
  assert.deepEqual(Object.keys(client.model.calls[0].args).sort(),['p_company_id','p_job_id','p_revision']);assert.equal(client.model.calls[0].args.p_revision,1);
  assert.equal(h.window.__jobsTest.detail().sessions[0].id,'stored-session-1');assert.equal(h.window.__jobsTest.detail().revision,2);
  for(let day=1;day<=2;day++){
    await h.click('[data-action="execute-finish"]');await h.submit({work:'Day '+day+' work',notes:'Remaining tasks'});
    const job=h.window.__jobsTest.detail();assert.equal(job.status,'in_progress');assert.equal(job.workDays.length,day);assert.ok(job.sessions.every(s=>s.endedAt));
    assert.match(h.document.body.textContent,/Paused/);assert.ok(h.document.querySelector('[data-action="execute-start"]'));
    if(day===1){await h.click('[data-action="execute-start"]');await h.submit({});}
  }
  assert.deepEqual(client.model.calls.map(c=>c.name),['start_job_work','finish_work_for_today','start_job_work','finish_work_for_today']);
  assert.deepEqual(client.model.calls.map(c=>c.args.p_revision),[1,2,3,4]);
  assert.equal(client.model.calls[1].args.p_work,'Day 1 work');assert.equal(client.model.calls[1].args.p_notes,'Remaining tasks');
  assert.equal(h.window.__jobsTest.detail().sessions[0].endedAt,'2026-09-08T16:00:00Z');
});

test('unassigned, inactive, missing identity and closed states expose no execution controls',async()=>{
  for(const options of [{assigned:false},{active:false},{status:'draft'},{status:'submitted_for_review'},{status:'cancelled'}]){
    const client=executionTransport(options),h=await harness('admin','preview.invalid',{...liveCtx,role:'supervisor'},client);
    await h.window.ShiftlyJobs.openSupervisor();await h.window.__jobsTest.loadLiveDetail(liveRow.id);assert.equal(h.document.querySelector('[data-action="execute-start"]'),null);assert.equal(h.document.querySelector('[data-action="execute-finish"]'),null);assert.equal(client.model.calls.length,0);
  }
  const client=executionTransport(),h=await harness('admin','preview.invalid',{...liveCtx,role:'supervisor',employeeId:''},client);await h.window.ShiftlyJobs.openSupervisor();assert.equal(client.requests.length,0);
});

test('another technician session is not the Supervisor own session; conflict never closes or switches it',async()=>{
  const client=executionTransport({status:'in_progress',otherSession:true});client.rpc=async(name,args)=>{client.model.calls.push({name,args});return {error:{code:'23505',message:'Finish your open Job session first'}};};
  const h=await harness('admin','preview.invalid',{...liveCtx,role:'supervisor'},client);await h.window.ShiftlyJobs.openSupervisor();await h.click('[data-action="open"]');
  assert.equal(h.document.querySelector('[data-action="execute-finish"]'),null);assert.equal(h.document.querySelector('[data-action="execute-recover"]'),null);
  await h.click('[data-action="execute-start"]');await h.submit({});assert.match(h.document.querySelector('#jobsModal').textContent,/already have an open Job session/);
  assert.equal(client.model.calls.length,1);assert.equal(client.model.sessions[0].ended_at,null);await tick();assert.equal(client.model.calls.length,1);
});

test('manager emergency close requires reason and explicit confirmation, preserving start and audit',async()=>{
  for(const role of ['owner','admin']){
    const client=executionTransport({status:'in_progress',otherSession:true}),h=await harness('admin','preview.invalid',{...liveCtx,role},client);
    await h.window.ShiftlyJobs.openAdmin();await h.click('[data-action="open"]');assert.equal(h.document.querySelector('[data-action="execute-start"]'),null);
    await h.click('[data-action="execute-recover"]');await h.submit({reason:''});assert.equal(client.model.calls.length,0);
    await h.submit({reason:'Supervisor device unavailable'});assert.equal(client.model.calls.length,0);
    h.document.querySelector('[name="confirmRecovery"]').checked=true;await h.submit({});assert.equal(client.model.calls.length,1);
    const call=client.model.calls[0];assert.equal(call.name,'admin_close_job_session');assert.equal(call.args.p_session_id,'other-session');assert.equal(call.args.p_revision,1);assert.equal(call.args.p_reason,'Supervisor device unavailable');
    const job=h.window.__jobsTest.detail();assert.equal(job.sessions[0].startedAt,'2026-09-08T08:00:00Z');assert.equal(job.sessions[0].endedAt,'2026-09-08T17:00:00Z');assert.equal(job.activity[0].summary,'Supervisor device unavailable');
  }
});

test('duplicate Start blocked; company switch or entitlement loss discards late lifecycle result without closure',async()=>{
  for(const changed of [{...liveCtx,role:'supervisor',companyId:'company-b',version:2},{...liveCtx,role:'supervisor',jobsEnabled:false,version:2}]){
    const client=executionTransport();let resolve;client.rpc=(name,args)=>{client.model.calls.push({name,args});return new Promise(done=>resolve=done);};
    const h=await harness('admin','preview.invalid',{...liveCtx,role:'supervisor'},client);await h.window.ShiftlyJobs.openSupervisor();await h.click('[data-action="open"]');await h.click('[data-action="execute-start"]');await h.submit({});await h.submit({});assert.equal(client.model.calls.length,1);
    h.changeContext(changed);resolve({data:'backend-session'});await tick();assert.equal(h.window.__jobsTest.detail(),null);assert.equal(h.document.querySelector('#jobsShell').hidden,true);assert.equal(client.model.calls.length,1);
  }
});

test('Start/Finish unknown outcomes require refresh; persisted result is not blindly replayed',async()=>{
  for(const finish of [false,true]){
    const client=executionTransport(),normal=client.rpc;const h=await harness('admin','preview.invalid',{...liveCtx,role:'supervisor'},client);await h.window.ShiftlyJobs.openSupervisor();await h.click('[data-action="open"]');
    if(finish){await h.click('[data-action="execute-start"]');await h.submit({});}
    client.rpc=async(...args)=>{await normal(...args);return {error:{code:'NETWORK',message:'lost response'}};};
    await h.click(`[data-action="execute-${finish?'finish':'start'}"]`);await h.submit(finish?{work:'Persisted work',notes:'Safe notes'}:{});
    const count=client.model.calls.length;assert.match(h.document.querySelector('#jobsModal').textContent,/Outcome could not be confirmed/);await h.submit({});assert.equal(client.model.calls.length,count);
    await h.click('[data-plan-refresh]');await h.submit({});assert.equal(client.model.calls.length,count);
    assert.match(h.document.querySelector('#jobsModal').textContent,finish?/No own open session/:/Start is no longer available/);
  }
});

test('stale Finish refreshes revision and preserves work without replay',async()=>{
  const client=executionTransport(),h=await harness('admin','preview.invalid',{...liveCtx,role:'supervisor'},client);await h.window.ShiftlyJobs.openSupervisor();await h.click('[data-action="open"]');await h.click('[data-action="execute-start"]');await h.submit({});
  client.rpc=async(name,args)=>{client.model.calls.push({name,args});client.model.revision=7;return {error:{code:'40001',message:'Changed'}};};
  await h.click('[data-action="execute-finish"]');await h.submit({work:'Unsent work',notes:'Preserved'});
  assert.equal(client.model.calls.length,2);assert.equal(h.window.__jobsTest.detail().revision,7);assert.equal(h.document.querySelector('[name="work"]').value,'Unsent work');assert.match(h.document.querySelector('#jobsModal').textContent,/Job changed/);
});

function reviewClient(options={}) {
  const client=executionTransport({status:'in_progress',...options});
  client.model.days.push({id:'stored-work',work_date:'2026-09-08',work_performed:'Persisted completed work',created_at:'2026-09-08T16:00:00Z'});
  return client;
}

test('central mutation guard rejects closed Jobs, stale identity/revision and invalid lifecycle without RPC',async()=>{
  for(const role of ['admin','supervisor']) {
    const client=reviewClient(),h=await reviewHarness(role,client),api=h.window.__jobsTest,job=api.detail();
    for(const status of ['completed','cancelled']) {
      job.status=status;
      for(const method of ['assign','replaceLead','unassign','schedule','start','finish','adminCloseSession','submit','resubmit','returnCorrection','approve','cancel']) {
        await assert.rejects(api.planningMutation(method,[job.id,job.revision,'real-employee','reason'],job.id),/read-only/);
      }
    }
    job.status='scheduled';
    await assert.rejects(api.planningMutation('schedule',[job.id,job.revision-1],job.id),/Refresh/);
    await assert.rejects(api.planningMutation('schedule',['other-job',job.revision],job.id),/Refresh/);
    job.status='submitted_for_review';
    for(const method of ['assign','replaceLead','unassign','schedule','start','finish','adminCloseSession'])await assert.rejects(api.planningMutation(method,[job.id,job.revision,'real-employee','reason'],job.id));
    assert.equal(client.model.calls.length,0);
  }
});

test('expired auth during mutation clears protected state without retry or unknown-outcome form',async()=>{
  for(const error of [{code:'PGRST301'},{code:'SESSION_EXPIRED'},{status:401}]) {
    const client=reviewClient({status:'submitted_for_review'});let calls=0;
    const readRpc=client.rpc;client.rpc=async(name,args)=>{if(name==='jobs_lead_directory')return readRpc(name,args);calls++;return {error};};
    const h=await reviewHarness('admin',client);await confirmReview(h,'approve');
    assert.equal(calls,1);assert.equal(h.document.querySelector('#jobsShell').hidden,true);
    assert.equal(h.document.querySelector('#jobsModal').hidden,true);
    assert.equal(h.window.__jobsTest.detail(),null);assert.equal(h.window.__jobsTest.directories(),null);
  }
});

test('late mutation from a closed workspace cannot replace a reopened same-company view',async()=>{
  const client=reviewClient({status:'submitted_for_review'});let resolve;
  client.rpc=()=>new Promise(done=>resolve=done);
  const h=await reviewHarness('admin',client);await confirmReview(h,'approve');
  await h.window.__jobsTest.closeJobs();await h.window.ShiftlyJobs.openAdmin();
  resolve({data:2});await tick();
  assert.equal(h.window.__jobsTest.detail(),null);
  assert.equal(h.document.querySelector('#jobsWorkspaceTitle'),null);
  assert.equal(h.document.querySelector('#jobsModal').hidden,true);
});
async function reviewHarness(role,client) {
  const h=await harness('admin','preview.invalid',{...liveCtx,role},client);
  await h.window.ShiftlyJobs.openAdmin();await h.window.__jobsTest.loadLiveDetail(liveRow.id);
  if(['owner','admin'].includes(role))await h.click('[data-tab="review"]');return h;
}
test('Admin Overview is details-first; recovery and lifecycle retain separate tab homes',async()=>{
  const h=await reviewHarness('admin',reviewClient({otherSession:true}));
  await h.click('[data-tab="overview"]');
  assert.equal(h.document.querySelector('.jobsLifecycleStrip'),null);
  assert.equal(h.document.querySelector('[data-action="execute-recover"]'),null);
  await h.click('[data-tab="team-time"]');
  assert.ok(h.document.querySelector('[data-action="execute-recover"]'));
  assert.equal(h.document.querySelector('.jobsLifecycleStrip'),null);
  await h.click('[data-tab="review"]');
  assert.ok(!h.document.querySelector('.jobsLifecycleStrip'));
  assert.match(h.document.querySelector('.jobsReviewDecision').textContent,/Finish open work sessions/);
  assert.equal(h.document.querySelector('[data-action="execute-recover"]'),null);
});
async function confirmReview(h,method,values={}) {
  await h.click(`[data-action="review-${method}"]`);h.document.querySelector('[name="confirmLifecycle"]').checked=true;await h.submit(values);
}
test('Cancel Job lives in the collapsed menu after Job Card, not a lifecycle card',async()=>{
  const h=await reviewHarness('admin',reviewClient());
  const menu=h.document.querySelector('.jobsMoreActions');
  assert.ok(menu);
  assert.equal(menu.hasAttribute('open'),false);
  assert.equal(menu.previousElementSibling.dataset.tab,'card');
  assert.ok(menu.querySelector('[data-action="review-cancel"]'));
  assert.ok(!h.document.querySelector('.jobsLifecycleStrip'));
  assert.ok(!h.document.querySelector('.jobsReviewDecision [data-action="review-cancel"]'));
  menu.setAttribute('open','');
  const escape=new h.window.Event('keydown',{bubbles:true});escape.key='Escape';menu.dispatchEvent(escape);
  assert.equal(menu.hasAttribute('open'),false);
  assert.ok(h.document.querySelector('#jobsWorkspaceTitle'));
  await h.click('[data-action="review-cancel"]');
  assert.ok(h.document.querySelector('[name="confirmLifecycle"]'));
});

test('Daily work records show newest first in a two-record scroll region without changing history',async()=>{
  const h=await reviewHarness('admin',reviewClient());
  const job=h.window.__jobsTest.detail();
  const base=job.workDays[0];
  job.workDays=[{...base,date:'2026-09-08',work:'Oldest'},{...base,date:'2026-09-09',work:'Middle'},{...base,date:'2026-09-09',work:'Latest'}];
  await h.click('[data-tab="work"]');
  const list=h.document.querySelector('.jobsDayListScrollable');
  assert.ok(list);assert.equal(list.children.length,3);assert.equal(list.getAttribute('tabindex'),'0');
  assert.match(list.children[0].textContent,/Day 3.*Latest/s);
  assert.match(list.children[2].textContent,/Day 1.*Oldest/s);
  assert.equal(job.workDays[0].work,'Oldest');
  await h.click('[data-tab="review"]');assert.ok(!h.document.querySelector('.jobsDayListScrollable'));
  job.workDays=job.workDays.slice(0,2);await h.click('[data-tab="work"]');assert.ok(!h.document.querySelector('.jobsDayListScrollable'));
});

test('Admin Review contains only the approved Activity History disclosure',async()=>{
  const h=await reviewHarness('admin',reviewClient());
  const history=Array.from(h.document.querySelectorAll('.jobsWorkspaceCard summary')).filter(el=>el.textContent.includes('Activity history'));
  assert.equal(history.length,1);
  assert.ok(history[0].closest('.jobsReviewDecision'));
  assert.equal(h.document.querySelector('.jobsLifecycleStrip details'),null);
});

test('Lead submission, manager correction, continued work, resubmission and completion preserve history',async()=>{
  const client=reviewClient();let h=await reviewHarness('supervisor',client);
  await confirmReview(h,'submit');assert.equal(client.model.calls[0].name,'submit_job_for_review');assert.equal(client.model.calls[0].args.p_revision,1);
  assert.equal(h.window.__jobsTest.detail().status,'submitted_for_review');assert.equal(h.document.querySelector('[data-action="execute-start"]'),null);
  h=await reviewHarness('admin',client);assert.match(h.document.querySelector('#jobsTabPanel').textContent,/Persisted completed work/);
  await confirmReview(h,'returnCorrection',{reason:'Check final work'});assert.equal(client.model.calls[1].args.p_revision,2);
  h=await reviewHarness('supervisor',client);assert.match(h.document.body.textContent,/Check final work/);const id=h.window.__jobsTest.detail().id;
  await h.click('[data-action="execute-start"]');await h.submit({});await h.click('[data-action="execute-finish"]');await h.submit({work:'Correction work',notes:'Checked'});
  await confirmReview(h,'resubmit');assert.equal(client.model.calls.at(-1).name,'resubmit_job_for_review');assert.equal(h.window.__jobsTest.detail().id,id);
  assert.ok(h.window.__jobsTest.detail().activity.some(a=>a.type==='returned_for_correction'));assert.ok(h.window.__jobsTest.detail().activity.some(a=>a.type==='resubmitted'));
  h=await reviewHarness('owner',client);const revision=h.window.__jobsTest.detail().revision;await confirmReview(h,'approve');
  assert.equal(client.model.calls.at(-1).name,'approve_job_complete');assert.equal(client.model.calls.at(-1).args.p_revision,revision);assert.equal('p_outcome' in client.model.calls.at(-1).args,false);
  assert.equal(h.window.__jobsTest.detail().status,'completed');await h.click('[data-tab="card"]');
  const card=h.document.querySelector('.jobsJobCardPaper');assert.match(card.textContent,/Frozen Company/);assert.match(card.textContent,/Frozen Lead/);assert.match(card.textContent,/Frozen historical note/);
  assert.equal(h.document.querySelector('.jobsWorkspaceCard [data-action^="review-"]'),null);assert.equal(h.document.querySelector('.jobsWorkspaceCard [data-action^="execute-"]'),null);assert.equal(h.document.querySelector('.jobsWorkspaceCard [data-action^="plan-"]'),null);
});

test('only assigned active Lead may submit/resubmit; all known open sessions are blockers',async()=>{
  for(const options of [{lead:false},{assigned:false},{active:false},{otherSession:true}]){
    const client=reviewClient(options),h=await reviewHarness('supervisor',client);assert.equal(h.document.querySelector('[data-action="review-submit"]'),null);
    if(options.otherSession)assert.match(h.document.body.textContent,/Other technician.*started/);
    assert.equal(client.model.calls.length,0);
  }
  const client=reviewClient();client.model.sessions.push({id:'own',employee_id:liveCtx.employeeId,employee_name:'Stored Supervisor',started_at:'2026-09-08T08:00:00Z',ended_at:null});
  const h=await reviewHarness('supervisor',client);assert.equal(h.document.querySelector('[data-action="review-submit"]'),null);assert.equal(client.model.calls.length,0);
  for(const role of ['admin','owner']){const h=await reviewHarness(role,reviewClient());assert.equal(h.document.querySelector('[data-action="review-submit"]'),null);}
});

test('correction, approval and cancellation require confirmation and required reasons',async()=>{
  for(const method of ['returnCorrection','approve','cancel']){
    const client=reviewClient({status:'submitted_for_review'}),h=await reviewHarness('admin',client);await h.click(`[data-action="review-${method}"]`);
    await h.submit({});assert.equal(client.model.calls.length,0);
    h.document.querySelector('[name="confirmLifecycle"]').checked=true;await h.submit({});
    if(method!=='approve'){assert.equal(client.model.calls.length,0);await h.submit({reason:'Deliberate reason'});}
    assert.equal(client.model.calls.length,1);
  }
  const h=await reviewHarness('supervisor',reviewClient({status:'submitted_for_review'}));
  for(const method of ['returnCorrection','approve','cancel'])assert.equal(h.document.querySelector(`[data-action="review-${method}"]`),null);
});

test('cancel preserves Job and work history; open sessions cannot be cancelled or auto-closed',async()=>{
  const client=reviewClient(),h=await reviewHarness('admin',client);await confirmReview(h,'cancel',{reason:'Client cancelled'});
  assert.equal(client.model.calls.length,1);assert.equal(client.model.calls[0].name,'cancel_job');const job=h.window.__jobsTest.detail();assert.equal(job.id,liveRow.id);assert.equal(job.status,'cancelled');assert.equal(job.workDays.length,1);assert.equal(job.team.length,1);assert.equal(job.activity.at(-1).type,'cancelled');
  await h.click('[data-tab="review"]');assert.match(h.document.body.textContent,/Client cancelled/);assert.equal(h.document.querySelector('.jobsWorkspaceCard [data-action^="review-"]'),null);
  const blocked=reviewClient({otherSession:true}),b=await reviewHarness('admin',blocked);assert.equal(b.document.querySelector('[data-action="review-cancel"]'),null);assert.equal(blocked.model.calls.length,0);
});

test('unknown lifecycle outcomes refresh without replay; already-completed/cancelled becomes read-only',async()=>{
  for(const method of ['submit','resubmit','returnCorrection','approve','cancel']){
    const client=reviewClient({status:['returnCorrection','approve'].includes(method)?'submitted_for_review':'in_progress'});
    if(method==='resubmit')client.model.job.corrected_at='2026-09-08T09:00:00Z';
    const normal=client.rpc;client.rpc=async(...args)=>{await normal(...args);return {error:{code:'NETWORK',message:'Lost reply'}};};
    const h=await reviewHarness(['submit','resubmit'].includes(method)?'supervisor':'admin',client);
    await confirmReview(h,method,['returnCorrection','cancel'].includes(method)?{reason:'Reason'}:{});
    assert.equal(client.model.calls.length,1);assert.match(h.document.querySelector('#jobsModal').textContent,/Outcome could not be confirmed/);
    await h.submit({});assert.equal(client.model.calls.length,1);await h.click('[data-plan-refresh]');
    if(['approve','cancel'].includes(method)){assert.equal(h.document.querySelector('#jobsModal').hidden,true);assert.equal(h.document.querySelector('.jobsWorkspaceCard [data-action^="review-"]'),null);}
    else {await h.submit({});assert.equal(client.model.calls.length,1);}
    assert.equal(client.model.calls.length,1);
  }
});

test('stale review refresh preserves reason, access loss clears, and late approval never crosses company',async()=>{
  for(const code of ['40001','42501']){
    const client=reviewClient({status:'submitted_for_review'});client.rpc=async(name,args)=>{client.model.calls.push({name,args});client.model.revision=9;return {error:{code,message:'Changed'}};};
    const h=await reviewHarness('admin',client);await confirmReview(h,'returnCorrection',{reason:'Safe reason'});assert.equal(client.model.calls.length,1);
    if(code==='40001'){assert.equal(h.document.querySelector('[name="reason"]').value,'Safe reason');assert.equal(h.window.__jobsTest.detail().revision,9);}
    else {assert.equal(h.document.querySelector('#jobsShell').hidden,true);assert.equal(h.window.__jobsTest.detail(),null);}
  }
  for(const changed of [{...liveCtx,companyId:'other',version:2},{...liveCtx,jobsEnabled:false,version:2}]){
    let resolve;const client=reviewClient({status:'submitted_for_review'});client.rpc=(name,args)=>{client.model.calls.push({name,args});return new Promise(done=>resolve=done);};
    const h=await reviewHarness('admin',client);await confirmReview(h,'approve');h.changeContext(changed);resolve({data:9});await tick();assert.equal(h.window.__jobsTest.detail(),null);assert.equal(h.document.querySelector('#jobsShell').hidden,true);assert.equal(client.model.calls.length,1);
  }
});

test('resubmission remains Lead-only and session-blocked; cancellation race refresh never closes sessions',async()=>{
  for(const options of [{lead:false},{otherSession:true}]){
    const client=reviewClient({status:'correction_required',...options});client.model.job.corrected_at='2026-09-08T08:00:00Z';
    const h=await reviewHarness('supervisor',client);assert.equal(h.document.querySelector('[data-action="review-resubmit"]'),null);assert.equal(client.model.calls.length,0);
  }
  const client=reviewClient();client.rpc=async(name,args)=>{client.model.calls.push({name,args});client.model.sessions.push({id:'late-session',employee_id:'OTHER',employee_name:'Late technician',started_at:'2026-09-09T08:00:00Z',ended_at:null});return {error:{code:'P0001',message:'Open work sessions must be closed first'}};};
  const h=await reviewHarness('admin',client);await confirmReview(h,'cancel',{reason:'Cancel reason'});assert.match(h.document.querySelector('#jobsModal').textContent,/Late technician/);assert.equal(client.model.calls.length,1);assert.equal(client.model.calls[0].name,'cancel_job');assert.equal(client.model.sessions[0].ended_at,null);
});
