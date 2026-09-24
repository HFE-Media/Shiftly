// Deliberate isolated UI acceptance runner. Never reads public/config.js or .env.
// PostgreSQL executes the real migration/RPCs. This small loopback gateway emulates
// Supabase Auth/PostgREST for synthetic users only; it is NOT a deployment target.
const fs=require('node:fs');
const harness=fs.readFileSync('tests/payroll-phase123-release-gate.cjs','utf8');
const prefix=harness.slice(0,harness.indexOf("  const manager=await role('authenticated',owner);")).replace('const port=54396','const port=54397');
const body=`
  await admin.query("alter table companies add plan text default 'premium',add billing_enabled boolean default false,add jobs_enabled boolean default false;alter table company_users add billing_access boolean default false;");
  await admin.query('update companies set name=$2 where id=$1',[cExisting,'Isolated Payroll Acceptance']);
  const setupManager=await role('authenticated',owner);
  try {
    await setupManager.query("update company_payroll_rules set payroll_history_enabled=true,calculate_sdl=false,sdl_effective_from=null where company_id=$1",[cExisting]);
    const august=await calculate(setupManager,cExisting,'2026-08-01','2026-08-31');
    await finalise(cExisting,august);
  } finally { await setupManager.end(); }
  const user=async(id=owner)=>role('authenticated',id);
  await require('./payroll-browser-gateway.cjs')({admin,connect,user,call,owner,employee:outsider,c:cExisting});
}
main().catch(e=>{console.error(e.message,e.where||'');process.exitCode=1;}).finally(async()=>{
 await Promise.all(clients.map(c=>c.end().catch(()=>{})));
 if(started) nativeRun('pg_ctl',['-D',dataDir,'-m','fast','-w','stop']);
});`;
// Resolve relative imports exactly as the original repository-root harness does.
const {createRequire}=require('node:module');
new Function('require',prefix+body)(createRequire(require('node:path').resolve('tests/payroll-db-local.cjs')));
