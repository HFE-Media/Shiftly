const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const app = fs.readFileSync('public/app.js', 'utf8');
const phase1 = fs.readFileSync('supabase/migrations/20260923130000_dynamic_payroll_items.sql', 'utf8');
const sql = fs.readFileSync('supabase/migrations/20260923150000_payroll_item_classifications.sql', 'utf8');
const engine = require('../public/payroll-engine.js').create({ rules: {} });

test('classification metadata is versioned separately from friendly definition identity', () => {
  assert.match(sql, /create table public\.payroll_item_classifications/);
  assert.match(sql, /payroll_item_definition_id uuid not null references public\.payroll_item_definitions/);
  assert.match(sql, /classification_version text not null/);
  assert.match(sql, /effective_from date not null[\s\S]*effective_to date not null/);
  assert.match(sql, /statutory_category text not null[\s\S]*sars_source_code text/);
  assert.match(sql, /paye_treatment text not null[\s\S]*uif_treatment text not null[\s\S]*sdl_treatment text not null/);
  assert.match(sql, /calculation_status text not null default 'metadata_only'/);
});

test('2027 catalogue has stable IDs, item types and only verified SARS source codes', () => {
  for (const code of ['3601', '3605', '3606', '3607', '3701', '3704', '4001', '4003', '4006', '4030']) {
    assert.match(sql, new RegExp(`'${code}'`));
  }
  assert.match(sql, /'commission','Commission','adjustment'/);
  assert.match(sql, /'pension_fund_contribution','Pension Fund Contribution','deduction'/);
  assert.match(sql, /PAYE-AE-06-G06 rev 14/);
  assert.match(sql, /'2026-03-01','2027-03-01'/);
  assert.match(sql, /unique \(payroll_item_definition_id, classification_version\)/);
});

test('generic Allowance remains unresolved and is not retroactively migrated', () => {
  assert.match(sql, /'legacy_generic_allowance','Allowance','adjustment','unclassified',false/);
  assert.match(sql, /'legacy_generic_allowance',null,'unresolved','unresolved','unresolved'/);
  assert.doesNotMatch(sql, /update public\.payroll_adjustments[\s\S]*legacy_generic_allowance/i);
  assert.doesNotMatch(sql, /update public\.payroll_deductions[\s\S]*legacy_generic_allowance/i);
});

test('business deductions are explicitly net-only, not statutory allowable deductions', () => {
  for (const key of ['tools_ppe', 'fine', 'loan']) {
    assert.match(sql, new RegExp(`'${key}'`));
  }
  const netOnly = sql.match(/'not_applicable_net_deduction','not_applicable_net_deduction','not_applicable_net_deduction'/g) || [];
  assert.equal(netOnly.length, 3);
  assert.match(sql, /Tools\/PPE is a net-pay deduction only/);
  assert.match(sql, /Fine is a net-pay deduction only/);
  assert.match(sql, /Loan repayment is a net-pay deduction only/);
});

test('retirement and donation definitions use structured categories and allowable metadata', () => {
  assert.match(sql, /'employee_pension_fund_contribution','4001','allowable_deduction'/);
  assert.match(sql, /'employee_provident_fund_contribution','4003','allowable_deduction'/);
  assert.match(sql, /'employee_retirement_annuity_fund_contribution','4006','allowable_deduction'/);
  assert.match(sql, /'qualifying_section_18a_donation','4030','allowable_deduction'/);
  assert.match(sql, /structured identity supplements but does not remove legacy name-based Provident compatibility/);
});

test('selector remains friendly, searchable and excludes non-selector catalogue entries', () => {
  assert.match(app, /function selectablePayrollItemDefinitions/);
  assert.match(app, /item\.selector_visible !== false/);
  assert.match(app, /selectablePayrollItemDefinitions\(payrollItemSelectorType\)/);
  assert.match(app, /String\(item\.display_name \|\| ""\)\.toLowerCase\(\)\.includes\(search\)/);
  assert.doesNotMatch(app, /sars_source_code.*payrollItemResult/);
  assert.match(sql, /'commission','Commission','adjustment','authoritative',true/);
  assert.match(sql, /'provident_fund_contribution','Provident Fund Contribution','deduction','authoritative',true/);
  for (const name of [
    'Travel Allowance', 'Commission', 'Local Subsistence Allowance (Above Limit)',
    'Pension Fund Contribution', 'Provident Fund Contribution',
    'Retirement Annuity Fund Contribution', 'Qualifying Donation'
  ]) assert.match(`${phase1}\n${sql}`, new RegExp(`'${name.replace(/[()]/g, '\\$&')}'`));
});

test('classification applicable to the period is frozen server-side onto new value rows', () => {
  assert.match(sql, /add column payroll_item_classification_id uuid references public\.payroll_item_classifications/);
  assert.match(sql, /new\.period_end>=c\.effective_from[\s\S]*new\.period_end<c\.effective_to/);
  assert.match(sql, /new\.payroll_item_classification_id:=classification\.id/);
  assert.match(sql, /update of payroll_item_definition_id,payroll_item_classification_id,description,adjustment_type,hours/);
  assert.match(sql, /update of payroll_item_definition_id,payroll_item_classification_id,description,deduction_type_id/);
  assert.doesNotMatch(app, /payroll_item_classification_id: item\./);
  assert.match(sql, /Existing Phase 1 rows remain null and are not backfilled/);
});

test('catalogue metadata is authenticated-read-only and overlap validation fails closed', () => {
  assert.match(sql, /revoke all on table public\.payroll_item_classifications from public,anon,authenticated/);
  assert.match(sql, /grant select on table public\.payroll_item_classifications to authenticated/);
  assert.doesNotMatch(sql, /grant (insert|update|delete|all).*payroll_item_classifications.*authenticated/i);
  assert.match(sql, /Payroll item classification effective ranges may not overlap/);
  assert.match(sql, /No supported payroll item classification for this period/);
});

test('classified dynamic values remain inert for gross, PAYE, UIF, deductions and net pay', () => {
  const base = [{ employee_id: 'E1', gross: 1000, hours: 8, breakdown: { gross: 1000, totalHours: 8 } }];
  const adjustment = [{ employee_id: 'E1', adjustment_type: 'dynamic', payroll_item_definition_id: 'commission', payroll_item_classification_id: '2027', amount: 500, active: true }];
  const deduction = [{ employee_id: 'E1', payroll_item_definition_id: 'provident', payroll_item_classification_id: '2027', description: 'Provident Fund Contribution', amount: 250, active: true }];
  const adjusted = engine.attachAdjustmentsToPayrollRows(base, adjustment, {});
  const result = engine.attachDeductionsToPayrollRows(adjusted, deduction, { calculate_paye: false, calculate_uif: false });
  assert.equal(result[0].gross, 1000);
  assert.equal(result[0].totalAdjustments, 0);
  assert.equal(result[0].totalDeductions, 0);
  assert.equal(result[0].net, 1000);
  assert.deepEqual(result[0].deductions, []);

  const statutoryBase = engine.attachDeductionsToPayrollRows(base, [], { calculate_paye: true, calculate_uif: true });
  const statutoryWithDynamic = engine.attachDeductionsToPayrollRows(adjusted, deduction, { calculate_paye: true, calculate_uif: true });
  assert.deepEqual(statutoryWithDynamic[0].deductions, statutoryBase[0].deductions);
  assert.equal(statutoryWithDynamic[0].net, statutoryBase[0].net);
});

test('Phase 2 does not touch finalised history, SDL calculation or tenant value-table RLS', () => {
  assert.doesNotMatch(sql, /update public\.employee_payroll_period_totals|delete from public\.employee_payroll_period_totals/i);
  assert.doesNotMatch(sql, /calculate_sdl|sdl_ytd|employee_sdl|company_sdl/i);
  assert.doesNotMatch(sql, /create policy.*payroll_adjustments|create policy.*payroll_deductions/i);
  assert.match(phase1, /payroll_adjustments\(company_id,employee_id,period_start,period_end,payroll_item_definition_id\)/);
  assert.match(phase1, /payroll_deductions\(company_id,employee_id,period_start,period_end,payroll_item_definition_id\)/);
});
