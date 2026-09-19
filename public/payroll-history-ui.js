/* Shared local/production bridge. Backend company activation and permissions remain authoritative. */
const payrollHistory = { draft: null, edit: null, editVersion: 0, busy: false, pending: null };
const ph = window.ShiftlyPayrollHistory;
// Presentation boundary only: retain exact decimal strings for the existing save RPC.
function payrollYtdInputDecimal(value) {
  const text = String(value).trim().replace(/^R\s*/i, '');
  if (!/^-?(?:\d+|\d{1,3}(?:,\d{3})+)(?:\.\d{1,2})?$/.test(text)) throw Error('Enter a Rand amount such as R 3,381.00.');
  return ph.decimal(text.replaceAll(',', ''));
}
function payrollYtdDisplay(value) {
  const [whole, cents] = ph.money(value).split('.');
  return `R ${whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}.${cents}`;
}
function payrollHistoryEnabled() { return ph.authorityEndpoint(APP_CONFIG, window.location) !== null; }
async function payrollHistoryRpc(name, args) {
  if (!payrollHistoryEnabled()) throw Error('Payroll history is not configured.');
  const { data, error } = await sb.rpc(name, args);
  if (error) throw error;
  return data;
}
async function payrollAuthority(body) {
  const endpoint = ph.authorityEndpoint(APP_CONFIG, window.location);
  if (!endpoint) throw Error('Payroll authority is not configured.');
  const { data, error } = await sb.auth.getSession();
  if (error || !data.session) throw Error('Sign in again before running payroll.');
  const response = await fetch(endpoint, { method:'POST', redirect:'error', headers:{'Content-Type':'application/json',Authorization:`Bearer ${data.session.access_token}`}, body:JSON.stringify(body) });
  const result = await response.json();
  if (!response.ok) throw Error(result.error || 'Payroll authority unavailable.');
  return result;
}
function payrollHistoryReset() {
  payrollHistory.draft = null;
  $('btnFinalisePayroll').disabled = true;
  $('btnFinalisePayroll').classList.remove('isFinalised');
  $('payrollFinalStatus').textContent = 'Not Finalised';
}
function payrollHistoryCurrent(c, s, t, version) {
  return currentUser && canUseCompanyDashboard() && currentCompany()?.id === c.id && jobsContextVersion === version &&
    el.payrollStartDate.value === s && el.payrollEndDate.value === t;
}
function payrollHistoryDisplay(data, c, s, t, version) {
  if (!payrollHistoryCurrent(c, s, t, version)) return false;
  const rows = data.periods.map(p => ({ ...p.document_row, _payrollRules: data.run.rules_snapshot }));
  if (rows.length !== data.run.employee_count) throw Error('Incomplete saved payroll snapshot. Reprint stopped.');
  renderPayrollRows(rows);
  payrollSummaryRun = { companyId: c.id, contextVersion: version, start: s, end: t, rows: payrollRows,
    companySnapshot: data.run.company_snapshot, finalisedId: data.run.id };
  payrollHistoryReset();
  $('payrollFinalStatus').textContent = 'Finalised';
  $('btnFinalisePayroll').classList.add('isFinalised');
  return true;
}
async function payrollHistoryLoadFinal(c, s, t, version) {
  if (!payrollHistoryEnabled()) return false;
  const runVersion = payrollSummaryRunVersion;
  const data = await payrollHistoryRpc('get_payroll_history', { c: c.id, s, t });
  if (!payrollHistoryCurrent(c, s, t, version) || runVersion !== payrollSummaryRunVersion) return true;
  if (data.run) return payrollHistoryDisplay(data, c, s, t, version);
  const preview = await payrollAuthority({action:'preview',c:c.id,start:s,end:t,
    levyWeeks:isTrElectricalCompany(c) ? Number(el.payrollLevyWeeks?.value || 0) : null});
  if (!payrollHistoryCurrent(c, s, t, version) || runVersion !== payrollSummaryRunVersion) return true;
  companyPayrollRules = normalisePayrollRules(preview.rules);
  renderPayrollRows(preview.rows.map(r=>({...r,_payrollRules:preview.rules})));
  payrollSummaryRun = {companyId:c.id,contextVersion:version,start:s,end:t,rows:payrollRows,companySnapshot:preview.company};
  payrollHistory.draft = {run:payrollSummaryRun,rules:ph.clone(activePayrollRules()),token:preview.token,
    rows:ph.clone(payrollRows),rowsFingerprint:ph.stable(payrollRows),company:preview.company};
  $('btnFinalisePayroll').disabled = false;
  return true;
}
async function payrollHistoryContext(company, start, end, employeeId) {
  const data = canUseCompanyDashboard()
    ? await payrollHistoryRpc('get_payroll_history', { c: company.id, s: start, t: end })
    : { employees:[{...await payrollHistoryRpc('get_own_payroll_ytd', { c:company.id,s:start,t:end }),employee_id:employeeId}] };
  const year = ph.taxYear(end);
  // One ledger; retain the existing applicable cumulative method for takeover calculations.
  const cumulative = usesPayrollYtd(company, end) && activePayrollRules().calculate_paye;
  return { enabled: cumulative, taxYearStart: year, takeoverDate: payrollYtdTakeoverDate(company), companyName: company.name,
    standardHistory: data, byEmployee: new Map(data.employees.filter(e => !employeeId || e.employee_id === employeeId)
      .map(e => [e.employee_id, ph.context(e, cumulative, year)])),
    preserveTrContinuity: isTrElectricalCompany(company) };
}
function payrollHistoryDraftValid(draft) {
  return draft && currentPayrollSummaryRun() === draft.run && ph.stable(payrollRows) === draft.rowsFingerprint &&
    ph.stable(activePayrollRules()) === ph.stable(draft.rules);
}
async function openPayrollFinalisation() {
  const draft = payrollHistory.draft;
  $('payrollFinaliseError').textContent = '';
  $('payrollFinaliseDetails').textContent = '';
  $('payrollFinaliseModal').classList.add('show');
  $('payrollFinaliseModal').setAttribute('aria-hidden','false');
  $('btnConfirmPayrollFinalise').disabled = true;
  try {
    if (!payrollHistoryDraftValid(draft)) throw Error('Run Payroll again before finalising.');
    $('payrollFinaliseDetails').textContent = `${draft.company.name} · ${draft.run.start} to ${draft.run.end} · ${draft.rows.length} employees`;
    ph.finalisationRange(draft.run.start, draft.run.end);
    $('btnConfirmPayrollFinalise').disabled = false;
    $('btnCancelPayrollFinalise').focus();
  } catch (error) { $('payrollFinaliseError').textContent = error.message; }
}
function closePayrollFinalisation() {
  if (payrollHistory.busy || !$('payrollFinaliseModal').classList.contains('show')) return;
  $('payrollFinaliseModal').classList.remove('show');
  $('payrollFinaliseModal').setAttribute('aria-hidden','true');
  $('btnFinalisePayroll').focus();
}
async function confirmPayrollFinalisation() {
  if (payrollHistory.busy) return;
  const draft = payrollHistory.draft;
  payrollHistory.busy = true;
  $('btnConfirmPayrollFinalise').disabled = true;
  $('payrollFinaliseError').textContent = '';
  try {
    if (!payrollHistoryDraftValid(draft)) throw Error('Payroll selection changed. Run Payroll again.');
    ph.finalisationRange(draft.run.start, draft.run.end);
    // Keep the SAME request/payload after an unknown response. Database idempotency decides.
    if (!payrollHistory.pending || payrollHistory.pending.draft !== draft) {
      if (!payrollHistoryDraftValid(draft)) throw Error('Payroll selection changed.');
      payrollHistory.pending = { draft, request: crypto.randomUUID(), token:draft.token };
    }
    const pending = payrollHistory.pending;
    await payrollAuthority({ action:'finalise',c:draft.run.companyId,request:pending.request,token:pending.token });
    const data = await payrollHistoryRpc('get_payroll_history', { c: draft.run.companyId, s: draft.run.start, t: draft.run.end });
    if (!data.run) throw Error('Finalisation response received; reload to confirm its saved status.');
    payrollHistoryDisplay(data, draft.company, draft.run.start, draft.run.end, draft.run.contextVersion);
    payrollHistory.pending = null;
    payrollHistory.busy = false;
    closePayrollFinalisation();
  } catch (error) {
    $('payrollFinaliseError').textContent = `${error.message} No new request will be created on retry. You can also Run Payroll to retrieve the saved status.`;
  } finally { payrollHistory.busy = false; $('btnConfirmPayrollFinalise').disabled = false; }
}
async function payrollHistoryEmployeeForm(on) {
  const version = ++payrollHistory.editVersion;
  payrollHistory.edit = null;
  const rules = activePayrollRules();
  const enabled = payrollHistoryEnabled();
  $('employeeYtdFields').hidden = !on || !enabled || !(rules.calculate_paye || rules.calculate_uif);
  $('employeeYtdPayeLabel').hidden = !rules.calculate_paye;
  $('employeeYtdUifLabel').hidden = !rules.calculate_uif;
  if (!on || !enabled) return;
  const company = currentCompany(); const ctx = jobsContextVersion;
  const employeeId = editingEmployeeId || '';
  const year = ph.taxYear(localDateInputValue(new Date()));
  $('employeeYtdYear').textContent = `${year.slice(0,4)}/${String(Number(year.slice(0,4)) + 1).slice(-2)}`;
  $('employeeYtdMessage').textContent = 'Loading…';
  $('employeeYtdPaye').disabled = $('employeeYtdUif').disabled = true;
  try {
    const data = await payrollHistoryRpc('get_employee_payroll_ytd', { c: company.id, e: employeeId, y: year });
    if (version !== payrollHistory.editVersion || company.id !== currentCompany()?.id || ctx !== jobsContextVersion) return;
    $('employeeYtdPaye').value = payrollYtdDisplay(data.paye);
    $('employeeYtdUif').value = payrollYtdDisplay(data.uif);
    $('employeeYtdReason').value = '';
    payrollHistory.edit = { companyId: company.id, ctx, employeeId, data, year, request: crypto.randomUUID() };
    $('employeeYtdMessage').textContent = 'ⓘ Changes are recorded in payroll audit history.';
    $('employeeYtdPaye').disabled = $('employeeYtdUif').disabled = false;
  } catch (error) { $('employeeYtdMessage').textContent = error.message; }
}
async function payrollHistorySaveEmployee(payload, isEditing) {
  try {
    const edit = payrollHistory.edit;
    if (!edit || edit.companyId !== currentCompany()?.id || edit.ctx !== jobsContextVersion || (isEditing && edit.employeeId !== editingEmployeeId)) throw Error('Reopen the employee to load current YTD before saving.');
    if (edit.year !== ph.taxYear(localDateInputValue(new Date()))) throw Error('Tax year changed. Reopen the employee.');
    const rules = activePayrollRules(); const targets = { reason: $('employeeYtdReason').value.trim() };
    if (rules.calculate_paye) {
      const value = payrollYtdInputDecimal($('employeeYtdPaye').value);
      if (value !== ph.decimal(edit.data.paye) || !edit.data.paye_supplied) targets.paye = value;
    }
    if (rules.calculate_uif) {
      const value = payrollYtdInputDecimal($('employeeYtdUif').value);
      if (value !== ph.decimal(edit.data.uif) || !edit.data.uif_supplied) targets.uif = value;
    }
    await payrollHistoryRpc('save_employee_with_ytd', { c: payload.company_id, e: payload.employee_id, is_new: !isEditing,
      details: payload, targets, expected_revision: edit.data.revision, request: edit.request });
    return { error: null };
  } catch (error) { return { error }; }
}
$('btnFinalisePayroll').addEventListener('click', openPayrollFinalisation);
for (const id of ['employeeYtdPaye','employeeYtdUif']) {
  $(id).addEventListener('focus', () => {
    try { $(id).value = payrollYtdInputDecimal($(id).value); } catch (_) { /* Preserve invalid input for correction. */ }
  });
  $(id).addEventListener('blur', () => {
    try { $(id).value = payrollYtdDisplay(payrollYtdInputDecimal($(id).value)); } catch (_) { /* Save reports the validation error. */ }
  });
}
$('btnCancelPayrollFinalise').addEventListener('click', closePayrollFinalisation);
$('btnConfirmPayrollFinalise').addEventListener('click', confirmPayrollFinalisation);
document.addEventListener('keydown', event => { if (event.key === 'Escape') closePayrollFinalisation(); });
for (const id of ['payrollStartDate','payrollEndDate','payrollLevyWeeks']) $(id)?.addEventListener('change', payrollHistoryReset);
window.addEventListener('shiftly:company-context', () => {
  payrollHistoryReset(); payrollHistory.editVersion++; payrollHistory.edit=null; payrollHistory.pending=null;
  $('payrollFinaliseModal').classList.remove('show');
  $('payrollFinaliseModal').setAttribute('aria-hidden','true');
});
