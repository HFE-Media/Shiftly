// Source-level guardrails only. Production application remains a separately
// authorised operation and this test deliberately does not start a database.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const path = 'supabase/migrations/20260920120000_payroll_legacy_demo_voids.sql';
const sql = fs.readFileSync(path, 'utf8');
const code = sql.replace(/--[^\n]*/g, '');

function body(name) {
  const match = sql.match(new RegExp(`create or replace function public\\.${name}\\([^]*?\\$\\$;`, 'i'));
  assert.ok(match, `${name} must be replaced by the correction migration`);
  return match[0];
}

test('correction is transactional, additive, immutable and has no browser write surface', () => {
  assert.match(code, /^\s*begin;/);
  assert.match(code, /commit;\s*$/);
  assert.match(code, /create table public\.payroll_legacy_period_voids/);
  assert.match(code, /foreign key \(company_id, employee_id, tax_year_start, period_id\)/);
  assert.match(code, /create trigger payroll_legacy_voids_immutable[^]*public\.payroll_immutable\(\)/);
  assert.match(code, /enable row level security/);
  assert.match(code, /revoke all on public\.payroll_legacy_period_voids from public, anon, authenticated/);
  assert.doesNotMatch(code, /grant\s+(insert|update|delete|all)\b/i);
  assert.doesNotMatch(code, /delete\s+from\s+public\.employee_payroll_period_totals/i);
  assert.doesNotMatch(code, /update\s+public\.employee_payroll_period_totals/i);
});

test('only the two exact inspected PVS Construction artifacts are authorised', () => {
  const ids = [
    'c2254d6d-ee97-45d6-9b64-4d144df8b037',
    'a34325c5-e1e9-41f1-87a6-44c80ec1e1bc'
  ];
  assert.match(code, /58f6d52b-fc34-4976-8330-c661008942ce/);
  assert.match(code, /PVS Construction/);
  for (const id of ids) assert.equal(code.split(id).length - 1, 2, `${id} is asserted once and inserted once`);
  assert.equal(code.split("'PVSC001'").length - 1, 2);
  assert.equal(code.split("'PVSC006'").length - 1, 2);
  for (const required of [
    /period_start='2026-09-01'::date and p\.period_end='2026-09-15'::date and p\.period_number=7/,
    /gross_remuneration=6022\.91[^]*paye_deducted=0/,
    /gross_remuneration=23093\.85[^]*paye_deducted=2314\.64/,
    /p\.run_id is null and p\.document_row is null and p\.paye_enabled is null and p\.uif_enabled is null/,
    /p\.employee_uif is null and p\.employer_uif is null and p\.uif_liable_remuneration is null/,
    /payroll_runs[^]*period_start='2026-09-01'::date and period_end='2026-09-15'::date/
  ]) assert.match(code, required);
  assert.doesNotMatch(code, /PVS Waterproofing|2026-07-25|2026-08-26/);
});

test('voiding is restricted to pre-authoritative legacy rows and retains their snapshot', () => {
  const validator = sql.match(/create function public\.payroll_validate_legacy_period_void\(\)[^]*?end \$\$;/i)?.[0] || '';
  assert.match(validator, /p\.run_id is not null or p\.document_row is not null/);
  assert.match(validator, /p\.paye_enabled is not null or p\.uif_enabled is not null/);
  assert.match(validator, /p\.employee_uif is not null or p\.employer_uif is not null/);
  assert.match(validator, /p\.uif_liable_remuneration is not null/);
  assert.match(validator, /new\.original_snapshot:=to_jsonb\(p\)/);
  assert.match(code, /reason text not null/);
  assert.match(code, /authority text not null/);
  assert.match(code, /recorded_by text not null default current_user/);
  assert.match(code, /recorded_at timestamptz not null default now\(\)/);
});

test('voided artifacts are excluded from every authoritative period consumer', () => {
  for (const name of ['payroll_ytd_value', 'get_payroll_history', 'get_own_payroll_snapshot',
    'payroll_uif_month', 'save_employee_with_ytd', 'finalise_payroll']) {
    assert.match(body(name), /not exists\(select 1 from public\.payroll_legacy_period_voids/i, name);
  }
  const ytd = body('payroll_ytd_value');
  for (const value of ['finalized_periods', 'gross', 'retirement', 'paye', 'uif', 'adjustment_cutoff'])
    assert.match(ytd, new RegExp(`'${value}'`));
  const monthly = body('payroll_uif_month');
  assert.match(monthly, /'ambiguous',coalesce\(bool_or/);
  assert.match(monthly, /employee_uif is null or p\.employer_uif is null or p\.uif_liable_remuneration is null/);
});

test('genuine overlap and monthly UIF ambiguity protections remain active', () => {
  const finalise = body('finalise_payroll');
  assert.match(finalise, /if exists\(select 1 from public\.employee_payroll_period_totals p[^]*p\.period_start<=t and p\.period_end>=s[^]*not exists\(select 1 from public\.payroll_legacy_period_voids/);
  assert.match(finalise, /Duplicate or overlapping finalised payroll/);
  const monthlyMigration = fs.readFileSync('supabase/migrations/20260919150000_payroll_monthly_uif.sql', 'utf8');
  assert.match(monthlyMigration, /This UIF month contains legacy payroll with incomplete UIF information\. Monthly UIF cannot be calculated safely\./);
  assert.match(monthlyMigration, /new\.uif_liable_remuneration is distinct from liable/);
});

test('unaffected-company revisions and TR continuity remain unchanged', () => {
  const revision = body('payroll_revision');
  assert.match(revision, /case when exists\(select 1 from public\.payroll_legacy_period_voids v where v\.company_id=c\)/);
  assert.match(revision, /else '\[\]'::jsonb end/);
  const finalise = body('finalise_payroll');
  assert.match(finalise, /c='f50d8e62-3006-462e-b2a9-b1cf7c500394'::uuid/);
  assert.match(finalise, /TR cumulative PAYE completed-period continuity mismatch/);
});
