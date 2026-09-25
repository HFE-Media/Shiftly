const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const app = fs.readFileSync('public/app.js', 'utf8');
const login = fs.readFileSync('public/login.html', 'utf8');
const payrollEngine = require('../public/payroll-engine.js');

function loadFunction(name) {
  const start = app.indexOf(`function ${name}(`);
  assert.notEqual(start, -1, `${name} is present`);
  const next = app.indexOf('\nfunction ', start + 1);
  const source = app.slice(start, next === -1 ? app.length : next);
  const context = {};
  vm.createContext(context);
  vm.runInContext(`${source}\nthis.result = ${name};`, context);
  return context.result;
}

function loadTimesheetBuilder() {
  const engine = payrollEngine.create({ company: { id: 'fixture' }, rules: {}, start: '2026-09-17', end: '2026-09-20' });
  const start = app.indexOf('function buildTimesheetRows(');
  const end = app.indexOf('\nfunction renderTimesheetReport', start);
  const context = {
    normalisePayrollRules: engine.normalisePayrollRules,
    payrollEventTime: engine.payrollEventTime,
    mixocronWallEventTime: engine.mixocronWallEventTime,
    dateKey: engine.dateKey,
    datesInRange: engine.datesInRange,
    buildMixocronDailyParts: engine.buildMixocronDailyParts,
    buildShiftPartsForPayroll: engine.buildShiftPartsForPayroll,
    timesheetSiteLabel: event => String(event?.site_name || '').trim()
  };
  vm.createContext(context);
  vm.runInContext(`${app.slice(start, end)}\nthis.result = buildTimesheetRows;`, context);
  return { build: context.result, dateKey: engine.dateKey };
}

const clockEvent = (entryId, createdAt, action, result = 'OK') => ({
  entry_id: entryId,
  created_at: createdAt,
  action,
  result,
  site_name: 'Night Site'
});

test('timesheet clock-in site displays only the historical site name', () => {
  const label = loadFunction('timesheetSiteLabel');
  assert.equal(label({ site_id: 'S01', site_name: ' Office ' }), 'Office');
  assert.equal(label({ site_id: 'S01', site_name: '' }), '');
  assert.equal(label(null), '');
});

test('timesheet uses short unpadded dates and loads site snapshot fields', () => {
  const dateLabel = loadFunction('timesheetDateLabel');
  assert.equal(dateLabel(new Date('2026-09-01T12:00:00Z')), '1 Sept 2026');
  assert.match(app, /const columns = "entry_id,created_at,action,employee_id,employee_name,site_id,site_name,result,message";/);
});

test('timesheet header and print metadata use full unpadded month names', () => {
  const fullDateLabel = loadFunction('timesheetFullDateLabel');
  assert.equal(fullDateLabel(new Date('2026-09-01T12:00:00Z')), '1 September 2026');
  assert.match(app, /timesheetPeriod\.textContent = `\$\{timesheetFullDateLabel/);
  assert.match(app, /Generated \$\{escapeHtml\(timesheetFullDateLabel/);
});

test('screen and print timesheets include the clock-in site column', () => {
  assert.match(login, /<th>Clock-in Site<\/th>/);
  assert.match(login, /colspan="7">Preparing timesheet/);
  assert.match(app, /<th>Clock-in Site<\/th>/);
  assert.match(app, /row\.firstInSite \? escapeHtml\(row\.firstInSite\) : "&mdash;"/);
});

test('timesheet pairs normal and overnight shifts chronologically on the IN work date', () => {
  const { build, dateKey } = loadTimesheetBuilder();
  const normal = build([
    clockEvent('1', '2026-09-17T07:00:00+02:00', 'IN'),
    clockEvent('2', '2026-09-17T16:00:00+02:00', 'OUT')
  ], '2026-09-17', '2026-09-17', {});
  assert.equal(normal[0].workedMinutes, 540);
  assert.equal(normal[0].incomplete, false);

  const overnight = build([
    clockEvent('3', '2026-09-17T17:03:00+02:00', 'IN'),
    clockEvent('4', '2026-09-18T04:47:00+02:00', 'OUT')
  ], '2026-09-17', '2026-09-18', {});
  assert.equal(dateKey(overnight[0].date), '2026-09-17');
  assert.equal(overnight[0].workedMinutes, 704);
  assert.equal(overnight[0].incomplete, false);
  assert.equal(overnight[1].firstIn, null, 'the consumed morning OUT does not create another shift');
  assert.equal(overnight[1].incomplete, false);
});

test('timesheet keeps consecutive overnight OUT events consumed by their matching IN', () => {
  const { build, dateKey } = loadTimesheetBuilder();
  const rows = build([
    clockEvent('1', '2026-09-17T17:03:00+02:00', 'IN'),
    clockEvent('2', '2026-09-18T04:47:00+02:00', 'OUT'),
    clockEvent('3', '2026-09-18T17:24:00+02:00', 'IN'),
    clockEvent('4', '2026-09-19T04:46:00+02:00', 'OUT'),
    clockEvent('5', '2026-09-19T17:57:00+02:00', 'IN'),
    clockEvent('6', '2026-09-20T05:07:00+02:00', 'OUT')
  ], '2026-09-17', '2026-09-20', {});
  assert.deepEqual(Array.from(rows.slice(0, 3), row => [dateKey(row.date), row.workedMinutes, row.incomplete]), [
    ['2026-09-17', 704, false],
    ['2026-09-18', 682, false],
    ['2026-09-19', 670, false]
  ]);
  assert.equal(rows[3].firstIn, null);
  assert.equal(rows[3].incomplete, false);
});

test('timesheet keeps missing or BLOCKED clock-outs incomplete', () => {
  const { build } = loadTimesheetBuilder();
  const missing = build([clockEvent('1', '2026-09-17T17:03:00+02:00', 'IN')], '2026-09-17', '2026-09-17', {});
  assert.equal(missing[0].incomplete, true);
  assert.equal(missing[0].workedMinutes, 0);

  const blocked = build([
    clockEvent('1', '2026-09-17T17:03:00+02:00', 'IN'),
    clockEvent('2', '2026-09-18T04:47:00+02:00', 'OUT', 'BLOCKED')
  ], '2026-09-17', '2026-09-17', {});
  assert.equal(blocked[0].incomplete, true);
  assert.equal(blocked[0].lastOut, null);
});

test('timesheet accepts boundary context without creating a fake in-range shift', () => {
  const { build } = loadTimesheetBuilder();
  const lookAhead = build([
    clockEvent('1', '2026-09-17T17:03:00+02:00', 'IN'),
    clockEvent('2', '2026-09-18T04:47:00+02:00', 'OUT')
  ], '2026-09-17', '2026-09-17', {});
  assert.equal(lookAhead[0].workedMinutes, 704);
  assert.equal(lookAhead[0].incomplete, false);

  const lookBehind = build([
    clockEvent('3', '2026-09-16T17:03:00+02:00', 'IN'),
    clockEvent('4', '2026-09-17T04:47:00+02:00', 'OUT')
  ], '2026-09-17', '2026-09-17', {});
  assert.equal(lookBehind[0].firstIn, null);
  assert.equal(lookBehind[0].incomplete, false);

  assert.match(app, /\.lt\("created_at", startIso\)[\s\S]*?\.limit\(1\)/);
  assert.match(app, /\.gt\("created_at", endIso\)[\s\S]*?\.limit\(1\)/);
});
