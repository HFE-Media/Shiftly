# Shiftly — Codex account-migration handover

Prepared 11 September 2026 (Africa/Johannesburg). Documentation-only migration snapshot. Read `AGENTS.md` first. This document is context, not authorization to execute any operational command, migration or deployment.

## 1. Purpose and evidence conventions

The next Codex account will open the same local repository without the old conversation. This file transfers the architecture, current implementation, limitations, decisions and safety boundaries. It deliberately does not embed credentials or private employee/customer records.

Evidence labels used below:

- **VERIFIED CURRENT CODE**: inspected tracked source at the snapshot; does not prove deployed behavior.
- **VERIFIED GIT HISTORY**: local commit/worktree evidence; cached remote refs are not a fresh remote query.
- **VERIFIED DATABASE / MIGRATION**: checked SQL definitions or recorded offline execution, not fresh production schema verification.
- **HISTORICAL CODEX CONTEXT**: prior user/assistant discussion or checkpoint report, identified as historical.
- **CURRENT WIP**: actual uncommitted work or explicitly incomplete implementation, distinguished below.
- **COMMITTED NOT CONFIRMED DEPLOYED**: Git evidence without matching deployment evidence.
- **PRODUCTION / LIVE**: only the specific historical deployed-asset checks described, not an all-module E2E certification.
- **PLANNED / PROPOSED**, **REJECTED / ABANDONED**, **UNKNOWN / NEEDS VERIFICATION**: do not silently upgrade these into implemented features.

Source precedence: inspect current source plus Git diffs for implementation; use applied database evidence for runtime schema; use history for intent. A newer chat request may supersede old intent but cannot prove code was changed. Old runbooks are time-specific.

## 2. Executive overview

Shiftly is a multi-company workforce web platform with attendance, employee/site administration, payroll/payslips, separate Billing and the recently stabilized Jobs module. Marketing is separate from the authenticated operational entry point. The repository is a static application with a large vanilla JavaScript host, not a modern component-framework project.

The Jobs UI/workflow is accepted by the user at this checkpoint. Core live adapter code exists for planning, execution, materials and review. Three recorded next-phase items remain: photos, client signatures, Testing & Results entry. Jobs PDF is browser printing, unlike Billing's direct generated PDF.

The migration began with a clean working tree at `cd5b860`. No application WIP was found. The only migration deliverables are this file and `AGENTS.md`, intentionally left uncommitted. Nothing is pushed, merged, deployed or applied to Supabase.

## 3. Product and business context

**VERIFIED CURRENT CODE / HISTORICAL CODEX CONTEXT.** Shiftly targets companies managing field/site employees, supervisor-led clocking, payroll and service jobs. The product uses a compact premium black/gold interface and South African date/time, VAT and payroll conventions. Company-specific rules exist for named customer companies; do not generalize one customer's rules to every tenant.

Operational Billing manages a company's customer quotes/invoices/payments. Public Billing marketing describes the product. Neither proves a subscription checkout/payment-gateway integration for purchasing Shiftly itself. Marketing claims are not implementation evidence.

## 4. Exact migration snapshot

| Item | Verified local value |
| --- | --- |
| Repository root | `C:/dev/Final/Swiftly - Copy` |
| Branch | `feature/shiftly-jobs` |
| HEAD | `cd5b860d6db356060ae3689f0c08fe65241ca8ab` |
| HEAD subject | docs: finalize Jobs repository audit and harden local secret ignores |
| Upstream of current branch | None shown/configured in branch listing |
| Original staged / unstaged / untracked | None; clean |
| Stashes | None |
| Remote | `origin`, `https://github.com/HFE-Media/Shiftly.git` |
| Local main / cached origin/main | `b1e984488d7f608ca8c817e568f5c1df50500d91` |
| Main worktree | `C:/dev/Final/Shiftly Marketing Launch` |
| Other local branch | `feature/shiftly-marketing-site` at `48f88db` |
| Last application commit | `c518ac3bd2a8cd9d8b1a46c4966e950af93512fc` |

No fetch was run. The feature checkpoint is one commit ahead of locally cached main; that commit is audit documentation and `.gitignore` hardening. Current files include all committed Jobs work. A fresh remote-only clone cannot be assumed to contain `cd5b860` or these two uncommitted migration documents. Transfer the local repository and both files securely; pushing is a separate user decision.

## 5. Production / stable / unfinished matrix

| Area | Current evidence and qualification |
| --- | --- |
| Marketing and operational login separation | Current source and Git; historically deployed |
| Auth, companies, attendance, payroll, Billing | Substantial current implementation; not freshly authenticated E2E tested in migration |
| Core Jobs | Current source, 106 tests across five suites and historical user acceptance/deployed assets |
| Jobs materials | Live adapter/UI implemented; historical user confirmed working |
| Jobs photos/signatures/results | Incomplete live capture; scaffolding/fixtures must not be mistaken for live support |
| Jobs PDF | Working HTML/print route; no dedicated direct PDF generator |
| PWA | Manifest/SW source; no fresh installation/offline/device certification |
| Expo/native app | No tracked Expo app found in this repository |
| Universal 19:30 auto-close | Not established; source instead contains company-specific schedules |
| Migration documents | New local uncommitted files only |

“Stable” here means an existing module being preserved, not a guarantee of zero defects or legal/compliance correctness.

## 6. Technology stack

**VERIFIED CURRENT CODE.** Static HTML, CSS and browser JavaScript; Supabase Auth/PostgREST/RPC/Storage; PostgreSQL RLS and PL/pgSQL; Firebase Hosting; alternate Vercel static routing. Node supports local serving/tests/build tooling. Supabase invite function is TypeScript for Deno.

`package.json` is `shiftly-static-app`, private. Dev dependencies: esbuild 0.28.2, jsPDF 4.2.1, jspdf-autotable 5.0.8, linkedom 0.18.13 and pdfjs-dist 6.2.108. Browser libraries include QR scanning, face-api models and mapping; inspect script tags before changing CDN versions. No repository-wide TypeScript project, React, Next.js or Tailwind application was found.

## 7. Repository structure

| Location | Responsibility |
| --- | --- |
| `public/index.html`, `marketing.*`, assets | Workforce marketing |
| `public/billing.html`, `billing.css` | Public Billing marketing |
| `public/login.html`, `app.js` | Auth and operational host; app.js is roughly 8,800 lines |
| `public/jobs.js`, `jobs-data.js`, `jobs.css` | Jobs UI, adapters/domain normalization, styles |
| `public/config.js` | Public browser configuration; do not copy key values |
| `public/service-worker.js`, `manifest.json`, icons | PWA shell and caching |
| `src/billing-pdf.js`, `public/vendor/` | PDF source and intentional generated deployment assets/licenses |
| `database/` | Historical setup, compatibility, policies and data scripts |
| `supabase/migrations/` | Dated Billing, payroll, auto-close, corrections and Jobs SQL |
| `supabase/functions/invite-company-user/` | Only tracked Edge function |
| `tests/` | Five unit/static suites plus deliberate DB/preview harnesses |
| `scripts/` | PDF build/preview and guarded staging wrapper |
| `docs/` | Jobs checkpoints/runbooks and Billing PDF context |
| Root hosting files / `.github/workflows/` | Firebase/Vercel configuration and legacy PR preview |

Ignored runtime caches, local environment files and `tmp/` are not source. Tracked `Clocking System.code-workspace` contains a harmless relative folder entry; it was retained. Do not delete test harnesses merely because their names include preview/test.

## 8. Architecture and data flow

Browser `/login` loads config, host app and versioned Jobs assets. Supabase Auth establishes identity; company memberships establish selected company/role/employee link. Host navigation opens operational modules. Jobs consumes host context rather than owning another auth session.

Most older operational modules read/write through `app.js` using Supabase tables and selected RPCs. Jobs instead has an explicit adapter boundary with scoped read methods and a capability-limited mutation facade. Billing PDF rendering is local document generation separate from Billing persistence.

The static host is not a trusted authorization layer. PostgreSQL policies, constraints and RPC checks are the enforcement boundary. Changing a frontend button cannot replace backend authorization.

## 9. Multi-tenancy

**VERIFIED CURRENT CODE / VERIFIED DATABASE / MIGRATION.** `companies` and `company_users` anchor tenant membership. Membership contains user ID, company ID, role, active flag, optional employee link and Billing access. Company status must be active for ordinary access loading. Employee/site identifiers are scoped to company; code strings can recur between tenants.

`loadCompanyAccess`, `setCurrentCompany`, `switchCompany`, `switchCompanyAdmin` and Jobs context-version checks are important. Switching clears queued clocking/site selection and invalidates Jobs async work. Every new query/mutation must keep tenant context, including child resources, directory entries, Storage paths and completed snapshots.

Older SQL scripts represent different schema generations. Do not infer the complete live relationship graph simply by concatenating them.

## 10. Authentication

`app.js`: `signIn`, `signOut`, `routeCurrentUser`, `completePasswordSetup`, `sendPasswordReset`, `checkPlatformAdmin`, `loadCompanyAccess`. Supabase Auth supplies sessions; invitation/password setup is integrated into the operational route. Inspect callbacks/redirects when changing `/login` or hosting rewrites.

`invite-company-user` validates the request JWT with server credentials and requires active platform-admin membership before invitation/account linking. It uses environment configuration for the site redirect. Do not expose service-role credentials to the browser.

An authenticated user without active usable company membership is not automatically a company administrator. A platform administrator is not implicitly a Jobs actor for every company.

## 11. Roles and authorization

| Capability | Current host/UI gate |
| --- | --- |
| Company dashboard | owner or admin |
| Clocking | owner, admin or supervisor |
| Team status | supervisor |
| Personal employee dashboard | linked employee ID |
| Billing | owner/admin AND company billing_enabled AND membership billing_access |
| Jobs management | enabled active company and authorized owner/admin |
| Jobs supervisor execution | active supervisor membership, active linked employee and assignment |
| Jobs employee/billing/viewer | No ordinary live Jobs entry/content permission |
| Platform controls | active platform_admins membership; separate from tenant role |

Invite payload accepts role names including billing and viewer, but this does not override the narrower current Billing gate. Confirm backend policy alongside UI for any role change.

## 12. Company management

Platform dashboard manages companies and access controls. `companies` includes name, plan, status, logo URL, Billing entitlement and Jobs entitlement. `company_users` stores membership and user links. Company admin views handle employees, supervisors, sites, payroll and associated settings.

Jobs Access toggle updates only `jobs_enabled` for the selected company, using a concurrency predicate and restoring old UI on failure. SQL entitlement trigger guards updates. Disabling Jobs preserves its data and blocks access. Do not enable a tenant as a side effect of installing code or running an audit.

## 13. Employee management

`saveEmployee`, employee editing, personal/payroll settings, rate configuration, QR identity and face enrollment are in `app.js`. SQL under `database/` adds payroll/personal fields and company-scoped IDs. Employee links in company membership are significant for self-service and Jobs authorization.

Employee codes/QRs and supervisor legacy codes are not authentication credentials equivalent to a JWT. Deactivation and reassignment can affect open work and historical access; preserve history, do not silently remove records or close sessions.

### Facial recognition and biometric storage

**VERIFIED CURRENT CODE / VERIFIED DATABASE / MIGRATION.** `enrollEmployeeFace` captures a reference image, detects a descriptor, uploads to private `employee-faces` at a company/employee path and stores `face_photo_path`, `face_enrolled_at` and `face_descriptor` on the employee. `face_photo_url` is cleared. `removeEmployeeFace` removes the object and clears enrollment metadata. Storage upload and employee update are separate operations, so partial-failure behavior matters.

`ensureFaceModels` loads tiny-face detector, landmarks and recognition models from the configured face-api CDN. `loadFaceRoster` fetches company-scoped descriptors and filters inactive employees. `bestFaceMatch` uses Euclidean distance with threshold 0.48; matching adds to the attendance queue rather than independently writing a clock entry. The scan interval constant is 900ms. Models, camera permission and network availability affect operation.

`database/employee-face-enrollment.sql` defines a private 5MB JPEG/PNG/WebP bucket, company-member reads and owner/admin mutations scoped by the first path segment. Do not publish this bucket or reuse it for Jobs photos. No fresh live bucket verification, biometric liveness/anti-spoofing certification or consent/retention audit was performed. Existing face enrollment is distinct from unfinished Jobs evidence photos.

## 14. Sites and geofence data

Sites contain company-scoped `site_id`, name, latitude/longitude, radius and active status. `loadSites`, `saveSite`, map initialization/circle update and `saveNewSite` implement management. Database alignment scripts change site key shapes; inspect exact deployed schema before new migrations.

Site selection matters to attendance submission. A Job service address/site description is not automatically a geofence or attendance site identifier. Do not couple them without an explicit design.

## 15. Attendance data model

Source contains both `clock_events` and `time_entries` schema generations. `database/align-company-time-entries.sql` explicitly directs `clock_batch` to `time_entries`; the current host also reads/edits `clock_events`, and auto-close processors account for existing representations. **UNKNOWN / NEEDS VERIFICATION:** actual deployed tables/views/synchronization and migration ordering. Do not replace one with the other based solely on a historical comment.

Attendance records carry action IN/OUT, employee/site/company context, timestamp, GPS accuracy/distance, result OK/BLOCKED, message and supervisor metadata. Stored names support historical reporting. Approved events, not every attempted scan, drive payroll. Jobs has entirely separate time tables.

## 16. Clock-in / clock-out workflow

Supervisor selects site, supplies supervisor code, chooses IN/OUT mode and queues employees. `submitBatch` requires auth/company/site/code/nonempty queue, obtains fresh GPS and rejects accuracy worse than 50m. It calls PostgreSQL RPC `clock_batch` with company, action, supervisor code, site, coordinates, accuracy and employee IDs.

The inspected SQL validates active membership/role, active company-scoped site, active supervisor code and employee; computes distance; rejects outside radius or poor accuracy; detects already-IN/not-IN states; writes result/history and returns per-employee outcomes. Current deployed function definition was not fetched.

The UI summarizes success/skipped/errors and clears the queue. Browser camera permission and GPS are prerequisites. It is not verified durable offline clocking.

## 17. QR scanning

`onScanSuccess` uppercases/trims the scanned employee code, suppresses repeated scans briefly, checks the current company's employee record and adds to a deduplicated queue. Repeated lookup failure opens guidance. `startScanning` tries rear-camera constraints and falls back; permissions must be available. QR identity creation/viewing is in `openEmployeeQr`.

QR attendance is not a customer Job PIN. Never introduce a public unauthenticated write based only on an employee QR.

## 18. Supervisor batch operation

`queue`, scanner mode, current company/site, IN/OUT mode and supervisor code form the batch state. Company switches clear queue/site context. A face match also adds an employee to this same attendance queue. Submission is one RPC returning per-employee results, not one UI mutation per camera frame.

Check duplicate handling, inactive employees, mixed results, stale company selection and network uncertainty before changing this path. Jobs' independent session protections should not be weakened to mimic attendance semantics.

## 19. GPS and geofence enforcement

Frontend location options: high accuracy, 15-second timeout, no cached position; `MAX_GPS_ACCURACY_M=50`. The inspected clock RPC independently checks accuracy and distance against site radius. Client GPS is an input, not cryptographic proof of physical presence.

Migration review did not perform spoofing, device, location-permission or production enforcement testing. Do not report geofencing as newly security-certified. Keep server validation when improving mobile error UI.

## 20. Attendance corrections / approvals

`openEventTimeEditor` and `saveEventTime` distinguish ordinary date/time editing from TR Electrical correction. Ordinary path updates a company-scoped `clock_events` timestamp. TR path invokes `correct_tr_electrical_clock_event` with time/site and explicit blocked-entry approval flag.

For TR, a blocked entry requires the approval checkbox before the UI proceeds; source copy says payroll must not use it until approved. SQL: `database/company-admin-clock-event-time-edit.sql` and migration `20260812100000_tr_clock_event_site_corrections.sql`. This is not evidence of a generalized approval engine for all companies.

## 21. Automatic clock-out and session cleanup

**VERIFIED DATABASE / MIGRATION, NOT FRESH LIVE CRON VERIFICATION.** No universal 19:30 behavior was established. Checked SQL instead defines company rules in `company_auto_clock_out_rules` and audit records in `company_auto_clock_out_audit`:

| Rule in repository | Recorded OUT / review threshold |
| --- | --- |
| MCK Power day rule | 17:00 / 19:00 |
| MCK Power night rule | 06:00 / 06:30, night starts 17:00 |
| TR Electrical | 17:00 / 20:00 |
| PVS Construction and Waterproofing | 17:00 / 23:59 |

Timezone is Africa/Johannesburg. Initial and night processors schedule five-minute cron polling. August fixes address older unresolved IN records and late-shift handling; later shared processor definitions supersede earlier versions. These migrations contain immediate processor calls/data changes. Applied rules, enabled cron jobs, current server time and actual records are unknown without separately authorized database inspection.

Do not apply this attendance auto-close to Jobs. Jobs intentionally blocks submit/complete/cancel on open sessions and provides explicit manager emergency closure; it does not silently end sessions on date rollover.

## 22. Leave

**VERIFIED CURRENT CODE:** Paid Leave exists as a payroll adjustment type using normal-hours semantics. **UNKNOWN / NOT FOUND AS A COMPLETE MODULE:** leave request submission, balances/accrual, supervisor approval and leave calendar workflow. Do not describe the payroll adjustment as full leave management or implement a new module during handover.

## 23. Payroll

`app.js` owns payroll calculations and reporting. Important functions include `normalisePayrollRules`, shift splitting, `buildShiftPartsForPayroll`, `buildPayrollBreakdown`, `calculatePayroll`, `calculateAnnualTax2027`, `calculateCumulativePaye` and statutory deduction/YTD functions. Company payroll rules, employee rates/pay types, deductions and adjustments feed results.

There are hourly/daily/monthly handling paths, normal/overtime splitting and company-specific Mixocron/TR/PVS behavior. TR has versioned NBCEI/levy membership data, SAEWA handling and company-specific deductions. YTD takeover/opening balances and stored period totals protect continuity. SQL includes named-company backfills and rate/membership data; do not replay them globally.

Code contains a `SA_PAYE_2027` bracket/rebate table, UIF and cumulative calculations. This documents implementation, not a fresh verification of tax law or statutory compliance. No statutory web research or financial certification was performed. Future financial changes require current authoritative requirements and appropriate regression cases.

## 24. Payslips

`generateSelectedPayslip` opens a popup, calls `savePayrollPeriodTotals`, then writes the payslip document. **This is not a read-only preview action.** Personal employee dashboard payslip access and company/all-employee generation exist. `buildPayslipDocument`/page layout are separate from Billing's PDF engine.

Popup permissions and browser print behavior matter. Do not mistake displayed calculations for finalized payroll without checking the period-save path and continuity rules. Confirm re-generation/idempotency and prior-period effects before modifying payroll storage.

## 25. Reports and site summaries

Existing host functions load company events, build payroll/shift breakdowns, produce timesheets/site-related summaries and export CSVs. `runPayrollReport`, `exportPayrollCsv`, event CSV and timesheet builders are useful entry points. Company filters and OK/BLOCKED event semantics are material.

No fresh full-module browser validation or accounting reconciliation was performed. Retain reporting grouping/date-range behavior when changing attendance or payroll. Jobs team time is not automatically payroll hours or billable invoice time.

## 26. Jobs / Job Cards — detailed current behavior

### Entitlement, isolation and adapters

`companies.jobs_enabled` is false by default. Host loader fails closed if absent, false, loading or errored. Platform dashboard changes only this field. SQL requires active company/membership and the right role. Owner/admin manages company Jobs; supervisor requires linked active employee and active assignment. No ordinary employee, viewer or billing Jobs access. Platform-only identity is insufficient.

`jobs-data.js` provides local mock and Supabase adapters. Local mock creation requires local/file host plus explicit demo mode. Production must not silently fall back to mock on connection errors. The live facade exposes approved planning/execution/review operations with scoped pagination, revision/concurrency guards and authoritative refresh. `readOnly:true` at facade construction does not mean every explicit capability is disabled; inspect the whitelist rather than interpreting that one flag alone.

Late async results are dropped after company/session/role context changes. UI dialogs/drafts/directories reset. Unknown mutation outcomes are surfaced and refreshed, not blindly replayed. Direct Jobs table mutations are not a frontend shortcut.

### Data and states

Twelve Jobs tables: `jobs`, `job_number_counters`, `job_assignments`, `job_time_entries`, `job_work_days`, `job_materials`, `job_test_results`, `job_notes`, `job_photos`, `job_client_signoffs`, `job_activity`, `job_completion_snapshots`.

Persisted `lifecycle_status` values are `draft`, `scheduled`, `in_progress`, `submitted_for_review`, `correction_required`, `completed` and `cancelled`. “Submitted” below is prose shorthand for `submitted_for_review`. “Working Now” and “Paused / Continue” are derived presentation states around open sessions, not independent persisted lifecycle states. Work-day count means finished work records/sessions; two records on one date can count as two work days.

### Create, number, team, lead and scheduling

`create_job_with_team` is atomic. Company/year numbering uses a transactional counter and unique company/number: `JC-YYYY-NNNN`. Failed atomic creation rolls back related changes. Do not calculate the next authoritative number in the browser.

Create Job uses the approved sectioned form, with explicit scheduling intent; simply entering a date is not equivalent to scheduling. Manager-only schedule/assignment/replacement operations use expected revisions. Date/time/end-order validation is present.

Lead directory migration `20260909190000_jobs_lead_directory.sql` exposes only authorized company supervisor accounts linked to active employees. Existing owner RLS on company_users had made a naive directory query incomplete. Legacy `SUP01` matching supports labels only, never authorization. Lead selection auto-ticks the corresponding employee card and displays Lead Technician context. Preserve this linkage, not name-based permission.

### Start, continue, pause and multi-day work

Assigned active supervisor starts their own session for eligible lifecycle states. Advisory locking plus a unique open-session index enforce one open Jobs session per employee per company across Jobs. Start/Continue does not clock attendance in.

Finish Work for Today requires meaningful work description, writes a finished daily record and closes only the caller's session. It does not complete the Job. Subsequent Continue opens another session on the same Job; history appends. Work notes entered on finishing persist. Do not silently auto-close other technicians or change original timestamps.

Manager emergency close requires reason and explicit UI confirmation. It records recovery/history without inventing completed work. Original session start is retained. Open sessions block submission/completion/cancellation; company switching is not an implicit close.

### Submit, correction, resubmit and completion

Assigned active lead submits meaningful recorded work with no open sessions. Current submission does not require captured signature. Manager can return submitted work with correction reason; lead continues/corrects/resubmits. Revision checks and valid lead/assignment remain important under concurrent edits.

Manager approval completes a submitted Job only after guards; backend stores a completion snapshot. Completed Job Card/detail uses historical snapshot content. Cancellation is manager-only with reason/confirmation and retained history, not a hard delete. User sometimes says “delete” when referring to this cancel action: do not implement actual deletion from that wording alone.

### Evidence and media

Materials live entry works: description, positive quantity, unit and session/work-record association with validation/revision checks. It is not inventory purchasing, stock deduction or automatic invoice creation.

`mediaPersistence` is false. Photos, client signature capture and full authorized image retrieval/embedding are not implemented live. Testing & Results live entry capability is also not exposed, although SQL/normalization scaffolding exists. Standalone notes entry is not exposed live; finished-work notes do persist. Demo photo/signature/test controls are not production proof.

### Current approved Admin UI

- Dashboard retains company identity, summary counts and grouped panels; All Jobs supports scoped pagination/search and compact dropdown filters.
- Seven filters: All, Scheduled, In Progress, Awaiting Review, Correction Required, Completed, Needs Attention. Small text, selected highlight and Escape/outside dismissal.
- Detail tabs: Overview, Work Record, Team & Time, Review, Job Card.
- Overview is details-first, with client request/location and planning/responsibility. No duplicated large lifecycle banner.
- Team & Time uses a roughly 30px pencil button at far right of Assigned team; no large Job planning card. Preserve emergency/session controls where permitted.
- Work Record shows newest two in a dynamically measured internal scroll area; Review newest one. Original day numbers/history are retained, not sliced away. Review retains dynamic work days/team time/team members above the record section.
- Cancellation is compact in the more-actions menu after tabs, hidden at current mobile breakpoint (700px). This is UI behavior, not device authorization.
- Review contains the one retained Activity history; duplicate lifecycle history was removed.

### Current approved Supervisor UI

Groups: Current Job, Continue Job, Scheduled, Awaiting Review, Recently Completed. Detail tabs: Overview, Today's Work, Job Records, Sign-off. Overview has details only. Today's Work owns start/continue/finish and contextual empty state, without duplicate Continue controls. Sign-off owns Submit for Review and requirements, while capture is disabled. Job Records retains expandable history.

Rows keep details left and status above Open Job on the right, including narrow mobile layouts. Excess mobile minimum height was removed in `c518ac3`. Do not revert to status-left/action-right footer or floating center action. Global navigation delegates to existing host handlers and maintains logout/scanner/authorized Billing rather than creating a separate mini-app.

### Job Card and PDF

HTML Job Card includes company/job identity, client/site/request, work records, materials, results/notes/time and applicable snapshot data. Print CSS excludes the app toolbar and preserves desktop two-column document layout, with A4 margins. “Download PDF” invokes `window.print`; the browser's Save/Print-to-PDF controls the output. Browser headers/footers, scaling and pagination still matter.

No direct Jobs jsPDF pipeline or completed live photo/signature embedding exists. Billing's PDF generator must not be confused with Jobs. A proper direct Jobs PDF is remaining enhancement, not already deployed functionality.

### PIN, delivery and attendance distinction

No current Jobs customer PIN-to-start/finish or PIN sign-off workflow was established in source. No verified Job dispatch messaging/notification implementation was found. The migration request mentions these as things to check; that is not evidence they were approved or implemented. Supervisor attendance code is separate. Do not label present Start/Finish as PIN-protected.

## 27. Billing

Operational Billing lives in `app.js`: clients, item catalog, quotes/items, invoices/items, payments, company profile, recurring invoices/items/runs. Helpers handle totals, status, quote conversion, payment recording, recurring generation and master-data references. VAT constant is 15% in code, not a legal audit here.

`20260715190000_billing_access_control.sql` aligns backend gate with owner/admin + company entitlement + membership billing access. `20260807100000_protect_billing_master_history.sql` protects referenced master data. Do not bypass reference/history rules to “clean” clients/items.

Billing Download PDF and Print are distinct. `src/billing-pdf.js` uses jsPDF/AutoTable from normalized document HTML, built into vendor assets; tests include A4, pagination, long text, dates and filenames. Do not replace it with a screenshot-based renderer casually. Recurring generation code/SQL exists; live scheduler state is not established here. No verified Sage/Xero/payment-gateway integration is claimed.

## 28. Marketing

`/` serves public workforce marketing; `/billing` serves public Billing marketing. They use static markup/styles/assets and demo-request forms posting to FormSubmit. These are marketing contact workflows, not authenticated operational Billing. No test form submission was sent.

Marketing/login separation was an explicit safety decision. Changes to landing page routing must not displace login/password-recovery/PWA operation. Production branding and layout have prior user approval; do not redesign while fixing Jobs.

## 29. Operational login and navigation

`/login` and `/login/` rewrite to login.html across local/Firebase/Vercel routes. Host handles portfolio/company dashboards, scanner, self-service and module navigation. Jobs context events invalidate stale work. Keep logout and company navigation consistent with role; Billing must not suddenly appear because a user opened Jobs.

Historical header requirements evolved: initial parity discussion wanted active Jobs indication, later accepted behavior hides the active Jobs shortcut and retains appropriate host controls. Current source/approved screenshots take precedence over an old isolated sentence.

## 30. PWA and service worker

Manifest: Shiftly, standalone display, start_url `/login`, scope `/`, dark theme, 192/512 icons. Current SW cache `shiftly-v241`. Precache includes marketing, Billing landing, operational routes and versioned Jobs assets. Install skipWaiting and activation clients.claim remove old caches.

Same-origin GET only. Network-first for HTML routes, app.js and config.js; cache-first for other assets including versioned Jobs files. Cross-origin Supabase writes are not queued by this SW. Offline shell does not mean offline attendance/Jobs persistence.

Asset versions at migration: app.js v196, jobs.js v25, jobs-data.js v5, jobs.css v27; marketing CSS225/JS224; Billing CSS2. Future authorized releases must coordinate HTML and SW exact URLs. Stale cache has previously caused confusion; verify actual loaded assets before assuming a backend bug.

## 31. Mobile / Expo

The tracked application is responsive web/PWA. No Expo app.json, React Native application or EAS build/release configuration was found. Any native-wrapper/Expo project in other folders/accounts is **UNKNOWN / NEEDS VERIFICATION**, not part of this handover's verified repository.

Preserve 320/375px Jobs layouts, camera/geolocation permissions, touch targets and print limitations. Current screenshot acceptance is historical; no fresh device session was opened during migration.

## 32. Supabase architecture

Public browser configuration points to Supabase; Auth identity drives RLS/RPC access. Project refs are identifiers, not credentials: production-designated `szougedvngaoratbtars`; staging wrapper targets `pxewcfpmrxzcpntjmqkr`; `tevpwavxrsaawnmlgpra` is explicitly unresolved in that wrapper. Do not infer a project's safety from names or comments.

Guarded staging workspace is `C:/dev/Shiftly-Supabase-Staging`, with pinned CLI requirement 2.116.0. Wrapper verifies the separate workspace/ref, rejects production/unresolved refs and refuses write commands. It can invoke remote read operations for selected commands; reading the script is not authorization to run them.

No Supabase connection, catalog fetch, auth operation or data change was performed for this migration. Applied migration history cannot be reconstructed authoritatively from local SQL alone.

## 33. Database schema / relationships

Core: companies -> company_users; companies -> employees/sites/supervisors/admins; attendance events reference company-scoped employee/site keys. Payroll settings/deductions/adjustments/YTD/period totals attach to company and employee. Billing headers belong to company and parent-child item/payment/recurrence relationships. Jobs owns the twelve-table subgraph in section 26.

Representative payroll tables: `company_payroll_rules`, `company_deduction_types`, `payroll_deductions`, `payroll_adjustments`, `company_payroll_levy_periods`, `employee_payroll_ytd_opening_balances`, `employee_payroll_period_totals`.

Important distinction: the legacy `supervisors` directory/code model is not Jobs authorization. Jobs uses active authenticated company membership linked to employees and assignments. Current live `clock_events`/`time_entries` relationship remains an explicit schema-verification gap.

## 34. RLS and security

Jobs foundation enables RLS on all Jobs tables; browser direct writes are revoked, counter reads restricted, callable RPCs explicitly authorized. Company-scoped FKs, locked mutations, expected revisions and pinned definer search paths prevent common cross-tenant/concurrency mistakes. Existing shared helper functions are not to be overwritten by a Jobs patch.

Other module policies are in historical `database/` scripts and dated migrations. Employee-face Storage SQL uses company-path membership for read and owner/admin for mutation; broad company-member biometric read is a privacy consideration to understand, not silently change. Frontend hiding does not strengthen that policy.

This is not a penetration test or a complete live grant audit. Service-role capabilities bypass normal browser restrictions; never move them client-side. Do not relax RLS because a dropdown query fails: the Jobs lead-directory fix used a narrow authorized RPC instead.

## 35. Edge functions

Only `supabase/functions/invite-company-user/index.ts` is tracked. It handles OPTIONS/POST, validates JWT, uses active platform-admin lookup, finds existing users or invites them, and links requested company membership/employee information. Role choices include owner/admin/billing/supervisor/employee/viewer.

Environment names: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SHIFTLY_SITE_URL`. Remote Deno import from Supabase JS v2. Deployment/version/secrets/redirect allowlists were not queried. Attendance `clock_batch` is a PostgreSQL RPC, not an Edge function. Do not invent remote functions absent from this source.

## 36. Firebase / hosting

`.firebaserc`: default and Shiftly alias point to `shiftly-21919`; ClockingLegacy alias to `clocking-app-d926c`. `firebase.json` serves `public/` with login/Billing rewrites and ignore rules. Vercel builds/routes static public files separately.

Known mismatch: `.github/workflows/firebase-hosting-pull-request.yml` still targets `clocking-app-d926c` with the legacy service-account secret reference. It is not safe to retarget credentials/project automatically. Documented in the previous audit; unchanged here.

Historical deployment evidence: custom domain `https://shiftlyapp.co.za` served exact normalized local application assets for c518ac3. README also lists Shiftly Firebase and an alternate Vercel URL. No cloud dashboard or domain was contacted during this migration; current routing/ownership is not freshly confirmed.

## 37. Integrations

Verified source dependencies include Supabase, Firebase/Vercel static hosting configuration, FormSubmit marketing lead forms, QR/camera APIs, browser geolocation, mapping, face-api model CDN, and PDF libraries. Company logo and face Storage paths are operational integrations; Jobs media is not enabled.

No verified current accounting sync, payroll bank payout, customer Job messaging, subscription payment gateway or Expo store deployment is asserted. Related historical business ideas should remain proposals until their own source/requirements are provided.

## 38. Environment/configuration — names only

- Browser `window.SHIFTLY_CONFIG`: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `ENVIRONMENT_LABEL`.
- Edge: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SHIFTLY_SITE_URL`.
- CI references `GITHUB_TOKEN` and legacy Firebase service-account secret; references are not secret values.
- Local `.env`, `.env.local`, CLI links/caches and service accounts remain outside Git. They were not copied into these documents.

The public config JWT was classified as anon in the earlier heuristic audit; no key is reproduced here. A “test” environment label does not establish disposable data. Unknown additional external secrets must be obtained through the user's secure configuration process, not guessed.

## 39. Build and local development

`node dev-server.js 5191` serves `public/` on loopback; default port in code is 5184. Routes `/`, `/login`, `/billing` map to their respective files. Keep it local; it is a simple preview server, not a hardened public server.

For isolated Jobs fixtures use local `/login?jobsDemo=admin`, `supervisor` or `employee`. Merely opening localhost without explicit demo isolation can still use live config. Do not sign in or generate production records to check CSS.

Only package scripts: `build:billing-pdf` and `test:billing-pdf`. The build writes vendor JS/licenses using esbuild, es2020 browser IIFE and embedded font assets. No generic application build/lint/typecheck is defined. Dependencies are already present locally; migration did not install/update them.

## 40. Tests and verification

Fresh migration run: all five `tests/*.test.cjs` suites passed **106/106**, zero failures/skips. These cover Billing PDF, Jobs data/UI, static SQL and Platform Jobs Access using local simulation. They do not contact production.

Previous checkpoint recorded 20 tracked JS/CJS/MJS syntax checks, offline TypeScript parse and Billing PDF build passing with no output changes. Build was not rerun during documentation-only migration because it writes generated assets. Those earlier results are historical, not a new Deno compile.

DB scenario/validation/psql harnesses were not executed: they create fixture databases and apply SQL. Old offline PostgreSQL execution is documented in `docs/jobs-final-validation.md`; static tests are not a substitute for freshly applied production security checks. No full payroll/attendance/biometric end-to-end suite was established.

## 41. Deployment architecture and authority

Historically: completed feature changes were validated/committed in this worktree, main was fast-forwarded in the separate deployment worktree, pushed and Firebase Hosting deployed explicitly. Historical conversation says main push also triggers Vercel; current integration settings were not inspected.

**New operating rule: do not automatically commit, push, merge or deploy.** Each requires explicit user instruction. Do not run README npx commands to test configuration. Static frontend deployment does not deploy SQL/Edge functions/Storage. Database changes need separate exact scope and approval.

## 42. Relevant Git history

| Commit | Milestone |
| --- | --- |
| f0b3c8a / 9dbba10 | Initial Firebase setup / move PWA into public |
| 1efce8c | Workforce platform checkpoint |
| cb55874 / 48f88db | Safe marketing/login separation / marketing site |
| a95942b | Reviewed Jobs foundation checkpoint |
| 03f138f | Frozen backend runbook |
| 17faf56 | Jobs live frontend integration; later parity problems identified |
| 344ff58 | Platform Jobs access control |
| 15f45e3 / a96bf93 | Loader/cache coordination fixes |
| 2a61336 | Live UI and authenticated navigation parity |
| d0ea68c | Authorized lead directory and auto-selection |
| 159ef26 / fe0b58a | Compact/relocated lifecycle panels |
| 0910ebd / 4567323 | Print toolbar exclusion / desktop print columns |
| cbcd056 | Live materials |
| 8ccd13b / e834e40 / fd7122a | Remove duplicate history; cancel menu; mobile hide |
| c9529cb / aef17d2 | Pencil team edit and compact size |
| c4cebe7 / 1c9534e | Work Record two / Review one scroll windows |
| 1fb393e / 7512d97 / 6ecc1bb | Compact cancel/search/filter controls |
| 99ca0ae | Supervisor tab/action cleanup |
| a12d309 / 446b1da | Mobile footer attempt / restore stacked status above action |
| c518ac3 | Trim excess supervisor mobile row height |
| b1e9844 | Save accepted checkpoint and three future features |
| cd5b860 | Final Jobs repository audit and secret-ignore hardening, local only |

Subjects are summarized for orientation. Use `git show` for exact scope. These are not all commits in the repository and do not establish every remote deployment.

## 43. Important technical decisions

| Decision | Why / current relevance | Evidence |
| --- | --- | --- |
| Shared approved Jobs UI, separate adapters | Avoid demo/live drift without weakening backend permissions | Current jobs files; 2a61336; historical parity discussion |
| Jobs sessions separate from attendance | Work records must not silently alter payroll clocking | Current RPC/UI and user-approved flow |
| Narrow lead-directory RPC | Directory RLS limited naive browser query; authorization must remain | d0ea68c and lead migration |
| Completed snapshots | Preserve historical completed Job Card content | Foundation and current adapter |
| Entitlements separate | Jobs must not grant Billing or platform-only tenant rights | Host gates/SQL/tests |
| Media disabled pending full pipeline | Metadata/demo alone is insufficient secure capture | live capability flags; next-phase notes |
| Static operational app retained | Minimize unrelated regressions during Jobs delivery | Current architecture and scoped commits |

## 44. Requirements that changed

| Original / intermediate | Changed to | Why / status / evidence |
| --- | --- | --- |
| Large lifecycle and planning banners | Details-first; actions in appropriate tab or compact control | User rejected visual domination; implemented |
| Lifecycle history plus Review history | One Review history | Duplicate information; 8ccd13b |
| Big Cancel Job above Review | Small menu after tabs, hidden mobile | Reduce prominence; implemented, not hard delete |
| Manage technicians planning card | Small far-right Assigned team pencil | Explicit user placement; c9529cb/aef17d2 |
| Long full record stacks | Latest2 Work Record/latest1 Review with scroll | Keep modal compact, retain stats and history |
| Large search/filter pills | Compact full-row search with dropdown | Approved Gmail-like reference adapted to Shiftly |
| Repeated supervisor action cards | Today owns work; Sign-off owns submit | Duplicate Continue and lifecycle cards removed |
| Mobile status-left/action-right attempt | Status stacked above action on right | User explicitly referred back to approved demo; 446b1da |
| “Always deploy” during UI iteration | Explicit user authorization for each release action | Migration instruction now governs; no deployment here |

## 45. Historical Codex context captured

Primary available conversation: current `Phase 3` task and the supplied screenshots/requests. Also inspected a bounded recent page of `96Digitalise Job Cards` via the read-only conversation tool. It corroborates the local-only cd5b860 checkpoint and earlier live/demo parity regression. Unrelated tasks and credential-related conversation were not mined.

The user values compact typography, exact placement, sensible grouping and consistency with accepted demos. `/confirm` means discuss first. They repeatedly corrected implementations that technically worked but diverged visually. Do not restart accepted UI from a fresh design.

Older requirements and unseen conversations are not exhaustively recoverable. This file transfers verified/available context, not an invented complete account archive. External chat attachments are not prerequisites for core understanding here.

## 46. Previous bugs and regressions

- Live integration initially branched to a simplified renderer, bypassing approved dashboards/Create Job. Not simply empty-state/caching; shared UI plus complete authorized summaries fixed it.
- Summary pagination/stripped team/lead/session fields could not support correct dashboard totals merely by removing a live branch. Preserve the adapter data fix.
- Jobs header incorrectly exposed Billing and lost logout; host-derived authorization/navigation restored.
- Lead dropdown was incomplete under ordinary company_users RLS; narrow authorized directory fixed it.
- Print included toolbar/Download button; print isolation corrected. Responsive stacking in print lost the approved columns; print CSS corrected.
- Duplicate Activity history and Continue controls, oversized action/filter text, long record stacks and excess mobile row space were iteratively corrected.
- Older attendance migrations explicitly fix unresolved/late open-shift auto-close behavior; do not restore earlier definitions.

## 47. Failed approaches and lessons

The separate live UI was an integration shortcut that drifted from the approved demo. Removing only the branch was insufficient because data summaries differed. Fix both data contract and shared rendering without discarding mutation safeguards.

Moving mobile status and action to opposite edges did not match the approved stacked arrangement; later commit supersedes the earlier “fix.” A compile/test pass does not prove visual acceptance. Review screenshots at relevant widths for future UI changes.

Browser printing remains a deliberate current limitation, not a failed direct PDF implementation. Do not invent failures or blame cache when source branching is the actual cause.

## 48. Rejected / abandoned designs

Rejected UI at this checkpoint: large lifecycle/planning cards above details; duplicate history; oversized Cancel button; duplicate supervisor Continue; long unbounded work-record stacks; oversized filter pill row; floating/mobile misaligned Open Job; excess card minimum height.

No evidence supports declaring a native app, accounting integration or customer PIN plan definitively rejected. They are simply unverified/not implemented here. The narrower Continue confirmation-popup redesign was discussed but user accepted existing popup for now; not a development obligation.

## 49. Current WIP — exact distinction

Original Git status was entirely clean. No staged/unstaged/untracked application changes, no stash and no loose Jobs work were present. All completed Jobs changes are committed.

Migration creates only `AGENTS.md` and `CODEX_HANDOVER.md`; they intentionally remain untracked/uncommitted until user review. This does not mean the product has no unfinished features: photos/signatures/results/direct Jobs PDF remain incomplete or future. Ignored runtime caches/configs are preserved, not pending source work.

## 50. Jobs exact migration snapshot

Branch/HEAD as section 4. Current UI accepted, core backend adapter present, local suite passes. Foundation SQL source and lead-directory SQL present. Historical context reports foundation installed and subsequent live use; no migration should be rerun. Fresh applied catalog, RPC versions and grants remain unverified.

Start/Continue/Finish implemented without customer PIN, separate from attendance. Materials working. No live photo/signature pipeline. Submit works without signature. Latest app assets historically deployed at c518ac3; later commits are docs/ignore only. No new release needed merely for these local docs.

## 51. Production versus local evidence

`docs/jobs-next-phase.md` records normalized live custom-domain asset equality for login.html, jobs.js25, jobs.css27, jobs-data.js5 and SW at c518ac3. It explicitly is not authenticated E2E or DB security evidence. User screenshots and “working” confirmations are historical UX evidence.

`docs/jobs-repository-handover.md` records the later offline repository audit. This migration reran local suites but did not revisit production. Local main/cached origin evidence is not a fresh GitHub inspection. Do not claim every current root document exists remotely.

## 52. Database safety map

| Material/action | Risk / rule |
| --- | --- |
| Jobs foundation/runbook | Historical install packet, not authorization; never replay installed foundation |
| Lead-directory migration | Narrow additive read surface; applied runtime needs evidence, not guessed reapply |
| database setup/alignment scripts | May drop/replace objects/backfill real data; not universal bootstrap |
| Auto-clock migrations | Change rules/cron and execute processors immediately |
| Payroll/YTD/levy SQL | Named-company financial changes; preserve versions/continuity |
| Storage setup | Changes bucket visibility/policies; privacy/security review required |
| DB harness | Creates fixture DB and executes SQL; not an ordinary read-only test |
| Staging wrapper | Separate verified target; writes intentionally disabled |

## 53. Deployment safety map

Check exact worktree/branch/HEAD/diff and user scope before any release. Firebase target, Vercel integration, Edge deploy and SQL apply are separate actions. Verify asset versions for static changes. Never infer permission from stored service accounts or an old runbook.

PR-preview legacy project mismatch needs explicit review. Do not delete cached credentials or re-link projects during a migration. No release commands are required for the uncommitted root docs.

## 54. Known issues and limitations

Known: live Jobs media/results capture incomplete; standalone note entry unavailable; Job Card uses print dialog; mobile cancel hiding is not device-based security; work-day count counts records not unique dates; legacy PR-preview target mismatch; partial automated coverage outside Jobs/Billing PDF; potentially confusing historical SQL and config labels.

No new application fix was made during migration. These items are documented instead of silently “cleaned up.” Existing accepted behavior should remain until explicitly changed.

## 55. Unknown / needs verification

- Current production migration catalog, exact grants/RLS, function definitions and Storage policies.
- Current cron activation/rule rows; no universal 19:30 policy established.
- Actual live clock_events/time_entries relationship and complete bootstrap order.
- Remote branch freshness, cloud preview settings and Vercel automation state.
- Edge deployment version, redirect allowlists and secret configuration.
- Native/Expo code elsewhere; no such tracked project here.
- Full leave workflow, Job customer PIN, notification delivery or accounting sync beyond this repository.
- Biometric liveness/anti-spoofing effectiveness, consent/retention controls and real-device performance.
- Current statutory payroll accuracy/compliance, full-module regression coverage and production data reconciliation.
- Complete older-account conversation history. A bounded relevant history sample was used, not an exhaustive archive.

## 56. Highest-risk areas

Cross-company data leakage; Jobs authorization weakening; service-role exposure; replay of already-installed/data-changing SQL; payroll/YTD corruption; automatic closure with wrong company/timezone/date; stale async mutations after company switch; duplicate retry after uncertain write; biometric Storage privacy; accidental production writes during “preview”; cache/routing mismatch; wrong Firebase project deployment.

The large shared app.js means an apparently small navigation or payroll refactor can affect multiple modules. Keep changes scoped and test affected paths instead of replacing the shell.

## 57. Important files to read first

`AGENTS.md`; this file; `docs/jobs-repository-handover.md`; `docs/jobs-next-phase.md`; `public/app.js`; `public/jobs.js`; `public/jobs-data.js`; `public/jobs.css`; Jobs migrations and unit tests. For backend changes also read `docs/jobs-final-validation.md` and frozen runbook, interpreting their dates.

For attendance: alignment SQL, auto-close migration chain and correction SQL. For payroll: app calculation/YTD functions and payroll migrations. For Billing: `docs/billing-pdf.md`, source generator and Billing migrations. For hosting: Firebase/Vercel/SW files and legacy workflow.

## 58. Key tables, functions and routes

Routes: `/` marketing, `/billing` marketing, `/login` operational; local `jobsDemo` query for fixtures only. Host functions: `loadCompanyAccess`, `setCurrentCompany`, `canUseBilling`, `submitBatch`, `generateSelectedPayslip`. RPC anchors: `clock_batch`, `correct_tr_electrical_clock_event`, `create_job_with_team`; inspect Jobs migration for complete named mutation inventory rather than inventing endpoints.

Core and Jobs tables are mapped in sections 15/26/33. Storage buckets currently referenced for existing host features: `company-logos`, `employee-faces`. Jobs tables with media metadata do not imply a configured Jobs bucket.

## 59. Terminology

- Company / workspace: tenant scope, not Git worktree.
- Platform admin: platform control identity, not automatic company membership.
- Supervisor: authenticated company role; legacy supervisor code is attendance-related.
- Lead technician / lead supervisor: assigned Job lead employee linked to eligible supervisor membership.
- Work day: persisted finished Job work record; not necessarily unique calendar date.
- Pause / Continue: derived Job display state, not attendance OUT/IN.
- Sign-off: client acknowledgement UI currently not live capture; distinct from manager completion.
- Cancel: retained Job history/state transition, not hard deletion.
- Billing: operational customer documents versus public marketing page; not proven subscription billing.

## 60. Outstanding work by priority

**REQUIRED before changing/releasing anything:** user reviews migration; next agent reads both documents, checks actual Git state and verifies exact task authority. Preserve local-only checkpoint/documents during account transfer.

**RECOMMENDED when separately authorized:** review legacy PR-preview target; establish targeted additional attendance/payroll/biometric tests; verify deployed catalog only with explicit read-only production scope; clarify clock_events/time_entries map before attendance changes.

**FUTURE, recorded not started:** secure Jobs photos, signature capture and Testing & Results entry. Decide signature submission rules explicitly. Include retrieval/history/completed-snapshot/PDF considerations, not just upload controls.

**OPTIONAL enhancement:** direct Jobs PDF generation; do not confuse with today's browser-print implementation. No broader feature backlog is approved by this document.

## 61. Future ideas supported by evidence

The three next-phase Jobs items are saved in `docs/jobs-next-phase.md`. Materials should be preserved as working. Client signature needs a decision about unavailable reason and whether submission becomes conditional. Photo categories Before/During/After/Other are recorded intent, not working Storage.

PIN-based workflows, Expo migration, messaging and external accounting integrations are not established implementation requirements here. Obtain a concrete user brief rather than executing them from a checklist mention.

## 62. Invariants never to break silently

Tenant isolation; active membership/employee authorization; separate entitlements; no implicit platform tenant access; separate attendance and Job time; open-session protection; revision/lock discipline; retained activity/reasons/snapshots; company-switch stale-response rejection; no production mock fallback; approved compact UI; historical payroll continuity; explicit blocked-event approval; credential privacy; explicit deploy authority.

## 63. Understand before editing

Trace the full flow: DOM/action -> host context -> adapter/RPC -> SQL authorization/state -> refresh -> snapshot/display. For older modules, trace direct table writes too. Determine whether an action that looks like preview actually writes (notably payslip generation).

Read current implementation instead of implementing old screenshot differences again. Check whether desired work is frontend-only or requires new schema/Storage permissions. Do not add a media button before a secure persistence/retrieval plan exists. Report necessary authority or missing evidence rather than guessing.

## 64. Recommended new-account startup

1. Read AGENTS.md and CODEX_HANDOVER.md completely, then current Jobs checkpoint notes.
2. Check root, branch, HEAD, worktrees, status, stash and local refs. Compare with section 4 and expected two new documents; do not assume clean after transfer.
3. Confirm local-only cd5b860 and the uncommitted docs arrived. Do not auto-commit/push to “repair” the snapshot.
4. Ask what task the user wants next; unfinished-feature listing is not implementation authorization.
5. Trace relevant current source, tests and database safety boundaries. Identify tenant, role, mobile, cache and financial impacts.
6. Make the smallest authorized change, preserve unrelated WIP and run suitable local checks.
7. Report actual results/limits and wait for explicit commit/push/merge/deploy scope. No automatic production action.

## 65. Verification appendix and audit boundaries

Migration performed local Git/status/history/worktree/stash review; tracked-file/module/config/SQL inspection; relevant bounded conversation retrieval; and the five-suite offline test command (106 pass). No production browser/database/cloud APIs were used. Existing source, dependencies and generated assets were left untouched.

Earlier checkpoint audit in `docs/jobs-repository-handover.md`: 20 JS syntax checks, offline invite TypeScript parse, Billing PDF build, diff whitespace pass and heuristic tracked secret scan. Its 88-file scan found no private-key/AWS/GitHub/Supabase-secret patterns; it was not exhaustive history/security scanning. Ignored local secrets were not inspected for values.

Migration document review checks: both new files reread, internal paths checked, credential-pattern scan and final Git comparison. Only AGENTS.md and CODEX_HANDOVER.md are intended new uncommitted files. No secret values intentionally included. Public project IDs and config variable names are identifiers, not passwords/keys.

Chronology warning: `jobs-backend-execution-review.md` originally says SQL unexecuted; its own preface points to later offline validation. Frozen production runbook states preparation did not execute production. Later historical context reports installation/live use. None authorizes reinstallation, and none replaces a freshly authorized applied-schema inspection.

End of migration handover. No new feature development, release or data operation is implied. Wait for the user's review.
