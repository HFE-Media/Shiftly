const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const reports = require('../public/payroll-reports.js');

const html = fs.readFileSync('public/login.html','utf8');
const ui = fs.readFileSync('public/payroll-history-ui.js','utf8');
const gateway = fs.readFileSync('tests/payroll-browser-gateway.cjs','utf8');
const local = fs.readFileSync('tests/payroll-browser-local.cjs','utf8');
const sql = fs.readFileSync('supabase/migrations/20260923100000_payroll_reports.sql','utf8').replace(/--[^\n]*/g,'');
const company = {id:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',name:'Snapshot Company'};
const bundle = {
  run:{id:'run-sep',period_start:'2026-08-26',period_end:'2026-09-25',tax_year_start:'2026-03-01',company,rules:{calculate_paye:true,calculate_uif:true}},
  monthly:[
    {employee_id:'E1',employee_name:'Frozen Name',id_number:'9001015009087',gross:15000,paye:1250,uif_combined:300,sdl:0,paye_applicable:true,uif_applicable:true},
    {employee_id:'E2',employee_name:'Historical Name',id_number:'9101015009088',gross:10000,paye:0,uif_combined:0,sdl:0,paye_applicable:false,uif_applicable:false}
  ],
  ytd:[{employee_id:'E1',employee_name:'Frozen Name',id_number:'9001015009087',gross:90000,paye:7200,uif_combined:1800,sdl:0}],
  sdl_supported:false,eti_supported:false
};

test('Reports sits between Finalise and the existing far-right PDF action', () => {
  const finalise=html.indexOf('id="btnFinalisePayroll"');
  const report=html.indexOf('id="btnPayrollReports"');
  const pdf=html.indexOf('id="btnExportPayroll"');
  assert.ok(finalise<report&&report<pdf);
  assert.match(html,/btnPayrollReports[^>]+title="Payroll Reports"/);
  assert.match(html,/ph ph-file-text/);
  assert.match(html,/id="btnPayrollReports" class="miniIconBtn payrollHeaderAction"/);
  assert.match(html,/\.payrollHeaderAction:not\(:disabled\):hover/);
});

test('payroll presentation polish preserves responsive hierarchy and natural mobile card flow', () => {
  assert.match(html,/payrollSubtitleDesktop[^>]*>Hours and wage estimate from approved clock events\./);
  assert.match(html,/payrollSubtitleMobile[^>]*>Payroll overview</);
  assert.match(html,/@media \(max-width:860px\)\{[\s\S]*?\.payrollSubtitleDesktop\{display:none;\}[\s\S]*?\.payrollSubtitleMobile\{display:inline;\}/);
  assert.match(html,/payrollReportsEmptyTitle[^>]*>No payroll reports available\./);
  assert.match(html,/payrollReportsEmptyCopy[^>]*>Reports become available after a payroll period is finalised\./);
  assert.match(html,/\.deductionStatSdlBase\{grid-column:2;\}/);
  assert.match(html,/\.deductionStatSdlAmount\{grid-column:3;\}/);
  assert.match(html,/@media \(max-width:860px\)[\s\S]*?\.deductionStatSdlBase,\.deductionStatSdlAmount\{grid-column:auto;\}/);
});

test('visibility follows the existing company PAYE/UIF applicability only', () => {
  assert.equal(reports.reportsApplicable({calculate_paye:true,calculate_uif:true}),true);
  assert.equal(reports.reportsApplicable({calculate_paye:true,calculate_uif:false}),true);
  assert.equal(reports.reportsApplicable({calculate_paye:false,calculate_uif:true}),true);
  assert.equal(reports.reportsApplicable({calculate_paye:false,calculate_uif:false}),false);
  assert.match(ui,/reportsApplicable\(rules\)/);
});

test('periods are newest first, latest is defaulted and report month uses period end', () => {
  const periods=reports.normalisePeriods([
    {id:'aug',period_start:'2026-07-26',period_end:'2026-08-25',finalised_at:'2026-08-25T10:00:00Z'},
    {id:'sep',period_start:'2026-08-26',period_end:'2026-09-25',finalised_at:'2026-09-25T10:00:00Z'}
  ]);
  assert.deepEqual(periods.map(p=>p.id),['sep','aug']);
  assert.equal(periods[0].label,'September 2026');
  assert.equal(periods[0].range,'26 August 2026 – 25 September 2026');
  assert.match(ui,/periods\[0\]\.id/);
  assert.match(html,/Reports become available after a payroll period is finalised/);
});

test('only the three approved report types are exposed', () => {
  assert.deepEqual(reports.TYPES.map(item=>item.label),[
    'Monthly Payroll Tax Report','Year-to-Date (YTD) Payroll Report','EMP201 Summary'
  ]);
});

test('isolated 5197 fixture exposes report periods and one genuine finalised report period', () => {
  assert.match(gateway,/get_payroll_report_periods:\['c'\]/);
  assert.match(local,/calculate_sdl=false,sdl_effective_from=null/);
  assert.match(local,/calculate\(setupManager,cExisting,'2026-08-01','2026-08-31'\)/);
  assert.match(local,/finalise\(cExisting,august\)/);
});

test('monthly and EMP201 share the same authoritative totals without doubling combined UIF', () => {
  const monthly=reports.model(bundle,'monthly');
  const emp201=reports.model(bundle,'emp201');
  assert.deepEqual(monthly.totals,{gross:25000,paye:1250,uif_combined:300,sdl:0});
  assert.deepEqual(emp201.totals,monthly.totals);
  assert.equal(emp201.liability,1550);
  const doc=reports.documentHtml(bundle,'emp201',new Date('2026-09-26T00:00:00Z'));
  assert.match(doc,/EMP201 summary only/);
  assert.match(doc,/not proof of submission to SARS/);
  assert.doesNotMatch(doc,/ETI|EMP501|IRP5/);
  assert.match(doc,/class="liabilities"/);
  assert.match(doc,/\.liabilities\{width:320px;max-width:100%/);
  assert.match(doc,/grid-template-columns:minmax\(0,1fr\) auto/);
});

test('monthly and YTD totals use the same seven fixed report columns as headers and rows', () => {
  for (const type of ['monthly','ytd']) {
    const doc=reports.documentHtml(bundle,type);
    assert.match(doc,/<table><colgroup>(?:<col style="width:\d+%">){7}<\/colgroup>/);
    assert.match(doc,/table\{width:100%;table-layout:fixed/);
    const total=doc.match(/<tr class="total">([\s\S]*?)<\/tr>/)?.[1]||'';
    assert.equal((total.match(/<td/g)||[]).length,7);
    assert.doesNotMatch(total,/colspan/);
  }
});

test('YTD uses the server-provided selected-cutoff position and frozen identities', () => {
  const ytd=reports.model(bundle,'ytd');
  assert.equal(ytd.taxYear,2027);
  assert.deepEqual(ytd.totals,{gross:90000,paye:7200,uif_combined:1800,sdl:0});
  const changedCurrentEmployee={employee_name:'Changed Current Name',rate:999999,calculate_paye:false};
  assert.equal(changedCurrentEmployee.employee_name==='Frozen Name',false);
  assert.match(reports.documentHtml(bundle,'ytd'),/Frozen Name/);
  assert.doesNotMatch(reports.documentHtml(bundle,'ytd'),/Changed Current Name|999,999/);
});

test('server RPCs use finalised runs, immutable snapshots and the existing cutoff YTD reader', () => {
  assert.equal((sql.match(/perform public\.payroll_require_manager\(c\)/g)||[]).length,2);
  assert.match(sql,/from public\.payroll_runs r\s+where r\.company_id=c and r\.status='finalised'/);
  assert.match(sql,/Finalised payroll snapshot is incomplete/);
  assert.match(sql,/where p\.company_id=c and p\.run_id=selected\.id/);
  assert.match(sql,/p\.document_row->>'employee_name'/);
  assert.match(sql,/case when p\.paye_enabled then p\.paye_deducted else 0 end/);
  assert.match(sql,/case when p\.uif_enabled then p\.employee_uif\+p\.employer_uif else 0 end/);
  assert.doesNotMatch(sql,/employee_uif\s*\*\s*2[^]*employer_uif/i);
  assert.match(sql,/cutoff:=selected\.period_end\+1/);
  assert.match(sql,/public\.payroll_ytd_value\(c,i\.employee_id,selected\.tax_year_start,cutoff\)/);
  assert.match(sql,/a\.applies_after<cutoff/);
  assert.match(sql,/Historical employee snapshot unavailable for YTD report/);
  assert.doesNotMatch(sql,/from public\.employees/);
});

test('unsupported SDL is disclosed as zero and ETI is not invented', () => {
  assert.match(sql,/'sdl',0/);
  assert.match(sql,/'sdl_supported',false/);
  assert.match(sql,/'eti_supported',false/);
  const doc=reports.documentHtml(bundle,'monthly');
  assert.match(doc,/SDL is not currently calculated by Shiftly and is shown as R0\.00/);
  assert.doesNotMatch(doc,/ETI/);
});
