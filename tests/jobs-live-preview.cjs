// Local visual QA of the REAL adapter/rendering path. No app/config, auth,
// Supabase SDK, service worker or writable transport. Never serve in production.
const http=require('node:http');
const fs=require('node:fs');
const path=require('node:path');
const {parseHTML}=require('linkedom');
const publicDir=path.resolve(__dirname,'../public');
function fixtureBoot() {
  const role=new URLSearchParams(location.search).get('role')==='supervisor'?'supervisor':'admin';
  const context={userId:'preview-user',companyId:'preview-company',role,employeeId:'PREVIEW-LEAD',jobsEnabled:true,version:1,company:{name:'Demo Service Company'}};
  window.ShiftlyJobsContext={get:()=>context};
  window.currentCompany=()=>context.company;
  for(const id of ['btnCompanyAdminPortfolio','btnCompanyAdminEmployeeDashboard','btnBackToPortfolio','btnOpenEmployeeDashboard'])document.getElementById(id).hidden=false;
  document.getElementById('btnOpenBilling').hidden=!new URLSearchParams(location.search).has('billing');
  const statuses=['in_progress','correction_required','scheduled','submitted_for_review','completed'];
  const titles=['Conveyor isolator replacement','Multi-day roof investigation','Irrigation pump control inspection','Cold-room door heater repair','Workshop electrical inspection'];
  const jobs=new URLSearchParams(location.search).has('empty')?[]:statuses.map((status,i)=>({id:'preview-'+i,company_id:context.companyId,job_number:'JC-2026-00'+(49-i),title:titles[i],client_name:'Demo Client '+(i+1),site_name:'Demo Site',service_address:'Demo service address',description:'Inspect the equipment and record the work completed.',company_name:context.company.name,lifecycle_status:status,priority:'normal',revision:1,created_at:'2026-09-01T08:00:00Z',updated_at:'2026-09-09T08:00:00Z',scheduled_start_at:'2026-09-09T08:00:00+02:00'}));
  const tables={jobs,job_assignments:jobs.map(job=>({id:'a-'+job.id,job_id:job.id,company_id:context.companyId,employee_id:context.employeeId,employee_name:'Demo Supervisor',assignment_role:'lead'})),job_time_entries:jobs.slice(0,1).map(job=>({id:'session-1',job_id:job.id,company_id:context.companyId,employee_id:context.employeeId,employee_name:'Demo Supervisor',started_at:'2026-09-09T08:00:00Z',ended_at:null})),sites:[{site_id:'DEMO-SITE',company_id:context.companyId,name:'Demo Site',active:true}],employees:[{employee_id:context.employeeId,company_id:context.companyId,full_name:'Demo Supervisor',active:true},{employee_id:'PREVIEW-MEMBER',company_id:context.companyId,full_name:'Demo Team Member',active:true}],company_users:[{user_id:'preview-user',company_id:context.companyId,employee_id:context.employeeId,active:true,role:'supervisor'}]};
  window.sb={rpc:async()=>{throw new Error('Preview only: all writes are blocked.');},from(name){let filters=[],start=0,end=249,single=false;const q={select(){return q;},eq(k,v){filters.push([k,v]);return q;},order(){return q;},range(a,b){start=a;end=b;return q;},single(){single=true;return q;},then(resolve){const rows=(tables[name]||[]).filter(row=>filters.every(([k,v])=>row[k]===v)).slice(start,end+1);return Promise.resolve({data:single?rows[0]:rows,error:null}).then(resolve);}};return q;}};
  document.addEventListener('DOMContentLoaded',()=>setTimeout(async()=>{
    await window.ShiftlyJobs[role==='supervisor'?'openSupervisor':'openAdmin']();
    if(new URLSearchParams(location.search).has('form'))document.querySelector('[data-action="plan-create"]')?.click();
  },0));
}
const login=fs.readFileSync(path.join(publicDir,'login.html'),'utf8');
const styles=login.match(/<style[\s\S]*?<\/style>/g).join('\n');
const host=parseHTML(login).document;
const navigation=`<main id="companyAdminShell" hidden>${host.querySelector('#companyAdminShell .platformActions').outerHTML}</main><main id="appShell" hidden>${host.querySelector('#appShell .headerActions').outerHTML}</main>`;
http.createServer((req,res)=>{
  const url=new URL(req.url,'http://127.0.0.1');
  res.setHeader('Cache-Control','no-store');
  if(url.pathname==='/'){
    res.setHeader('Content-Type','text/html; charset=utf-8');
    const width=Number(url.searchParams.get('width'));
    if([320,375,430,768,1024,1280,1440,1920].includes(width)){
      url.searchParams.delete('width');
      res.end(`<!doctype html><html><body style="margin:0;background:#222"><iframe title="Responsive Jobs preview" src="/${url.search}" style="border:0;width:${width}px;height:100vh"></iframe><output id="metrics" style="position:fixed;right:12px;top:12px;color:white;background:#222"></output><script>setInterval(()=>{const d=document.querySelector('iframe').contentDocument;if(!d?.querySelector('.jobsApp'))return;const width=d.documentElement.clientWidth;const overflow=[...d.querySelectorAll('.jobsApp,.jobsModalCard,.jobsModalBody')].some(e=>e.clientWidth&&e.scrollWidth>e.clientWidth+1);document.querySelector('#metrics').textContent=JSON.stringify({viewport:width,overflow:overflow||d.documentElement.scrollWidth>width});},100);</script></body></html>`);return;
    }
    res.end(`<!doctype html><html><head><meta name="viewport" content="width=device-width, initial-scale=1"><title>Jobs live-path preview — no production connection</title>${styles}<link rel="stylesheet" href="/jobs.css"><link rel="stylesheet" href="https://unpkg.com/@phosphor-icons/web@2.1.1/src/regular/style.css"></head><body>${navigation}<script>${fixtureBoot.toString()};fixtureBoot();</script><script src="/jobs-data.js"></script><script src="/jobs.js"></script></body></html>`);return;
  }
  if(!['/jobs.css','/jobs.js','/jobs-data.js'].includes(url.pathname)){res.writeHead(404);res.end();return;}
  res.setHeader('Content-Type',url.pathname.endsWith('.css')?'text/css':'text/javascript');
  res.end(fs.readFileSync(path.join(publicDir,url.pathname.slice(1))));
}).listen(5201,'127.0.0.1',()=>console.log('Read-only live-path preview: http://127.0.0.1:5201/ (add ?role=supervisor or ?empty)'));
