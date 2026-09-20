const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const app = fs.readFileSync('public/app.js', 'utf8');
const login = fs.readFileSync('public/login.html', 'utf8');

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

test('timesheet clock-in site displays only the historical site name', () => {
  const label = loadFunction('timesheetSiteLabel');
  assert.equal(label({ site_id: 'S01', site_name: ' Office ' }), 'Office');
  assert.equal(label({ site_id: 'S01', site_name: '' }), '');
  assert.equal(label(null), '');
});

test('timesheet uses short unpadded dates and loads site snapshot fields', () => {
  const dateLabel = loadFunction('timesheetDateLabel');
  assert.equal(dateLabel(new Date('2026-09-01T12:00:00Z')), '1 Sept 2026');
  assert.match(app, /\.select\("entry_id,created_at,action,employee_id,employee_name,site_id,site_name,result,message"\)/);
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
