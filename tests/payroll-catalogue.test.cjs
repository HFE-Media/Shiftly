const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const Authority = require('../src/payroll-authority.js');
const phase1 = fs.readFileSync('supabase/migrations/20260923130000_dynamic_payroll_items.sql', 'utf8');
const phase2 = fs.readFileSync('supabase/migrations/20260923150000_payroll_item_classifications.sql', 'utf8');
const migration = fs.readFileSync('supabase/migrations/20260925160000_payroll_adjustments_deductions_catalogue.sql', 'utf8');

const existingAdjustments = [
  'travel_allowance', 'ordinary_remuneration', 'commission', 'annual_bonus',
  'overtime', 'paid_leave_taken', 'legacy_generic_allowance', 'local_subsistence_above_limit'
];
const existingDeductions = [
  'unclassified_deduction', 'pension_fund_contribution', 'provident_fund_contribution',
  'retirement_annuity_fund_contribution', 'qualifying_donation', 'tools_ppe', 'fine', 'loan'
];
const newItems = [
  ['salary_advance_repayment', 'Salary Advance Repayment'],
  ['emoluments_attachment_order', 'Garnishee / Emoluments Attachment Order'],
  ['maintenance_order', 'Maintenance Order'],
  ['union_subscription', 'Union Subscription'],
  ['bargaining_council_employee_contribution', 'Bargaining Council Employee Contribution'],
  ['funeral_scheme_contribution', 'Funeral Scheme Contribution'],
  ['group_insurance_premium', 'Group Insurance Premium'],
  ['staff_purchase', 'Staff Purchase'],
  ['accommodation_deduction', 'Accommodation Deduction'],
  ['meals_deduction', 'Meals Deduction'],
  ['transport_deduction', 'Transport Deduction'],
  ['other_authorised_deduction', 'Other Authorised Deduction']
];

test('existing definition identities remain present and are not rewritten', () => {
  const existing = `${phase1}\n${phase2}`;
  for (const key of [...existingAdjustments, ...existingDeductions]) {
    assert.match(existing, new RegExp(`'${key}'`));
    assert.doesNotMatch(migration, new RegExp(`update\\s+public\\.payroll_item_definitions[\\s\\S]*'${key}'`, 'i'));
  }
  assert.equal(existingAdjustments.length, 8);
  assert.equal(existingDeductions.length, 8);
  assert.doesNotMatch(migration, /update\s+public\.payroll_item_(?:definitions|classifications)/i);
});

test('catalogue adds twelve stable, unique, selectable deduction definitions', () => {
  const definitionInsert = migration.match(/insert into public\.payroll_item_definitions[\s\S]*?on conflict do nothing;/i)[0];
  const ids = [...definitionInsert.matchAll(/'([0-9a-f-]{36})','([a-z0-9_]+)','([^']+)','deduction','authoritative',true\)/g)];
  assert.equal(ids.length, 12);
  assert.equal(new Set(ids.map(match => match[1])).size, 12);
  assert.equal(new Set(ids.map(match => match[2])).size, 12);
  for (const [key, name] of newItems) {
    assert.ok(ids.some(match => match[2] === key && match[3] === name), `${name} definition missing`);
  }
});

test('every new deduction has one effective payroll-active net-only classification', () => {
  const classificationInsert = migration.match(/insert into public\.payroll_item_classifications[\s\S]*?on conflict do nothing;/i)[0];
  const classificationIds = [...classificationInsert.matchAll(/'5e8b0d20-6a32-4b9f-a000-[0-9a-f]{12}'/g)];
  assert.equal(classificationIds.length, 12);
  assert.equal(new Set(classificationIds.map(match => match[0])).size, 12);
  assert.equal((classificationInsert.match(/'ordinary_business_deduction'/g) || []).length, 12);
  assert.equal((classificationInsert.match(/'not_applicable_net_deduction'/g) || []).length, 36);
  assert.equal((classificationInsert.match(/'payroll_active'/g) || []).length, 12);
  assert.equal((classificationInsert.match(/'2026-03-01','2027-03-01'/g) || []).length, 12);
  assert.equal((classificationInsert.match(/,null,'not_applicable_net_deduction'/g) || []).length, 12);
});

test('display-name search finds the new catalogue without aliases or UI categories', () => {
  const names = newItems.map(([, name]) => name);
  const search = value => names.filter(name => name.toLowerCase().includes(value.toLowerCase()));
  for (const term of ['advance', 'garnishee', 'emoluments', 'maintenance', 'union', 'bargaining council',
    'funeral', 'insurance', 'staff purchase', 'accommodation', 'meals', 'transport', 'authorised']) {
    assert.ok(search(term).length, `${term} should find a catalogue item`);
  }
  assert.doesNotMatch(migration, /item_type[^\n]*(?:allowance|benefit|contribution|reporting)/i);
});

test('automatic statutory items are not duplicated as selectable deductions', () => {
  const definitionInsert = migration.match(/insert into public\.payroll_item_definitions[\s\S]*?on conflict do nothing;/i)[0];
  for (const forbidden of ['paye', 'employee_uif', 'employer_uif', 'skills_development_levy', 'sdl']) {
    assert.doesNotMatch(definitionInsert, new RegExp(`'${forbidden}'`, 'i'));
  }
});

function classification(overrides = {}) {
  return {
    id: 'class-net-only', item_key: 'salary_advance_repayment', display_name: 'Salary Advance Repayment',
    item_type: 'deduction', statutory_category: 'ordinary_business_deduction', sars_source_code: null,
    paye_treatment: 'not_applicable_net_deduction', uif_treatment: 'not_applicable_net_deduction',
    sdl_treatment: 'not_applicable_net_deduction', calculation_status: 'payroll_active',
    classification_version: 'za-2027-r14', ...overrides
  };
}

function authorityInput(item = classification()) {
  const fixed = ['ordinary_remuneration', 'overtime', 'annual_bonus', 'paid_leave_taken'].map(key => ({
    id: `fixed-${key}`, item_key: key, display_name: key, item_type: 'adjustment',
    statutory_category: key, sdl_treatment: 'included_remuneration', calculation_status: 'metadata_only'
  }));
  return {
    company: { id: '10000000-0000-0000-0000-000000000001', name: 'Synthetic' },
    rules: { calculate_paye: false, calculate_uif: false, calculate_sdl: true },
    employees: [{ employee_id: 'E1', full_name: 'Employee One', active: true, rate: 10000, pay_type: 'monthly', pay_cycle: 'monthly' }],
    deductionTypes: [], events: [], adjustments: [], levy: null, classifications: [...fixed, item],
    deductions: [{ employee_id: 'E1', description: item.display_name, amount: 123, active: true,
      payroll_item_definition_id: 'definition-net-only', payroll_item_classification_id: item.id }],
    sdl: { configuration: { id: 'config-1', enabled: true, effective_from: '2026-03-01', effective_to: null },
      rate: { id: 'rate-1', rate: 0.01, rate_version: 'za-sdl-1pct-2027', effective_from: '2026-03-01', effective_to: '2027-03-01' },
      employee_circumstances: [] },
    history: { revision: 'fixture', employees: [{ employee_id: 'E1' }] }
  };
}

test('authoritative net-only deduction reduces only net pay and leaves gross and SDL unchanged', () => {
  const row = Authority.calculate(authorityInput(), { start: '2026-09-01', end: '2026-09-30', levyWeeks: null }).rows[0];
  assert.equal(row.document_row.gross, 10000);
  assert.equal(row.document_row.totalDeductions, 123);
  assert.equal(row.document_row.net, 9877);
  assert.equal(row.sdl_leviable_remuneration, '10000.00');
  assert.equal(row.sdl_amount, '100.00');
  assert.equal(row.retirement_fund_contributions, '0.00');
});

test('authority still rejects a non-active or forged dynamic classification', () => {
  const metadataOnly = classification({ calculation_status: 'metadata_only' });
  assert.throws(
    () => Authority.calculate(authorityInput(metadataOnly), { start: '2026-09-01', end: '2026-09-30', levyWeeks: null }),
    /needs statutory evidence or calculation support/i
  );
});

test('migration is additive, conflict-safe and cannot alter payroll history', () => {
  assert.equal((migration.match(/on conflict do nothing;/gi) || []).length, 2);
  assert.match(migration, /Payroll deduction catalogue definition conflict/);
  assert.match(migration, /Payroll deduction catalogue classification conflict/);
  assert.doesNotMatch(migration, /\b(?:update|delete|alter|drop|truncate)\b\s+(?:table\s+)?public\./i);
  for (const table of ['employee_payroll_period_totals', 'payroll_runs', 'payroll_financial_events',
    'employee_payroll_ytd_opening_balances', 'payroll_adjustments', 'payroll_deductions',
    'clock_events', 'company_payroll_rules']) {
    assert.doesNotMatch(migration, new RegExp(`(?:insert into|update|delete from)\\s+public\\.${table}`, 'i'));
  }
});
