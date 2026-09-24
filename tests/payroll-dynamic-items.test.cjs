const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const html = fs.readFileSync('public/login.html', 'utf8');
const app = fs.readFileSync('public/app.js', 'utf8');
const sql = fs.readFileSync('supabase/migrations/20260923130000_dynamic_payroll_items.sql', 'utf8');
const engine = require('../public/payroll-engine.js').create({ rules: {} });

test('compact adjustment and deduction add controls use the existing editor grid', () => {
  assert.match(app, /data-add-payroll-item=\"adjustment\"/);
  assert.match(app, /data-add-payroll-item=\"deduction\"/);
  assert.match(app, /deductionGroupGrid/);
  assert.match(html, /dynamicPayrollItemAdd/);
});

test('selector modal has search and add action but no amount input', () => {
  const modal = html.match(/<div class="modal sheetModal" id="payrollItemSelectorModal"[\s\S]*?<div class="modal sheetModal" id="payrollFinaliseModal"/)[0];
  assert.match(modal, /id="payrollItemSearch"[^>]*type="search"/);
  assert.match(modal, /id="btnAddPayrollItem"/);
  assert.doesNotMatch(modal, /inputmode="decimal"|placeholder="Amount"/);
  assert.match(app, /itemType === "adjustment" \? "Add Adjustment" : "Add Deduction"/);
});

test('selection adds one zero-value card and duplicate definitions are excluded', () => {
  assert.match(app, /dynamicPayrollEditorItems\[payrollItemSelectorType\]\.add/);
  assert.match(app, /!selected\.has\(String\(item\.id\)\)/);
  assert.match(app, /data-dynamic-adjustment-id/);
  assert.match(app, /data-dynamic-deduction-id/);
  assert.match(app, /placeholder="0\.00"/);
});

test('dynamic cards use the existing save workflow and subtle removal', () => {
  assert.match(app, /function savePayrollDeductions\(/);
  assert.match(app, /payroll_item_definition_id: item\.id/);
  assert.match(app, /data-remove-payroll-item/);
  assert.match(app, /dynamicPayrollEditorItems\[itemType\]\.delete/);
  assert.match(app, /\.update\(\{ active: false \}\)/);
  assert.match(html, />Save Payroll Changes</);
});

test('search is case-insensitive partial matching', () => {
  assert.match(app, /\.toLowerCase\(\)\.includes\(search\)/);
  assert.match(app, /payrollItemSearch\.addEventListener\("input"/);
});

test('unclassified dynamic items cannot alter gross, deductions, PAYE, UIF, or net', () => {
  const base = [{ employee_id: 'E1', gross: 1000, hours: 8, breakdown: { gross: 1000, totalHours: 8 } }];
  const dynamicAdjustment = [{ employee_id: 'E1', adjustment_type: 'dynamic', payroll_item_definition_id: 'item-a', amount: 500, active: true }];
  const adjusted = engine.attachAdjustmentsToPayrollRows(base, dynamicAdjustment, {});
  assert.equal(adjusted[0].gross, 1000);
  assert.equal(adjusted[0].totalAdjustments, 0);

  const dynamicDeduction = [{ employee_id: 'E1', payroll_item_definition_id: 'item-d', description: 'Other Deduction', amount: 250, active: true }];
  const result = engine.attachDeductionsToPayrollRows(adjusted, dynamicDeduction, { calculate_paye: false, calculate_uif: false });
  assert.equal(result[0].totalDeductions, 0);
  assert.equal(result[0].net, 1000);
  assert.deepEqual(result[0].deductions, []);
});

test('existing fixed adjustments and deductions retain their current behaviour', () => {
  const base = [{ employee_id: 'E1', gross: 1000, hours: 8, breakdown: { gross: 1000, totalHours: 8 } }];
  const adjusted = engine.attachAdjustmentsToPayrollRows(base, [{ employee_id: 'E1', adjustment_type: 'allowance', description: 'Allowance', amount: 100, active: true }], {});
  assert.equal(adjusted[0].gross, 1100);
  const result = engine.attachDeductionsToPayrollRows(adjusted, [{ employee_id: 'E1', description: 'Loan', amount: 50, active: true }], { calculate_paye: false, calculate_uif: false });
  assert.equal(result[0].totalDeductions, 50);
  assert.equal(result[0].net, 1050);
});

test('schema uses stable IDs, safe seeds, duplicate guards, type validation, and existing tenant tables', () => {
  assert.match(sql, /create table public\.payroll_item_definitions/);
  assert.match(sql, /item_key text not null unique/);
  assert.match(sql, /classification_status text not null default 'unclassified'/);
  assert.match(sql, /sars_source_code text[\s\S]*paye_treatment text[\s\S]*uif_treatment text[\s\S]*sdl_treatment text/);
  assert.match(sql, /alter table public\.payroll_adjustments[\s\S]*add column payroll_item_definition_id/);
  assert.match(sql, /alter table public\.payroll_deductions[\s\S]*add column payroll_item_definition_id/);
  assert.match(sql, /where active and payroll_item_definition_id is not null/g);
  assert.match(sql, /definition\.item_type<>expected_type/);
  assert.match(sql, /classification_status<>'unclassified'/);
  assert.match(sql, /revoke all on table public\.payroll_item_definitions from public,anon,authenticated/);
  assert.match(sql, /grant select on table public\.payroll_item_definitions to authenticated/);
  assert.match(sql, /revoke all on function public\.payroll_validate_dynamic_item\(\) from public,anon,authenticated/);
  assert.doesNotMatch(sql, /update public\.employee_payroll_period_totals|delete from public\.employee_payroll_period_totals/i);
});
