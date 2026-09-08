// No app.js, network, Supabase, real credentials or persistent browser state.
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const {parseHTML}=require('linkedom');
const crypto=require('node:crypto');
const tick=()=>new Promise(resolve=>setImmediate(resolve));
async function harness(role='admin',host='localhost') {
  const {window}=parseHTML('<html><body><div id="authScreen"></div><button id="btnOpenJobsAdmin"></button><button id="btnOpenJobsSupervisor"></button></body></html>');
  const timers=[];
  const context={window,document:window.document,location:new URL(`http://${host}/login?jobsDemo=${role}&jobsQa=1`),
    URL,URLSearchParams,crypto,Intl,Date,console,MutationObserver:window.MutationObserver,
    localStorage:{getItem:()=>null,setItem:()=>assert.fail('QA must not persist')},
    setTimeout:fn=>{timers.push(fn);return timers.length;},clearTimeout:()=>{},setInterval:()=>0,clearInterval:()=>{},
    requestAnimationFrame:fn=>fn(),getComputedStyle:()=>({}),
    FormData:class {constructor(form){this.form=form;}get(name){return this.form.querySelector(`[name="${name}"]`)?.value ?? null;}getAll(name){return [...this.form.querySelectorAll(`[name="${name}"]`)].filter(el=>el.type!=='checkbox'||el.checked).map(el=>el.value);}}
  };
  window.location=context.location;window.scrollTo=()=>{};
  context.history={replaceState:(_,__,url)=>{window.location=context.location=new URL(url);}};
  vm.createContext(context);
  vm.runInContext(fs.readFileSync('public/jobs-data.js','utf8'),context);
  vm.runInContext(fs.readFileSync('public/jobs.js','utf8'),context);
  if(role!=='employee'&&host==='localhost') await (role==='supervisor'?window.ShiftlyJobs.openSupervisor():window.ShiftlyJobs.openAdmin());
  const click=async selector=>{const el=window.document.querySelector(selector);assert.ok(el,`Missing ${selector}`);el.dispatchEvent(new window.Event('click',{bubbles:true}));await tick();};
  const submit=async values=>{const form=window.document.querySelector('#jobsModal form');assert.ok(form,'modal form');for(const [name,value] of Object.entries(values)){const el=form.querySelector(`[name="${name}"]`);assert.ok(el,name);el.value=value;}form.dispatchEvent(new window.Event('submit',{bubbles:true,cancelable:true}));await tick();};
  return {window,document:window.document,click,submit};
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
