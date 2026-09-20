// Source-level financial guardrails only. This test never connects to a database.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const sql = fs.readFileSync('supabase/migrations/20260920150000_pvs_accountant_ytd_targets.sql', 'utf8');
const code = sql.replace(/--[^\n]*/g, '');
const rowPattern = /\('([0-9a-f-]{36})','(PVS[CW]\d{3})',(\d+\.\d{2}),(\d+\.\d{2})\)/g;
const actual = new Map([...sql.matchAll(rowPattern)].map(([, company, employee, paye, uif]) =>
  [employee, { company, paye, uif }]));
const waterproofing = '276c7308-8944-41de-bf48-f32ddfec4933';
const construction = '58f6d52b-fc34-4976-8330-c661008942ce';

function expectedRows(company, source) {
  return source.split(',').map(item => {
    const [employee, paye, uif] = item.split(':');
    return [employee, { company, paye, uif }];
  });
}
const expected = new Map([
  ...expectedRows(waterproofing,
    'PVSW001:17057.00:1062.72,PVSW002:1098.00:554.65,PVSW003:1189.00:559.16,PVSW004:287.00:122.10,PVSW005:429.00:463.69,PVSW006:1102.00:354.96,PVSW007:1282.00:554.68,PVSW008:2012.00:601.38,PVSW009:2334.00:621.55,PVSW010:2103.00:1452.82,PVSW011:2277.00:592.46,PVSW012:0.00:365.63,PVSW013:0.00:458.94,PVSW014:0.00:252.51,PVSW015:155.41:235.01,PVSW016:0.00:365.63,PVSW017:0.00:374.42,PVSW018:0.00:157.31,PVSW019:17057.00:708.48'),
  ...expectedRows(construction,
    'PVSC001:0.00:370.04,PVSC002:257.00:452.46,PVSC003:0.00:373.22,PVSC004:0.00:361.86,PVSC005:0.00:323.45,PVSC006:20507.00:1062.72,PVSC007:1262.00:566.46,PVSC008:0.00:372.97,PVSC009:0.00:372.30,PVSC010:4067.00:565.94,PVSC011:114.00:485.00,PVSC012:3697.00:682.49,PVSC013:0.00:379.84,PVSC014:0.00:371.19,PVSC015:13587.00:1062.72,PVSC016:0.00:264.23,PVSC017:0.00:262.76,PVSC018:0.00:236.67,PVSC019:0.00:242.99,PVSC020:0.00:234.39,PVSC021:0.00:245.25,PVSC022:0.00:385.64,PVSC023:0.00:370.60,PVSC024:51.00:386.22,PVSC025:0.00:361.24,PVSC026:18410.00:1062.72,PVSC027:0.00:376.35,PVSC028:0.00:390.15,PVSC029:0.00:198.92,PVSC030:0.00:198.92,PVSC031:0.00:207.34,PVSC032:10491.00:981.36,PVSC033:1529.00:539.31,PVSC034:2528.00:632.05,PVSC035:3384.00:682.05,PVSC036:2528.00:632.05,PVSC037:4884.00:767.40,PVSC038:2880.00:651.38,PVSC044:28971.00:1062.72')
]);

test('all 58 approved accountant targets are exact and company scoped', () => {
  assert.equal(actual.size, 58);
  assert.equal([...actual.values()].filter(row => row.company === waterproofing).length, 19);
  assert.equal([...actual.values()].filter(row => row.company === construction).length, 39);
  assert.deepEqual(actual, expected);
  for (const employee of ['PVSC039', 'PVSC040', 'PVSC041', 'PVSC042', 'PVSC043'])
    assert.equal(actual.has(employee), false);
});

test('migration is atomic and only appends audited PAYE/UIF events', () => {
  assert.match(code, /^\s*begin;/);
  assert.match(code, /commit;\s*$/);
  assert.equal([...code.matchAll(/insert into public\.payroll_financial_events/gi)].length, 2);
  assert.doesNotMatch(code, /(?:update|delete from|truncate)\s+public\./i);
  assert.doesNotMatch(code, /insert into public\.(?:payroll_runs|employee_payroll_period_totals|employee_payroll_ytd_opening_balances|employees|company_payroll_rules)/i);
  assert.doesNotMatch(code, /\buif_combined\b|\bsdl_contributions\b|\bfinalise_payroll\b/i);
  assert.match(code, /'ytd_adjustment',x\.value_type/);
  assert.match(code, /\('paye'::text,b\.paye_before,b\.paye_target\)/);
  assert.match(code, /\('uif'::text,b\.uif_before,b\.uif_target\)/);
  assert.match(code, /PVS accountant YTD correction through 31 August 2026/);
});

test('existing authoritative reader computes both before values and exact postconditions', () => {
  assert.match(code, /payroll_ytd_value\(t\.company_id,t\.employee_id,'2026-03-01'::date,'2026-09-01'::date\)/);
  assert.match(code, /y\.value->>'paye'/);
  assert.match(code, /y\.value->>'uif'/);
  assert.match(code, /is distinct from t\.paye_target/);
  assert.match(code, /is distinct from t\.uif_target/);
  assert.match(code, /Expected exactly 116 audited PAYE\/UIF correction events/);
});

test('mapping, cutoff, later-target and demo-void assertions fail closed', () => {
  assert.match(code, /PVS company identity does not match the approved mapping/);
  assert.match(code, /exactly 19 Waterproofing and 39 Construction/);
  assert.match(code, /Target employee ID also maps to another company/);
  assert.match(code, /Unconfirmed Construction employees must not be targeted/);
  assert.match(code, /A later accountant YTD target already exists/);
  assert.match(code, /The approved PVS Construction demo-void state changed/);
  assert.match(code, /c2254d6d-ee97-45d6-9b64-4d144df8b037/);
  assert.match(code, /a34325c5-e1e9-41f1-87a6-44c80ec1e1bc/);
});

test('deterministic requests are idempotent and partial prior writes are rejected', () => {
  assert.match(code, /md5\('shiftly:pvs-accountant-ytd:2026-08-31:'/);
  assert.match(code, /having count\(a\.id\) not in \(0,2\)/);
  assert.match(code, /where not exists\(select 1 from public\.payroll_financial_events a where a\.company_id=b\.company_id and a\.request_id=b\.request_id\)/);
  assert.match(code, /A deterministic accountant correction request already exists with different data/);
});

test('the exact PVSC001 later UIF target is preserved append-only', () => {
  assert.match(code, /f7ec46bb-26e2-4f64-adc6-e0ff96916349/);
  assert.match(code, /6718ff1e-9ea8-4d41-96d7-5b20c6da32ca/);
  assert.match(code, /a\.previous_value=0 and a\.target_value=370\.04/);
  assert.match(code, /a\.applies_after='2026-09-19'::date and a\.ytd_as_at='2026-09-19'::date/);
  assert.match(code, /Preserve existing PVSC001 UIF YTD target after backdated PVS accountant correction/);
  assert.match(code, /PVSC001 later UIF target was not preserved/);
});
