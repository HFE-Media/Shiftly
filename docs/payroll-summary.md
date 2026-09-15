# Payroll summary PDF

In Payroll, run the selected period, open the payslip popup and choose **Summary** in the existing employee dropdown. The single existing button changes to **Generate Summary**. It opens the same preview shell as payslips, with **Print / Save PDF** and **Close**. Selecting employees restores the normal payslip action. There is no extra summary button.

The A4 document shows company, period, employee number/name, gross pay, active deductions and net pay, with totals summing the displayed employee amounts. Larger runs continue with repeated column headings and page numbers. It uses the existing payslip earnings/deduction semantics, including the zero floor on net pay; no tax or payroll rules are recalculated.

Generation is client-side and does not finalise payroll, save period totals, upload data or change payroll records. A completed payroll run must match current company, dates, authenticated context and rows. A new/failed run or changed dates invalidates the export. Existing individual-payslip finalisation is unchanged; summary finalisation was not explicitly approved.

Current preview implementation: public/app.js and public/login.html, reusing the payslip HTML preview shell and browser printing. The earlier direct-PDF helper remains in src/billing-pdf.js and its generated bundle but is not called by the dropdown action. No dependency, database or entitlement changes are required.

Released 12 September 2026 on explicit user request to Firebase Hosting project shiftly-21919. Live custom-domain login, app.js v197, service worker shiftly-v242 and PDF bundle v2 matched local files (line endings normalized). All 111 tests passed. No database operations, Git commit, merge or push were performed; release source remains uncommitted in the development worktree. Summary is the first/default dropdown option.

Checks: `node --test tests/payroll-summary.test.cjs` covers amounts, inactive deductions, all-employee preview, no database writes, stale context, dropdown labels, popup blocking and the retained direct-PDF helper's single/multi-page output. Browser print pagination still needs user review. Synthetic QA PDFs are generated in ignored tmp/pdfs; no live payroll data is needed. Coordinate app/HTML/service-worker release versions before an explicitly authorized deployment.
