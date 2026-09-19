const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const ph=require('../public/payroll-history.js');
function fixture(){
  const {document,window}=require('linkedom').parseHTML(fs.readFileSync('public/login.html','utf8'));
  const rules={calculate_paye:true,calculate_uif:true},calls=[];
  const data={paye:'3381.00',uif:'177.12',paye_supplied:true,uif_supplied:true,revision:'unchanged'};
  const c={document,window:Object.assign(window,{ShiftlyPayrollHistory:ph}),$:id=>document.getElementById(id),APP_CONFIG:{PAYROLL_HISTORY_LOCAL:true,SUPABASE_URL:'http://127.0.0.1:5198'},
    activePayrollRules:()=>rules,currentCompany:()=>({id:'synthetic'}),jobsContextVersion:1,editingEmployeeId:'E1',localDateInputValue:()=> '2026-09-18',crypto:require('node:crypto').webcrypto,
    sb:{rpc:async(name,args)=>{calls.push({name,args});return {data};}}};
  window.location={hostname:'127.0.0.1',href:'http://127.0.0.1:5198/login'};
  vm.createContext(c);vm.runInContext(fs.readFileSync('public/payroll-history-ui.js','utf8'),c);
  return {c,rules,calls,data,document};
}
test('Rand display round-trips without precision loss; rejects malformed grouping',()=>{
  const {c}=fixture();
  for(const value of ['0.00','177.12','3381.00','999999999999.99'])assert.equal(c.payrollYtdInputDecimal(c.payrollYtdDisplay(value)),value);
  assert.equal(c.payrollYtdDisplay('0'),'R 0.00');
  for(const value of ['R 3,38.00','1,23','R 1.234','1e3','','R NaN'])assert.throws(()=>c.payrollYtdInputDecimal(value));
});
test('employee YTD loads, all four conditional states, formatted save and optional reason',async()=>{
  const {c,rules,calls,document}=fixture();const el=id=>document.getElementById(id);
  for(const [paye,uif] of [[true,true],[true,false],[false,true],[false,false]]){
    rules.calculate_paye=paye;rules.calculate_uif=uif;await c.payrollHistoryEmployeeForm(true);
    assert.equal(el('employeeYtdFields').hidden,!(paye||uif));
    assert.equal(el('employeeYtdPayeLabel').hidden,!paye);assert.equal(el('employeeYtdUifLabel').hidden,!uif);
  }
  rules.calculate_paye=rules.calculate_uif=true;await c.payrollHistoryEmployeeForm(true);
  assert.equal(el('employeeYtdYear').textContent,'2026/27');assert.equal(el('employeeYtdPaye').value,'R 3,381.00');
  assert.equal((await c.payrollHistorySaveEmployee({company_id:'synthetic',employee_id:'E1'},true)).error,null);
  assert.deepEqual(JSON.parse(JSON.stringify(calls.at(-1).args.targets)),{reason:''});
  el('employeeYtdPaye').value='R 3,400.50';el('employeeYtdUif').value='180.25';el('employeeYtdReason').value='Accountant adjustment';
  assert.equal((await c.payrollHistorySaveEmployee({company_id:'synthetic',employee_id:'E1'},true)).error,null);
  assert.deepEqual(JSON.parse(JSON.stringify(calls.at(-1).args.targets)),{reason:'Accountant adjustment',paye:'3400.50',uif:'180.25',as_at:'2026-09-18'});
  assert.equal(calls.at(-1).name,'save_employee_with_ytd');assert.equal(calls.at(-1).args.expected_revision,'unchanged');
});

test('explicit YTD date reloads cutoff ledger, preserves typed accountant values, and is saved',async()=>{
  const {c,calls,document}=fixture();const el=id=>document.getElementById(id);
  await c.payrollHistoryEmployeeForm(true);
  el('employeeYtdPaye').value='12500';el('employeeYtdUif').value='1600';
  await c.payrollHistoryEmployeeForm(true,'2026-08-31');
  assert.equal(calls.at(-1).name,'get_employee_payroll_ytd_at');
  assert.equal(calls.at(-1).args.as_at,'2026-08-31');
  assert.equal(el('employeeYtdPaye').value,'12500');
  assert.equal((await c.payrollHistorySaveEmployee({company_id:'synthetic',employee_id:'E1'},true)).error,null);
  assert.deepEqual(JSON.parse(JSON.stringify(calls.at(-1).args.targets)),{reason:'',paye:'12500.00',uif:'1600.00',as_at:'2026-08-31'});
  const count=calls.length;
  await c.payrollHistoryEmployeeForm(true,'2026-02-28');
  assert.equal(calls.length,count,'wrong tax year never reaches RPC');
  assert.match(el('employeeYtdMessage').textContent,/tax year/);
  assert((await c.payrollHistorySaveEmployee({company_id:'synthetic',employee_id:'E1'},true)).error);
});
