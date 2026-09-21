// Source-level financial guardrails only. This test never connects to a database.
const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');

const path = 'supabase/migrations/20260921100000_pvs_accountant_gross_ytd.sql';
const sql = fs.readFileSync(path, 'utf8');
const code = sql.replace(/--[^\n]*/g, '');
const readerSql = fs.readFileSync('supabase/migrations/20260920120000_payroll_legacy_demo_voids.sql', 'utf8');
const waterproofing = '276c7308-8944-41de-bf48-f32ddfec4933';
const construction = '58f6d52b-fc34-4976-8330-c661008942ce';
const excluded = ['PVSC017', 'PVSC039', 'PVSC040', 'PVSC041', 'PVSC042', 'PVSC043'];
const rowPattern = /\('([0-9a-f-]{36})','(PVS[CW]\d{3})','([^']+)',(-?\d+\.\d{2}),(-?\d+\.\d{2}),(-?\d+\.\d{2})\)/g;
const rows = [...sql.matchAll(rowPattern)].map(([, company, employee, name, target, before, adjustment]) => ({
  company, employee, name, target: Number(target), before: Number(before), adjustment: Number(adjustment)
}));

function cents(value) {
  return Math.round(value * 100);
}

test('the complete reconciled target set is exact, scoped and arithmetically consistent', () => {
  assert.equal(rows.length, 57);
  assert.equal(new Set(rows.map(row => `${row.company}:${row.employee}`)).size, 57);
  assert.equal(rows.filter(row => row.company === waterproofing).length, 19);
  assert.equal(rows.filter(row => row.company === construction).length, 38);
  assert.equal(rows.filter(row => row.adjustment > 0).length, 38);
  assert.equal(rows.filter(row => row.adjustment < 0).length, 19);
  assert.equal(rows.filter(row => row.adjustment === 0).length, 0);
  assert.equal(rows.filter(row => row.company === waterproofing && row.adjustment > 0).length, 18);
  assert.equal(rows.filter(row => row.company === waterproofing && row.adjustment < 0).length, 1);
  assert.equal(rows.filter(row => row.company === construction && row.adjustment > 0).length, 20);
  assert.equal(rows.filter(row => row.company === construction && row.adjustment < 0).length, 18);
  for (const row of rows) assert.equal(cents(row.target - row.before), cents(row.adjustment), row.employee);
  for (const employee of excluded) assert.equal(rows.some(row => row.employee === employee), false, employee);

  const canonical = rows.map(row => [row.company, row.employee, row.name,
    row.target.toFixed(2), row.before.toFixed(2), row.adjustment.toFixed(2)].join('|')).join('\n');
  assert.equal(crypto.createHash('sha256').update(canonical).digest('hex'),
    'a53238d77a251a7b7e6ab24eaa42150266607e3188d6223d3d4289d5085c244d');
  assert.equal(rows.filter(row => row.company === waterproofing).reduce((sum, row) => sum + cents(row.adjustment), 0), 16082004);
  assert.equal(rows.filter(row => row.company === construction).reduce((sum, row) => sum + cents(row.adjustment), 0), 5530208);
});

test('schema extension admits gross only for append-only YTD adjustments', () => {
  assert.match(code, /pg_get_constraintdef/);
  assert.match(code, /Unexpected payroll financial-event kind constraint/);
  assert.match(code, /ARRAY\[''paye''::text, ''uif''::text\]/);
  assert.match(code, /alter table public\.payroll_financial_events drop constraint payroll_financial_events_check1/);
  assert.match(code, /kind='ytd_adjustment' and value_type in \('paye','uif','gross'\) and period_id is null and corrected_snapshot is null/);
  assert.match(code, /kind='period_correction' and period_id is not null and corrected_snapshot is not null/);
  assert.doesNotMatch(code, /create or replace function|drop function/i);
  assert.doesNotMatch(code, /\buif_combined\b|\bsdl_contributions\b|\bfinalise_payroll\b/i);
});

test('existing authoritative YTD reader consumes gross deltas without a reader rewrite', () => {
  assert.match(readerSql, /'gross',coalesce\(\(select gross_remuneration from o\),0\)\+coalesce\(\(select sum\(gross_remuneration\) from p\),0\)\+coalesce\(\(select sum\(delta\) from a where value_type='gross'\),0\)/);
  assert.match(code, /public\.payroll_ytd_value\(t\.company_id,t\.employee_id,'2026-03-01'::date,'2026-09-01'::date\)/);
  assert.match(code, /after\.value->>'gross'/);
  assert.match(code, /after\.value->>'paye'/);
  assert.match(code, /after\.value->>'uif'/);
});

test('migration is atomic and changes no payroll history, opening balances or formulas', () => {
  assert.match(code, /^\s*begin;/);
  assert.match(code, /commit;\s*$/);
  assert.equal([...code.matchAll(/insert into public\.payroll_financial_events/gi)].length, 1);
  assert.doesNotMatch(code, /(?:update|delete from|truncate)\s+public\./i);
  assert.doesNotMatch(code, /insert into public\.(?:payroll_runs|employee_payroll_period_totals|employee_payroll_ytd_opening_balances|employees|company_payroll_rules)/i);
  assert.match(code, /'ytd_adjustment','gross'/);
  assert.match(code, /'2026-08-31'::date,'2026-08-31'::date/);
  assert.match(code, /PVS accountant gross YTD correction through 31 August 2026/);
});

test('pre-state, deterministic replay and post-state assertions fail closed', () => {
  assert.match(code, /md5\('shiftly:pvs-accountant-gross-ytd:2026-08-31:'/);
  assert.match(code, /if existing_count not in \(0,57\)/);
  assert.match(code, /Effective gross changed since reconciliation/);
  assert.match(code, /A deterministic gross correction request exists with different data/);
  assert.match(code, /where not exists\(select 1 from public\.payroll_financial_events a/);
  assert.match(code, /Expected exactly 57 audited gross correction events/);
  assert.match(code, /Post-correction gross\/PAYE\/UIF verification failed/);
});

test('company, employee, exclusion and demo-void boundaries remain explicit', () => {
  assert.match(code, /PVS company identity does not match the approved mapping/);
  assert.match(code, /exactly 19 Waterproofing and 38 Construction employees/);
  assert.match(code, /Gross target employee\/company\/name mismatch/);
  assert.match(code, /Gross correction escaped the approved scope/);
  for (const employee of excluded) assert.match(code, new RegExp(employee));
  for (const id of ['c2254d6d-ee97-45d6-9b64-4d144df8b037', 'a34325c5-e1e9-41f1-87a6-44c80ec1e1bc'])
    assert.ok(code.split(id).length >= 3, `${id} is asserted before and after the insert`);
});
