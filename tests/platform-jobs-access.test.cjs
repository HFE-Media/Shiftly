const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const app = fs.readFileSync('public/app.js', 'utf8');
const html = fs.readFileSync('public/login.html', 'utf8');
const sw = fs.readFileSync('public/service-worker.js', 'utf8');
const code = app.slice(app.indexOf('function renderPlatformJobsAccess('), app.indexOf('async function loadPlatformCompanyDetail('));
function harness({ admin = true, user = { id: 'admin' }, flag = false, result } = {}) {
  const calls = [];
  const company = { id: 'one', name: 'Demo', jobs_enabled: flag, billing_enabled: true };
  const c = { isPlatformAdmin: admin, currentUser: user, platformCompanies: [company, { id: 'two', jobs_enabled: false }],
    selectedPlatformCompanyId: 'one', platformJobsAccessSaving: false, COMPANIES_TABLE: 'companies',
    el: { platformJobsAccessPanel: {}, platformJobsAccess: {}, platformJobsAccessStatus: {} } };
  const query = {};
  for (const method of ['update', 'eq', 'select']) query[method] = (...args) => { calls.push([method, ...args]); return query; };
  query.single = async () => result ? await result() : { data: { id: 'one', jobs_enabled: true } };
  c.sb = { from(table) { calls.push(['from', table]); return query; } };
  vm.createContext(c); vm.runInContext(code, c);
  c.renderPlatformJobsAccess();
  return { c, calls, company };
}
test('Jobs toggle shares Billing styling and loads persisted true/false', () => {
  assert.match(html, /class="statutoryToggle" for="platformJobsAccess"/);
  assert.match(html, /class="statutoryToggle" for="companyUserBillingAccess"/);
  for (const flag of [true, false]) {
    const { c } = harness({ flag });
    assert.equal(c.el.platformJobsAccess.checked, flag);
    assert.equal(c.el.platformJobsAccess.disabled, false);
  }
  assert.match(app, /select\("id,name,slug,plan,status,created_at,logo_url,jobs_enabled"\)/);
});
test('unauthorised, signed-out and unavailable state cannot write', async () => {
  for (const options of [{ admin: false }, { user: null }, { flag: null }]) {
    const { c, calls } = harness(options);
    assert.equal(c.el.platformJobsAccess.disabled, true);
    c.el.platformJobsAccess.checked = true;
    await c.updatePlatformJobsAccess();
    assert.equal(calls.length, 0);
  }
});
test('only selected company jobs_enabled is updated with a concurrency predicate', async () => {
  const { c, calls, company } = harness();
  c.el.platformJobsAccess.checked = true;
  await c.updatePlatformJobsAccess();
  assert.deepEqual(JSON.parse(JSON.stringify(calls)), [['from', 'companies'], ['update', { jobs_enabled: true }], ['eq', 'id', 'one'], ['eq', 'jobs_enabled', false], ['select', 'id,jobs_enabled']]);
  assert.equal(company.jobs_enabled, true);
  assert.equal(company.billing_enabled, true);
  assert.equal(c.platformCompanies[1].jobs_enabled, false);
  assert.equal(c.el.platformJobsAccessStatus.textContent, 'Jobs access enabled.');
});
test('trigger rejection and unexpected response restore old value and show error', async () => {
  for (const response of [{ error: { message: 'Only a platform administrator can change Jobs entitlement' } }, { data: { id: 'two', jobs_enabled: true } }]) {
    const { c, company } = harness({ result: async () => response });
    c.el.platformJobsAccess.checked = true;
    await c.updatePlatformJobsAccess();
    assert.equal(company.jobs_enabled, false);
    assert.equal(c.el.platformJobsAccess.checked, false);
    assert.match(c.el.platformJobsAccessStatus.textContent, /Could not save/);
    assert.equal(c.el.platformJobsAccess.disabled, false);
  }
});
test('in-flight company switch cannot retarget update or display stale success', async () => {
  let finish;
  const { c, calls } = harness({ result: () => new Promise(resolve => { finish = resolve; }) });
  c.el.platformJobsAccess.checked = true;
  const save = c.updatePlatformJobsAccess();
  assert.equal(c.el.platformJobsAccess.disabled, true);
  c.selectedPlatformCompanyId = 'two'; c.renderPlatformJobsAccess();
  await c.updatePlatformJobsAccess();
  finish({ data: { id: 'one', jobs_enabled: true } }); await save;
  assert.equal(calls.filter(call => call[0] === 'update').length, 1);
  assert.equal(c.el.platformJobsAccess.checked, false);
  assert.equal(c.el.platformJobsAccessStatus.textContent, '');
});
test('disable action changes only Jobs entitlement; no-op does not write', async () => {
  const { c, calls } = harness({ flag: true, result: async () => ({ data: { id: 'one', jobs_enabled: false } }) });
  await c.updatePlatformJobsAccess(); assert.equal(calls.length, 0);
  c.el.platformJobsAccess.checked = false; await c.updatePlatformJobsAccess();
  assert.equal(c.platformCompanies[0].jobs_enabled, false);
  assert.equal(c.platformCompanies[0].billing_enabled, true);
});

test('release changes app cache key and precaches the exact HTML script URL', () => {
  const src = html.match(/<script defer src="\.\/(app\.js\?v=\d+)"/)[1];
  assert.equal(src, 'app.js?v=196');
  assert.ok(sw.includes('"/' + src + '"'));
  assert.match(sw, /CACHE_NAME = "shiftly-v226"/);
  for(const asset of ['jobs.js?v=17','jobs-data.js?v=4','jobs.css?v=16']) {
    assert.ok(sw.includes(asset));
    assert.ok(fs.readFileSync('public/login.html','utf8').includes(asset));
  }
  assert.match(sw, /url\.pathname === "\/app\.js"/); // Keep network-first operational code.
});

test('full company load reveals saved OFF, selection refreshes ON, non-admin hides', async () => {
  const { c } = harness();
  c.platformCompanies = []; c.selectedPlatformCompanyId = '';
  c.el.platformJobsAccessPanel.hidden = true; c.el.platformJobsAccess.disabled = true;
  c.renderPlatformCompanies = () => {};
  c.loadPlatformCompanyDetail = async () => {};
  c.alert = message => assert.fail(message); c.console = console;
  const selects = [];
  const rows = [{ id: 'one', jobs_enabled: false }, { id: 'two', jobs_enabled: true }];
  c.sb = { from(table) {
    assert.equal(table, 'companies');
    return { select(fields) { selects.push(fields); return this; },
      async order() { return { data: rows }; } };
  } };
  vm.runInContext(app.slice(app.indexOf('async function loadPlatformCompanies('), app.indexOf('function renderPlatformJobsAccess(')), c);
  await c.loadPlatformCompanies();
  assert.ok(selects[0].includes('jobs_enabled'));
  assert.equal(c.el.platformJobsAccessPanel.hidden, false);
  assert.equal(c.el.platformJobsAccess.disabled, false);
  assert.equal(c.el.platformJobsAccess.checked, false);
  await c.selectPlatformCompany('two');
  assert.equal(c.el.platformJobsAccess.checked, true);
  await c.selectPlatformCompany('one');
  assert.equal(c.el.platformJobsAccess.checked, false);
  c.isPlatformAdmin = false; c.renderPlatformJobsAccess();
  assert.equal(c.el.platformJobsAccessPanel.hidden, true);
  assert.equal(c.el.platformJobsAccess.disabled, true);
});
