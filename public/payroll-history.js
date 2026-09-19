/* Payroll history contracts. No credentials, implicit writes, or company-specific money rules. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.ShiftlyPayrollHistory = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const VERSION = 'payroll-snapshot-1';
  function date(value) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value))) throw Error('Invalid payroll date.');
    const d = new Date(value + 'T00:00:00Z');
    if (!Number.isFinite(d.getTime()) || d.toISOString().slice(0, 10) !== value) throw Error('Invalid payroll date.');
    return value;
  }
  function taxYear(value) {
    date(value);
    const [y, m] = value.split('-').map(Number);
    return `${m >= 3 ? y : y - 1}-03-01`;
  }
  function finalisationRange(start, end) {
    date(start); date(end);
    if (start > end) throw Error('Payroll start must be before its end.');
    if (taxYear(start) !== taxYear(end)) throw Error('A payroll spanning two tax years cannot currently be finalised. Choose a period within a single tax year.');
    return taxYear(end);
  }
  // User-entered values are decimal strings, not parseFloat (which accepts trailing junk).
  function decimal(value) {
    const raw = String(value).trim();
    if (!/^\d{1,12}(?:\.\d{1,2})?$/.test(raw)) throw Error('Enter a non-negative amount with at most two decimal places.');
    const [whole, fraction = ''] = raw.split('.');
    return `${BigInt(whole)}.${fraction.padEnd(2, '0')}`;
  }
  function money(value) {
    const n = Number(value);
    if (!Number.isFinite(n) || n < 0 || n >= 1e12) throw Error('Invalid payroll amount.');
    return decimal(n.toFixed(2));
  }
  function stable(value) {
    if (Array.isArray(value)) return '[' + value.map(stable).join(',') + ']';
    if (value && typeof value === 'object') return '{' + Object.keys(value).sort().map(k => JSON.stringify(k) + ':' + stable(value[k])).join(',') + '}';
    return JSON.stringify(value);
  }
  function clone(value) { return JSON.parse(JSON.stringify(value)); }
  function employeeSnapshot(row, rules) {
    const snapshot = clone(row);
    snapshot.deductions = (snapshot.deductions || []).filter(d => d.active !== false);
    money(snapshot.gross || 0);
    snapshot.deductions.forEach(d => money(d.amount || 0));
    const sum = label => money(snapshot.deductions.filter(d => String(d.description || '').toLowerCase() === label)
      .reduce((n, d) => n + Number(d.amount), 0));
    return {
      employee_id: String(row.employee_id), gross_remuneration: money(snapshot.gross || 0),
      retirement_fund_contributions: sum('provident'),
      paye_deducted: rules.calculate_paye ? sum('tax') : '0.00',
      employee_uif: rules.calculate_uif ? sum('uif') : '0.00',
      ...(row.employer_uif !== undefined ? {employer_uif:money(row.employer_uif),uif_liable_remuneration:money(row.uif_liable_remuneration)} : {}),
      document_row: snapshot
    };
  }
  function context(record, cumulative, year) {
    return { enabled: !!cumulative, hasOpening: !!record?.has_opening, taxYearStart: year,
      asOfDate: record?.as_of_date || '', completedPeriods: Number(record?.completed_periods || 0),
      finalizedPeriods: Number(record?.finalized_periods || 0), previousGross: Number(record?.gross || 0),
      previousRetirement: Number(record?.retirement || 0), previousPaye: Number(record?.paye || 0),
      previousUif: Number(record?.uif || 0) };
  }
  function localBackend(config, location) {
    // Local client construction must never admit a hosted backend.
    try { return config?.PAYROLL_HISTORY_LOCAL === true &&
      ['localhost', '127.0.0.1', '[::1]'].includes(location.hostname) &&
      ['localhost', '127.0.0.1', '[::1]'].includes(new URL(config.SUPABASE_URL).hostname); }
    catch (_) { return false; }
  }
  function authorityEndpoint(config, location) {
    const local = config?.PAYROLL_HISTORY_LOCAL === true;
    const production = config?.PAYROLL_HISTORY_ENABLED === true;
    if (!local && !production) return null;
    const invalid = () => { throw Error('Invalid payroll configuration. Local testing and the trusted production authority must remain isolated.'); };
    try {
      const page = new URL(location.href);
      const backend = new URL(config.SUPABASE_URL);
      const loopback = host => ['localhost', '127.0.0.1', '[::1]'].includes(host);
      const clean = url => !url.username && !url.password && !url.search && !url.hash;
      if (local) {
        if (production || !localBackend(config, location) || !['http:', 'https:'].includes(page.protocol) ||
            !['http:', 'https:'].includes(backend.protocol) || !clean(backend)) return invalid();
        const endpoint = new URL(config.PAYROLL_AUTHORITY_URL || '/payroll-authority', page);
        if (!loopback(endpoint.hostname) || !['http:', 'https:'].includes(endpoint.protocol) || !clean(endpoint)) return invalid();
        return endpoint.href;
      }
      if (page.protocol !== 'https:' || loopback(page.hostname) ||
          backend.protocol !== 'https:' || !/^[a-z0-9-]+\.supabase\.co$/.test(backend.hostname) ||
          backend.port || backend.pathname !== '/' || !clean(backend)) return invalid();
      // Only deployer-owned config is read; no query-string/storage endpoint overrides.
      const expected = backend.origin + '/functions/v1/payroll-authority';
      if (config.PAYROLL_AUTHORITY_URL !== expected) return invalid();
      return expected;
    } catch (_) { return invalid(); }
  }
  return Object.freeze({ VERSION, date, taxYear, finalisationRange, decimal, money, stable, clone, employeeSnapshot, context, localBackend, authorityEndpoint });
});
