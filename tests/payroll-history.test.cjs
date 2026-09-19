const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { execFileSync } = require('node:child_process');
const ph = require('../public/payroll-history.js');
const source = fs.readFileSync('public/app.js','utf8');
const sharedSource = fs.readFileSync('public/payroll-engine.js','utf8');
const baseline = execFileSync('git',['show','1a9830b542e68211e453b5ace7e48d3ce6a35361:public/app.js'],{encoding:'utf8',maxBuffer:2e6});
function fn(src,name) {
  if(src===source && sharedSource.includes('function '+name+'(')) src=sharedSource;
  const start=src.search(new RegExp('(?:async )?function '+name+'\\('));
  assert(start>=0,name);
  const end=src.indexOf('\n}',start);
  return src.slice(start,end+2);
}
function calculator(src) {
  const ctx={moneyNumber:x=>Number(x||0),Math}; vm.createContext(ctx);
  for(const name of ['SA_PAYE_2027','SA_RETIREMENT_FUND_ANNUAL_LIMIT']) {
    const start=src.indexOf('const '+name+' ='); const end=src.indexOf(';',start);
    vm.runInContext(src.slice(start,end+1),ctx);
  }
  for(const name of ['calculateAnnualTax2027','calculateCumulativePaye','periodCountForPayCycle']) vm.runInContext(fn(src,name),ctx);
  return ctx;
}
test('strict dates, March rollover and cross-year finalisation guard',()=>{
  assert.equal(ph.taxYear('2027-02-28'),'2026-03-01');
  assert.equal(ph.taxYear('2027-03-01'),'2027-03-01');
  assert.throws(()=>ph.taxYear('2026-02-30'),/Invalid/);
  assert.throws(()=>ph.finalisationRange('2027-02-28','2027-03-01'),/two tax years/);
  assert.equal(ph.finalisationRange('2026-09-10','2026-09-25'),'2026-03-01');
});
test('currency rejects malformed, negative, non-finite and excessive precision values',()=>{
  for(const v of ['-1','1.234','Infinity','NaN','10junk','1e5','','1,500']) assert.throws(()=>ph.decimal(v));
  assert.equal(ph.decimal('00125.5'),'125.50');
  assert.equal(ph.decimal('0'),'0.00');
});
for(const paye of [true,false]) for(const uif of [true,false]) test(`independent snapshots PAYE=${paye} UIF=${uif}`,()=>{
  const row={employee_id:'E1',gross:12000,deductions:[{description:'Tax',amount:1300,active:true},{description:'UIF',amount:120,active:true},{description:'Tax',amount:99,active:false}]};
  const r=ph.employeeSnapshot(row,{calculate_paye:paye,calculate_uif:uif});
  assert.equal(r.paye_deducted,paye?'1300.00':'0.00'); assert.equal(r.employee_uif,uif?'120.00':'0.00');
  r.document_row.employee_id='OTHER'; assert.equal(row.employee_id,'E1');
});
test('snapshot preserves existing rendering precision without changing gross/levy calculations',()=>{
  const row={employee_id:'E',gross:1234.567,deductions:[{description:'UIF',amount:12.34567,active:true}]};
  const p=ph.employeeSnapshot(row,{calculate_uif:true});
  assert.equal(p.gross_remuneration,'1234.57'); assert.equal(p.employee_uif,'12.35');
  assert.deepEqual(p.document_row,row);
});
test('empty YTD context has zero values without fabricating opening or completed periods',()=>{
  const c=ph.context(null,true,'2026-03-01');
  assert.equal(c.previousPaye,0); assert.equal(c.previousUif,0); assert.equal(c.hasOpening,false);
  assert.equal(c.completedPeriods+c.finalizedPeriods,0);
});
test('local preparation guard refuses every remote backend, even on localhost',()=>{
  assert.equal(ph.localBackend({PAYROLL_HISTORY_LOCAL:true,SUPABASE_URL:'https://example.supabase.co'},{hostname:'127.0.0.1'}),false);
  assert.equal(ph.localBackend({PAYROLL_HISTORY_LOCAL:true,SUPABASE_URL:'http://127.0.0.1:54321'},{hostname:'127.0.0.1'}),true);
  assert.equal(ph.localBackend({SUPABASE_URL:'http://127.0.0.1:54321'},{hostname:'127.0.0.1'}),false);
});

test('payroll activation accepts only isolated local or configured same-project HTTPS authority',()=>{
  const configContext={window:{}};
  vm.runInNewContext(fs.readFileSync('public/config.js','utf8'),configContext);
  const production=configContext.window.SHIFTLY_CONFIG;
  const page=new URL('https://shiftlyapp.co.za/login?PAYROLL_AUTHORITY_URL=https://untrusted.example');
  assert.equal(ph.authorityEndpoint(production,page),production.SUPABASE_URL+'/functions/v1/payroll-authority');
  const local={PAYROLL_HISTORY_LOCAL:true,SUPABASE_URL:'http://127.0.0.1:54321'};
  const localPage=new URL('http://127.0.0.1:5198/login');
  assert.equal(ph.authorityEndpoint(local,localPage),'http://127.0.0.1:5198/payroll-authority');
  assert.equal(ph.authorityEndpoint({...local,PAYROLL_AUTHORITY_URL:'http://localhost:54321/functions/v1/payroll-authority'},localPage),'http://localhost:54321/functions/v1/payroll-authority');
  for(const endpoint of ['https://untrusted.example/payroll-authority','https://other.supabase.co/functions/v1/payroll-authority',production.PAYROLL_AUTHORITY_URL+'?override=1','/payroll-authority','http://127.0.0.1:5198/payroll-authority'])
    assert.throws(()=>ph.authorityEndpoint({...production,PAYROLL_AUTHORITY_URL:endpoint},page),/Invalid payroll configuration/);
  assert.throws(()=>ph.authorityEndpoint(production,localPage),/Invalid payroll configuration/);
  assert.throws(()=>ph.authorityEndpoint({...local,SUPABASE_URL:production.SUPABASE_URL},localPage),/Invalid payroll configuration/);
  assert.throws(()=>ph.authorityEndpoint({...local,PAYROLL_AUTHORITY_URL:production.PAYROLL_AUTHORITY_URL},localPage),/Invalid payroll configuration/);
  assert.throws(()=>ph.authorityEndpoint({...production,PAYROLL_HISTORY_LOCAL:true},page),/Invalid payroll configuration/);
  assert.equal(ph.authorityEndpoint({},page),null);
});

test('production history RPCs and finalisation share the trusted resolver and reject invalid config before requests',async()=>{
  const calls=[];
  const config={PAYROLL_HISTORY_ENABLED:true,SUPABASE_URL:'https://isolated.supabase.co',PAYROLL_AUTHORITY_URL:'https://isolated.supabase.co/functions/v1/payroll-authority'};
  const c={window:{ShiftlyPayrollHistory:ph,location:new URL('https://isolated.example/login')},APP_CONFIG:config,
    sb:{rpc:async(name)=>{calls.push(name);return {data:{}};},auth:{getSession:async()=>({data:{session:{access_token:'fixture-only'}}})}},
    fetch:async(url,options)=>{calls.push({url,options});return {ok:true,json:async()=>({id:'fixture'})};}};
  vm.createContext(c);
  const bridge=fs.readFileSync('public/payroll-history-ui.js','utf8');
  vm.runInContext(bridge.slice(0,bridge.indexOf('function payrollHistoryReset()')),c);
  assert.equal(c.payrollHistoryEnabled(),true);
  for(const rpc of ['get_payroll_history','get_own_payroll_snapshot','get_employee_payroll_ytd','save_employee_with_ytd']) await c.payrollHistoryRpc(rpc,{});
  await c.payrollAuthority({action:'finalise'});
  assert.equal(calls[4].url,config.PAYROLL_AUTHORITY_URL);
  assert.equal(calls[4].options.redirect,'error');
  config.PAYROLL_AUTHORITY_URL='https://untrusted.example';
  assert.throws(()=>c.payrollHistoryEnabled(),/Invalid payroll configuration/);
  await assert.rejects(c.payrollHistoryRpc('get_payroll_history',{}),/Invalid payroll configuration/);
  await assert.rejects(c.payrollAuthority({action:'finalise'}),/Invalid payroll configuration/);
  assert.equal(calls.length,5,'invalid configuration makes no requests or fallback writes');
});
test('TR old-v-new representative cumulative cases: unchanged inputs yield identical financial results',()=>{
  const old=calculator(baseline), now=calculator(source);
  let cases=0;
  for(const completed of [0,5,6,10,11]) for(const gross of [0,8500,23000,55000]) for(const retirement of [0,1340.84,1676.05]) {
    const oldContext={taxYearStart:'2026-03-01',completedPeriods:completed,finalizedPeriods:0,previousGross:completed*23000,previousRetirement:completed*1340.84,previousPaye:completed*2500};
    const newContext=ph.context({has_opening:true,completed_periods:completed,finalized_periods:0,gross:oldContext.previousGross,retirement:oldContext.previousRetirement,paye:oldContext.previousPaye},true,'2026-03-01');
    assert.equal(JSON.stringify(now.calculateCumulativePaye(gross,retirement,12,newContext)),JSON.stringify(old.calculateCumulativePaye(gross,retirement,12,oldContext)));
    cases++;
  }
  assert.equal(cases,60);
  for(const name of ['buildTrElectricalPayrollBreakdown','trElectricalAutomaticLevyDeductions','calculateCumulativePaye','statutoryDeductionRows'])
    assert.equal(fn(source,name),fn(baseline,name),name+' must remain byte-for-byte unchanged');
});
test('document generation no longer calls or defines any authoritative financial save',()=>{
  assert(!source.includes('savePayrollPeriodTotals'));
  for(const name of ['generateSelectedPayslip','generatePayrollSummary','generateEmployeeDashboardPayslip']) {
    const code=fn(source,name); assert(!/\.upsert\(|\.insert\(|finalise_payroll|savePayrollPeriod/.test(code));
  }
  assert(!fn(source,'runPayrollReport').includes('savePayrollLevyPeriod'));
  assert(!source.includes('Finalise & Generate Payslip'));
});
test('approved header position, branded confirmation and no draft watermark',()=>{
  const html=fs.readFileSync('public/login.html','utf8');
  assert(html.indexOf('id="btnFinalisePayroll"')<html.indexOf('id="btnExportPayroll"'));
  assert(!html.slice(html.indexOf('id="payslipModal"'),html.indexOf('</main>',html.indexOf('id="payslipModal"'))).includes('btnFinalisePayroll'));
  assert(html.includes('id="payrollFinaliseModal"')); assert(html.includes('aria-label="Finalise Payroll"'));
  assert(!fn(source,'buildPayslipDocument').includes('DRAFT'));
});
test('new model skips speculative calendars while retaining existing TR monthly check',()=>{
  const c={moneyNumber:x=>Number(x||0),payrollEmployeeYtdContext:(context,id)=>context.byEmployee.get(id)};
  vm.createContext(c); for(const name of ['expectedMonthlyPeriodsBefore','validatePayrollYtdContinuity']) vm.runInContext(fn(source,name),c);
  const context={enabled:true,standardHistory:{},preserveTrContinuity:false,taxYearStart:'2026-03-01',byEmployee:new Map([['E',{hasOpening:true,completedPeriods:5,finalizedPeriods:0}]])};
  const rows=[{employee_id:'E',rate:100,pay_cycle:'monthly'}];
  c.validatePayrollYtdContinuity(rows,context,'2026-10-01');
  context.preserveTrContinuity=true;
  assert.throws(()=>c.validatePayrollYtdContinuity(rows,context,'2026-10-01'),/expected 7 completed periods, found 5/);
  rows[0].pay_cycle='fortnightly'; c.validatePayrollYtdContinuity(rows,context,'2026-10-01');
});
test('UI draft, finalisation and read-only reprint contract',async()=>{
  const {parseHTML}=require('linkedom');
  const {document}=parseHTML(fs.readFileSync('public/login.html','utf8'));
  const company={id:'fixture',name:'Fixture',logo_url:''}; const rules={calculate_paye:true,calculate_uif:true};
  const rows=[{employee_id:'E',gross:100,deductions:[]}]; const calls=[];
  const c={document,window:{ShiftlyPayrollHistory:ph,location:{hostname:'127.0.0.1',href:'http://127.0.0.1:5198/login'},addEventListener(){}},APP_CONFIG:{PAYROLL_HISTORY_LOCAL:true,SUPABASE_URL:'http://127.0.0.1:54321'},
    $:id=>document.getElementById(id),currentUser:{id:'actor'},canUseCompanyDashboard:()=>true,currentCompany:()=>company,jobsContextVersion:1,
    activePayrollRules:()=>rules,isTrElectricalCompany:()=>false,normalisePayrollRules:r=>r,crypto:require('node:crypto').webcrypto,payrollRows:rows,payrollSummaryRun:null,payrollSummaryRunVersion:1,
    renderPayrollRows:r=>{c.payrollRows=r;},currentPayrollSummaryRun:()=>c.payrollSummaryRun,
    el:{payrollStartDate:{value:'2026-09-01'},payrollEndDate:{value:'2026-09-15'}},
    sb:{rpc:async(name,args)=>{calls.push({name,args}); if(name==='get_payroll_history') return {data:{revision:'R'}}; return {data:'ID'};}}};
  c.payrollSummaryRun={companyId:company.id,contextVersion:1,start:'2026-09-01',end:'2026-09-15',rows};
  vm.createContext(c);vm.runInContext(fs.readFileSync('public/payroll-history-ui.js','utf8'),c);
  c.payrollAuthority=async()=>({token:'server-confirmation',rows,rules,company,revision:'R'});
  await c.payrollHistoryLoadFinal(company,'2026-09-01','2026-09-15',1);
  await c.openPayrollFinalisation();
  assert.equal(calls.filter(c=>c.name==='finalise_payroll').length,0,'opening modal is not confirmation');
  c.payrollSummaryRun=null;
  await c.confirmPayrollFinalisation();
  assert.equal(calls.filter(c=>c.name==='finalise_payroll').length,0,'stale selection cannot finalise');
  c.payrollSummaryRun=vm.runInContext('payrollHistory.draft.run',c);
  let attempts=0;
  c.payrollAuthority=async(args)=>{
    calls.push({name:'authority',args});
    if(++attempts===1) throw Error('Lost response');
    return {id:'ID'};
  };
  c.sb.rpc=async(name,args)=>{
    calls.push({name,args});
    if(name==='get_payroll_history') return {data:{run:{id:'ID',employee_count:1,company_snapshot:company,rules_snapshot:rules},periods:[{document_row:rows[0]}]}};
    return {data:'ID'};
  };
  await c.confirmPayrollFinalisation();
  await c.confirmPayrollFinalisation();
  const writes=calls.filter(call=>call.name==='authority');
  assert.equal(writes.length,2); assert.equal(writes[0].args.request,writes[1].args.request);
  assert.equal(writes[0].args.token,writes[1].args.token);
  assert.equal(writes[0].args.payload,undefined,'no browser monetary payload');
  assert.equal(c.payrollSummaryRun.finalisedId,'ID');
  assert.equal(document.getElementById('payrollFinalStatus').textContent,'Finalised');
  assert.equal(c.payrollSummaryRun.rows[0]._payrollRules.calculate_paye,true);
});
