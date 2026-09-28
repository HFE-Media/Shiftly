const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const Authority=require('../src/payroll-authority.js');
const migration=fs.readFileSync('supabase/migrations/20260923170000_authoritative_sdl.sql','utf8');

const definition=(key,category,treatment='included_remuneration',status='metadata_only')=>({
  id:`class-${key}`,item_key:key,display_name:key,item_type:key.includes('contribution')?'deduction':'adjustment',
  statutory_category:category,sdl_treatment:treatment,calculation_status:status,classification_version:'za-2027-r14'
});
const fixed=[
  definition('ordinary_remuneration','ordinary_remuneration'),definition('overtime','overtime'),
  definition('annual_bonus','annual_payment_bonus'),definition('paid_leave_taken','paid_leave_taken')
];
function input(overrides={}){
  return {company:{id:'10000000-0000-0000-0000-000000000001',name:'Synthetic'},
    rules:{calculate_paye:false,calculate_uif:false,calculate_sdl:true},
    employees:[{employee_id:'E1',full_name:'Employee One',active:true,rate:10000,pay_type:'monthly',pay_cycle:'monthly'}],
    deductionTypes:[],events:[],deductions:[],adjustments:[],levy:null,classifications:fixed,
    sdl:{configuration:{id:'config-1',enabled:true,effective_from:'2026-03-01',effective_to:null},
      rate:{id:'rate-1',rate:0.01,rate_version:'za-sdl-1pct-2027',effective_from:'2026-03-01',effective_to:'2027-03-01'},employee_circumstances:[]},
    history:{revision:'fixture',employees:[{employee_id:'E1'}]},...overrides};
}
const selection={start:'2026-09-01',end:'2026-09-30',levyWeeks:null};
function assertFinalisationParity(row){
  const allowable=(row.document_row.deductions||[]).filter(item=>item.payroll_item_classification?.calculation_status==='payroll_active'&&item.payroll_item_classification?.sdl_treatment==='allowable_deduction').reduce((sum,item)=>sum+Number(item.amount||0),0);
  const expected=Math.max(0,Number(row.document_row.gross||0)-allowable).toFixed(2);
  assert.equal(row.sdl_leviable_remuneration,expected);
  assert.equal(row.sdl_amount,(Number(expected)*0.01).toFixed(2));
}

test('authoritative SDL is 1% of leviable remuneration and does not reduce employee net',()=>{
  const result=Authority.calculate(input(),selection).rows[0];
  assert.equal(result.sdl_leviable_remuneration,'10000.00');
  assert.equal(result.sdl_amount,'100.00');
  assert.equal(result.document_row.net,10000);
  assert.equal(result.document_row.deductions.some(x=>String(x.description).toLowerCase()==='sdl'),false);
});

test('SDL remains off by default and reports visibility is still PAYE/UIF-only',()=>{
  const data=input(); data.rules.calculate_sdl=false; data.sdl.configuration=null;
  const result=Authority.calculate(data,selection).rows[0];
  assert.equal(result.sdl_amount,'0.00');
  assert.match(fs.readFileSync('public/payroll-engine.js','utf8'),/calculate_sdl: false/);
  const reports=require('../public/payroll-reports.js');
  assert.equal(reports.reportsApplicable({calculate_paye:false,calculate_uif:false,calculate_sdl:true}),false);
});

test('activated retirement contribution reduces PAYE/SDL base and remains an employee deduction',()=>{
  const retirement=definition('provident_fund_contribution','employee_provident_fund_contribution','allowable_deduction','payroll_active');
  const data=input({classifications:[...fixed,retirement],deductions:[{employee_id:'E1',description:'Provident Fund Contribution',amount:500,active:true,
    payroll_item_definition_id:'definition-provident',payroll_item_classification_id:retirement.id}]});
  const result=Authority.calculate(data,selection).rows[0];
  assert.equal(result.retirement_fund_contributions,'500.00');
  assert.equal(result.sdl_leviable_remuneration,'9500.00');
  assert.equal(result.sdl_amount,'95.00');
  assert.equal(result.document_row.net,9500);
});

test('section 18(3) learner remuneration is excluded only with effective evidence',()=>{
  const data=input();
  data.sdl.employee_circumstances=[{id:'learner-1',employee_id:'E1',circumstance:'section_18_3_learner',effective_from:'2026-03-01',effective_to:null,evidence_reference:'Contract L-42'}];
  const result=Authority.calculate(data,selection).rows[0];
  assert.equal(result.sdl_leviable_remuneration,'0.00');
  assert.equal(result.sdl_amount,'0.00');
  data.sdl.employee_circumstances[0].evidence_reference='';
  assert.throws(()=>Authority.calculate(data,selection),/learner evidence/i);
});

test('unresolved allowance and mid-period circumstance changes fail closed',()=>{
  const allowance=input({adjustments:[{employee_id:'E1',adjustment_type:'allowance',description:'Allowance',amount:100,active:true}]});
  assert.throws(()=>Authority.calculate(allowance,selection),/Generic Allowance/);
  const split=input();
  split.sdl.employee_circumstances=[{id:'standard-1',employee_id:'E1',circumstance:'standard',effective_from:'2026-03-01',effective_to:'2026-09-15'}];
  assert.throws(()=>Authority.calculate(split,selection),/change inside this payroll period/i);
});

test('a later non-participating hire does not create an SDL boundary for an earlier period',()=>{
  const data=input({employees:[
    {employee_id:'E1',full_name:'Employee One',active:true,rate:10000,pay_type:'monthly',pay_cycle:'monthly',employment_date:'2026-03-01'},
    {employee_id:'E2',full_name:'Later Hire',active:true,rate:100,pay_type:'hourly',pay_cycle:'monthly',employment_date:'2026-09-28'}
  ],history:{revision:'fixture',employees:[{employee_id:'E1'},{employee_id:'E2'}]}});
  data.sdl.employee_circumstances=[{id:'later-standard',employee_id:'E2',circumstance:'standard',effective_from:'2026-09-28',effective_to:null}];
  const result=Authority.calculate(data,selection);
  const later=result.rows.find(row=>row.employee_id==='E2');
  assert.equal(later.document_row.gross,0,'pre-employment public holiday must not generate remuneration');
  assert.equal(later.sdl_circumstance.source,'not_applicable');
  assertFinalisationParity(later);
});

test('an applicable employee still enforces the SDL boundary and accepts its exact effective date',()=>{
  const crossing=input();
  crossing.employees[0].employment_date='2026-03-01';
  crossing.sdl.employee_circumstances=[{id:'changed-standard',employee_id:'E1',circumstance:'standard',effective_from:'2026-09-28',effective_to:null}];
  assert.throws(()=>Authority.calculate(crossing,selection),/change inside this payroll period/i);
  const laterParticipant=input({employees:[{employee_id:'E1',full_name:'Employee One',active:true,rate:100,pay_type:'hourly',pay_cycle:'monthly',employment_date:'2026-09-28'}],
    events:[{employee_id:'E1',action:'IN',result:'OK',created_at:'2026-09-28T07:00:00+02:00'},{employee_id:'E1',action:'OUT',result:'OK',created_at:'2026-09-28T16:00:00+02:00'}]});
  laterParticipant.sdl.employee_circumstances=structuredClone(crossing.sdl.employee_circumstances);
  assert.throws(()=>Authority.calculate(laterParticipant,selection),/change inside this payroll period/i);
  const boundary={start:'2026-09-28',end:'2026-09-30',levyWeeks:null};
  const result=Authority.calculate(crossing,boundary).rows[0];
  assert.equal(result.sdl_circumstance.id,'changed-standard');
  assertFinalisationParity(result);
});

test('employees starting after the period receive no monthly, daily or hourly remuneration',()=>{
  for(const payType of ['monthly','daily','hourly']){
    const data=input({employees:[{employee_id:'E1',full_name:'Future Employee',active:true,rate:10000,pay_type:payType,pay_cycle:'monthly',employment_date:'2026-10-01'}]});
    assert.equal(Authority.calculate(data,selection).rows.length,0,payType);
  }
});

test('inside-period employment excludes earlier work and holiday pay without inventing salary proration',()=>{
  const events=[
    {employee_id:'E1',action:'IN',result:'OK',created_at:'2026-09-25T07:00:00+02:00'},
    {employee_id:'E1',action:'OUT',result:'OK',created_at:'2026-09-25T15:00:00+02:00'},
    {employee_id:'E1',action:'IN',result:'OK',created_at:'2026-09-28T07:00:00+02:00'},
    {employee_id:'E1',action:'OUT',result:'OK',created_at:'2026-09-28T15:00:00+02:00'}
  ];
  for(const [payType,rate,gross] of [['hourly',100,800],['daily',100,100]]){
    const data=input({employees:[{employee_id:'E1',full_name:'Later Hire',active:true,rate,pay_type:payType,pay_cycle:'monthly',employment_date:'2026-09-28'}],events});
    data.sdl.employee_circumstances=[];
    const row=Authority.calculate(data,selection).rows[0];
    assert.equal(row.document_row.gross,gross,payType);
    assert.equal(row.document_row.breakdown.holidayTopupHours,0,payType);
    assertFinalisationParity(row);
  }
  const monthly=input({employees:[{employee_id:'E1',full_name:'Later Hire',active:true,rate:10000,pay_type:'monthly',pay_cycle:'monthly',employment_date:'2026-09-28'}]});
  monthly.sdl.employee_circumstances=[];
  const row=Authority.calculate(monthly,selection).rows[0];
  assert.equal(row.document_row.gross,10000,'existing monthly non-proration semantics are preserved');
  assertFinalisationParity(row);
});

test('later-hire paid leave, adjustment and deduction participation retain the SDL split guard',()=>{
  const later=(overrides={})=>{
    const data=input({employees:[{employee_id:'E1',full_name:'Later Hire',active:true,rate:100,pay_type:'hourly',pay_cycle:'monthly',employment_date:'2026-09-28'}],...overrides});
    data.sdl.employee_circumstances=[{id:'later-standard',employee_id:'E1',circumstance:'standard',effective_from:'2026-09-28',effective_to:null}];
    return data;
  };
  assert.throws(()=>Authority.calculate(later({adjustments:[{employee_id:'E1',adjustment_type:'paid_leave',description:'Paid Leave',hours:8,amount:800,active:true}]}),selection),/change inside this payroll period/i);
  assert.throws(()=>Authority.calculate(later({adjustments:[{employee_id:'E1',adjustment_type:'bonus',description:'Bonus',amount:500,active:true}]}),selection),/change inside this payroll period/i);
  assert.throws(()=>Authority.calculate(later({deductions:[{employee_id:'E1',description:'Loan',amount:100,active:true}]}),selection),/change inside this payroll period/i);
});

test('net-only Tools/PPE, Fine and Loan do not reduce SDL base',()=>{
  const categories=['tools_ppe','fine','loan'].map(key=>definition(key,'ordinary_business_deduction','not_applicable_net_deduction','metadata_only'));
  const data=input({classifications:[...fixed,...categories],deductionTypes:categories.map((item,index)=>({id:`type-${index}`,payroll_item_classification_id:item.id})),
    deductions:categories.map((item,index)=>({employee_id:'E1',deduction_type_id:`type-${index}`,description:item.display_name,amount:100,active:true}))});
  const result=Authority.calculate(data,selection).rows[0];
  assert.equal(result.sdl_leviable_remuneration,'10000.00');
  assert.equal(result.sdl_amount,'100.00');
  assert.equal(result.document_row.net,9700);
});

test('context-dependent non-zero payroll items and missing rate fail closed',()=>{
  const travel=definition('travel_allowance','travel_allowance','requires_context','metadata_only');
  const data=input({classifications:[...fixed,travel],adjustments:[{employee_id:'E1',description:'Travel Allowance',amount:500,active:true,payroll_item_definition_id:'travel',payroll_item_classification_id:travel.id}]});
  assert.throws(()=>Authority.calculate(data,selection),/not yet activated|additional statutory/i);
  const missing=input(); missing.sdl.rate=null;
  assert.throws(()=>Authority.calculate(missing,selection),/authoritative SDL rate/i);
});

test('preview/finalisation accepts no browser SDL money and recomputes from authoritative inputs',()=>{
  const source=fs.readFileSync('src/payroll-authority.js','utf8');
  assert.match(source,/monetary values are not accepted/);
  assert.match(source,/allowed=body\.action==='preview'\?\['action','c','start','end','levyWeeks'\]/);
  assert.doesNotMatch(source,/allowed=[^;]+sdl_(?:amount|leviable_remuneration|rate)/);
  assert.match(source,/const payload=calculate\(input,confirmed\)/);
});

test('SDL YTD is append-only, cutoff-scoped and excludes legacy voids',()=>{
  assert.match(migration,/value_type='sdl'/);
  assert.match(migration,/applies_after<cutoff/);
  assert.match(migration,/tax_year_start=y/);
  assert.match(migration,/payroll_legacy_period_voids/);
  assert.match(migration,/'ytd_adjustment','sdl'/);
  assert.doesNotMatch(migration,/update public\.employee_payroll_period_totals|delete from public\.employee_payroll_period_totals/i);
});

test('finalisation freezes effective configuration, circumstance, classifications, base, amount and rate',()=>{
  for(const field of ['sdl_enabled','sdl_leviable_remuneration','sdl_amount','sdl_rate','sdl_rate_version','sdl_configuration_id','sdl_circumstance','sdl_classifications']) assert.match(migration,new RegExp(`add column ${field}`));
  assert.match(migration,/payroll_validate_sdl_run/);
  assert.match(migration,/payroll_validate_sdl_period/);
  assert.match(migration,/SDL calculation snapshot changed/);
});

test('monthly, YTD and EMP201 consume authoritative SDL without report-side calculation',()=>{
  const reports=require('../public/payroll-reports.js');
  const bundle={run:{id:'r',period_start:'2026-09-01',period_end:'2026-09-30',tax_year_start:'2026-03-01',company:{name:'C'}},
    monthly:[{employee_id:'E1',gross:10000,paye:500,uif_combined:200,sdl:100}],ytd:[{employee_id:'E1',gross:50000,paye:2500,uif_combined:1000,sdl:500}],sdl_supported:true};
  assert.equal(reports.model(bundle,'monthly').totals.sdl,100);
  assert.equal(reports.model(bundle,'emp201').liability,800);
  assert.equal(reports.model(bundle,'ytd').totals.sdl,500);
  assert.doesNotMatch(fs.readFileSync('public/payroll-reports.js','utf8'),/\*\s*0\.01|0\.01\s*\*/);
  assert.doesNotMatch(reports.documentHtml(bundle,'monthly'),/not currently calculated/);
  assert.match(reports.documentHtml(bundle,'emp201'),/not proof of submission to SARS/);
});

test('SDL controls and employee take-on fields use the existing payroll UI',()=>{
  const html=fs.readFileSync('public/login.html','utf8');
  const app=fs.readFileSync('public/app.js','utf8');
  assert.ok(html.indexOf('ruleCalculateUif')<html.indexOf('ruleCalculatePaye')&&html.indexOf('ruleCalculatePaye')<html.indexOf('ruleCalculateSdl'));
  assert.match(html,/\.statutoryToggleGrid\{[\s\S]*?grid-template-columns:repeat\(3,minmax\(0,1fr\)\)/);
  assert.match(html,/@media\s*\(max-width:860px\)[\s\S]*?\.statutoryToggleGrid \.sdlStatutoryToggle\{grid-column:1 \/ -1;\}/);
  assert.match(html,/id="ruleSdlEffectiveConfig"[^>]+hidden/);
  assert.doesNotMatch(html,/id="payrollTotalSdlCard"/);
  assert.match(html,/id="deductionSdlBase"[^>]*>[\s\S]*?SDL Leviable/);
  assert.match(html,/id="deductionSdlAmount"[^>]*>[\s\S]*?Employer SDL/);
  assert.match(html,/id="employeeYtdSdl"/);
  assert.match(html,/id="employeeSdlTreatmentSummary">Standard employee/);
  assert.match(html,/id="employeeSdlConfiguration"[^>]+hidden/);
  assert.match(html,/id="employeeSdlEffectiveRow" hidden/);
  assert.match(html,/id="employeeSdlEvidenceRow" hidden/);
  assert.match(html,/id="companyEmployeeSdlCircumstance"/);
  assert.match(html,/section_18_3_learner/);
  assert.doesNotMatch(app,/payrollTotalSdl(?:Card)?/);
  assert.match(app,/el\.ruleSdlEffectiveError\.textContent = "Choose an effective date before saving\."/);
});

test('migration preserves historical rows while adding frozen SDL, YTD events, versioned rate and report output',()=>{
  assert.match(migration,/rate numeric\(7,6\).*rate=0\.010000/);
  assert.match(migration,/sdl_leviable_remuneration/);
  assert.match(migration,/value_type in \('paye','uif','gross','retirement','sdl'\)/);
  assert.match(migration,/'sdl'.*sum\(sdl_amount\)/s);
  assert.match(migration,/'sdl',case when p\.sdl_enabled then p\.sdl_amount else 0 end/);
  assert.doesNotMatch(migration,/update public\.employee_payroll_period_totals|delete from public\.employee_payroll_period_totals/i);
});
