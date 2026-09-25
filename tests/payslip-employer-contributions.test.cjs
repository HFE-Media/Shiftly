const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const app = fs.readFileSync('public/app.js', 'utf8');
const authority = fs.readFileSync('src/payroll-authority.js', 'utf8');
const historyUi = fs.readFileSync('public/payroll-history-ui.js', 'utf8');
const source = app.slice(
  app.indexOf('function payslipEmployerContributionModel('),
  app.indexOf('function buildPayslipPage(')
);
const context = {
  escapeHtml: value => String(value),
  payslipAmount: value => Number(value) > 0.004 ? Number(value).toFixed(2) : '-'
};
vm.createContext(context);
vm.runInContext(source, context);

const row = overrides => ({
  gross: 20000,
  employer_uif: 177.12,
  sdl_amount: 200,
  deductions: [{ description: 'UIF', amount: 177.12, active: true }],
  net: 19822.88,
  ...overrides
});
const rules = overrides => ({ calculate_uif: true, calculate_sdl: true, ...overrides });

test('UIF and SDL use authoritative row values and add only to company cost', () => {
  const input = row();
  const before = JSON.stringify(input);
  const model = context.payslipEmployerContributionModel(input, rules(), input.gross);
  assert.deepEqual(Array.from(model.contributions, item => [item.key, item.cents]), [
    ['employer_uif', 17712], ['sdl', 20000]
  ]);
  assert.equal(model.total, 377.12);
  assert.equal(model.companyCost, 20377.12);
  assert.equal(JSON.stringify(input), before, 'employer display totals do not mutate deductions or net pay');
  const html = context.payslipEmployerContributionSection(input, rules(), input.gross);
  assert.match(html, /UIF – Employer Contribution/);
  assert.match(html, />SDL</);
  assert.match(html, /Total Employer Contributions/);
  assert.match(html, /Total Company Cost/);
});

test('UIF-only, SDL-only and neither follow the approved visibility rules', () => {
  const uifOnly = context.payslipEmployerContributionSection(row({ sdl_amount: 0 }), rules(), 20000);
  assert.match(uifOnly, /UIF – Employer Contribution/);
  assert.doesNotMatch(uifOnly, />SDL</);
  assert.match(uifOnly, /R 177\.12[\s\S]*R 20177\.12/);

  const sdlOnly = context.payslipEmployerContributionSection(row({ employer_uif: 0 }), rules(), 20000);
  assert.doesNotMatch(sdlOnly, /UIF – Employer Contribution/);
  assert.match(sdlOnly, />SDL</);
  assert.match(sdlOnly, /R 200\.00[\s\S]*R 20200\.00/);

  assert.equal(context.payslipEmployerContributionSection(row({ employer_uif: 0, sdl_amount: 0 }), rules(), 20000), '');
  assert.equal(context.payslipEmployerContributionSection(row(), rules({ calculate_uif: false, calculate_sdl: false }), 20000), '');
});

test('employer UIF is read explicitly and never inferred from the employee UIF deduction', () => {
  const input = row({ employer_uif: 88.5 });
  const model = context.payslipEmployerContributionModel(input, rules({ calculate_sdl: false }), input.gross);
  assert.equal(model.contributions[0].cents, 8850);
  assert.equal(input.deductions[0].amount, 177.12);
  assert.match(authority, /row\.employer_uif=\(contribution\/100\)\.toFixed\(2\)/);
  assert.doesNotMatch(source, /employee_uif|description\)\s*===?\s*['"]uif/i);
});

test('finalised reprints keep frozen employer UIF, SDL and rules', () => {
  assert.match(app, /const rules = row\._payrollRules \|\| activePayrollRules\(\);/);
  assert.match(app, /payslipEmployerContributionSection\(row, rules, totalEarnings\)/);
  assert.match(historyUi, /data\.periods\.map\(p => \(\{ \.\.\.p\.document_row, _payrollRules: data\.run\.rules_snapshot \}\)\)/);
  const frozen = context.payslipEmployerContributionSection(
    row({ employer_uif: 120, sdl_amount: 190 }),
    rules(),
    20000
  );
  assert.match(frozen, /R 120\.00/);
  assert.match(frozen, /R 190\.00/);
  assert.match(frozen, /R 20310\.00/);
});

test('browser monetary fields cannot enter preview or finalisation authority requests', () => {
  assert.match(authority, /\['action','c','start','end','levyWeeks'\]/);
  assert.match(authority, /\['action','c','request','token'\]/);
  assert.match(authority, /monetary values are not accepted/);
  assert.match(historyUi, /payrollAuthority\(\{ action:'finalise',c:draft\.run\.companyId,request:pending\.request,token:pending\.token \}\)/);
  assert.doesNotMatch(historyUi, /action:'finalise'[^\n]+(?:employer_uif|sdl_amount|companyCost)/);
});
