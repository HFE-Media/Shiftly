const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync('public/app.js', 'utf8');

function fixture() {
  const context = {
    currentUser: { id: 'user-a' }, jobsContextVersion: 1,
    currentCompany: () => ({ id: 'company-a', name: 'Demo Services' }),
    canUseCompanyDashboard: () => true,
    sharedPayrollEngine: () => require('../public/payroll-engine.js').create(),
    payrollSummaryBusy: false, payrollSummaryRun: null, payrollRows: [],
    moneyNumber: value => Number(value || 0),
    el: { payrollStartDate: { value: '2026-09-01' }, payrollEndDate: { value: '2026-09-07' },
      btnGeneratePayslip: { disabled: false, textContent: 'Generate Summary' },
      payslipEmployeeSelect: { value: '__summary__' }, payslipModalSub: {} },
    alerts: [], alert: message => context.alerts.push(message), saves: [],
    loadBillingPdfEngine: async () => ({ createPayrollSummaryPdf: model => ({ save: async name => context.saves.push({ model, name }) }) })
  };
  context.escapeHtml = value => String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  context.formatPayslipDate = value => value;
  context.usesPayrollYtd = () => false;
  context.closePayslipModal = () => {};
  context.window = { open: () => ({ document: { open() {}, write(html) { context.saves.push(html); }, close() {} }, close() {} }) };
  vm.createContext(context);
  vm.runInContext(source.slice(source.indexOf('function normaliseDeduction('), source.indexOf('function normaliseDeductionType(')), context);
  vm.runInContext(source.slice(source.indexOf('function buildPayrollSummaryModel('), source.indexOf('async function generateSelectedPayslip(')), context);
  vm.runInContext(source.slice(source.indexOf('function buildPayrollSummaryPage('), source.indexOf('async function generateEmployeeDashboardPayslip(')), context);
  vm.runInContext(source.slice(source.indexOf('function updatePayslipSelection('), source.indexOf('function closePayslipModal(')), context);
  context.payrollRows = [{ employee_id: 'E001', employee_name: 'Sérgio Example', gross: 1234.56,
    deductions: [{ amount: 34.56 }, { amount: 999, active: false }] }];
  context.payrollSummaryRun = { companyId: 'company-a', contextVersion: 1, start: '2026-09-01', end: '2026-09-07', rows: context.payrollRows };
  return context;
}

test('summary matches payslip active deductions, net floor, and rounded row totals', () => {
  const c = fixture();
  const rows = [...c.payrollRows, { employee_id: 'E002', gross: 10, deductions: [{ amount: 15 }] },
    { employee_id: 'E003', gross: 0.104, deductions: [] }];
  const model = c.buildPayrollSummaryModel({ name: 'Demo / Unsafe: name' }, rows, c.payrollSummaryRun);
  assert.equal(model.employees[0].gross, 123456);
  assert.equal(model.employees[0].deductions, 3456);
  assert.equal(model.employees[0].net, 120000);
  assert.equal(model.employees[1].net, 0);
  assert.equal(model.totals.gross, 124466);
  assert.equal(model.totals.deductions, 4956);
  assert.equal(model.totals.net, 120010);
  assert(!/[<>:"/\\|?*]/.test(model.filename));
  assert.throws(() => c.buildPayrollSummaryModel({}, [{ gross: Infinity }], c.payrollSummaryRun), /invalid amount/);
});

test('summary download uses all run employees and performs no finalisation', async () => {
  const c = fixture();
  c.el.payslipEmployeeSelect = { value: 'not-selected-for-summary' };
  c.sb = new Proxy({}, { get: () => { throw new Error('Database access prohibited'); } });
  c.savePayrollPeriodTotals = () => { throw new Error('Finalisation prohibited'); };
  c.generatePayrollSummary();
  assert.equal(c.saves.length, 1);
  assert.match(c.saves[0], /Sérgio Example/);
  assert.match(c.saves[0], /2026-09-01 to 2026-09-07/);
  assert.match(c.saves[0], /Print \/ Save PDF/);
  assert.equal(c.el.btnGeneratePayslip.disabled, false);
});

test('stale dates, company, role, session and replaced rows cannot export', async () => {
  const changes = [c => c.el.payrollStartDate.value = '2026-09-02',
    c => c.currentCompany = () => ({ id: 'company-b' }), c => c.canUseCompanyDashboard = () => false,
    c => c.currentUser = null, c => c.jobsContextVersion++, c => c.payrollRows = [], c => c.payrollSummaryRun = null];
  for (const change of changes) {
    const c = fixture(); change(c); c.generatePayrollSummary();
    assert.equal(c.saves.length, 0); assert.equal(c.alerts.length, 1);
  }
});

test('single dropdown action changes labels and blocked popups recover', () => {
  const c = fixture();
  c.updatePayslipSelection();
  assert.equal(c.el.btnGeneratePayslip.textContent, 'Generate Summary');
  c.el.payslipEmployeeSelect.value = '__all__'; c.updatePayslipSelection();
  assert.equal(c.el.btnGeneratePayslip.textContent, 'Generate Payslip');
  c.usesPayrollYtd = () => true; c.updatePayslipSelection();
  assert.equal(c.el.btnGeneratePayslip.textContent, 'Generate Payslip');
  c.el.payslipEmployeeSelect.value = '__summary__'; c.updatePayslipSelection();
  assert.equal(c.el.btnGeneratePayslip.textContent, 'Generate Summary');
  c.window.open = () => null; c.generatePayrollSummary();
  assert.match(c.alerts[0], /Allow popups/);
  assert.equal(c.payrollSummaryBusy, false);
  assert.equal(c.saves.length, 0);
  const html = fs.readFileSync('public/login.html', 'utf8');
  assert(!html.includes('btnDownloadPayrollSummary'));
  assert(source.includes('<option value="__summary__">Summary</option>'));
  assert(source.includes('if (employeeId === "__summary__") return generatePayrollSummary();'));
});

test('single and multi-page PDF contains every employee, repeated headings and totals once', async () => {
  const engineContext = { console, Uint8Array, ArrayBuffer, TextEncoder, TextDecoder, setTimeout, clearTimeout,
    btoa: value => Buffer.from(value, 'binary').toString('base64'), atob: value => Buffer.from(value, 'base64').toString('binary') };
  vm.createContext(engineContext);
  vm.runInContext(fs.readFileSync('public/vendor/billing-pdf.js', 'utf8'), engineContext);
  const { getDocument } = await import('pdfjs-dist/legacy/build/pdf.mjs');
  fs.mkdirSync('tmp/pdfs', { recursive: true });
  for (const count of [8, 90]) {
    const c = fixture();
    const rows = Array.from({ length: count }, (_, i) => ({ ...c.payrollRows[0], employee_id: `EMP-${String(i + 1).padStart(3, '0')}`,
      employee_name: i === 1 ? 'Alexandra Example With A Particularly Long Double-Barrelled Surname' : `Employee Example ${i + 1}` }));
    const model = c.buildPayrollSummaryModel(c.currentCompany(), rows, c.payrollSummaryRun);
    const pdf = engineContext.ShiftlyBillingPdf.createPayrollSummaryPdf(model);
    const bytes = new Uint8Array(pdf.output('arraybuffer'));
    fs.writeFileSync(`tmp/pdfs/payroll-summary-${count}.pdf`, bytes);
    const task = getDocument({ data: bytes, useSystemFonts: true });
    const doc = await task.promise;
    assert.equal(count === 8 ? doc.numPages === 1 : doc.numPages > 1, true);
    let content = '';
    for (let page = 1; page <= doc.numPages; page++) {
      const p = await doc.getPage(page);
      const text = (await p.getTextContent()).items.map(i => i.str).join(' ');
      assert.match(text, /Employee no\./);
      assert(text.includes(`Page ${page} of ${doc.numPages}`));
      content += text;
    }
    for (const row of rows) assert(content.includes(row.employee_id), row.employee_id);
    assert.equal((content.match(/TOTAL/g) || []).length, 1);
    await task.destroy();
  }
});
