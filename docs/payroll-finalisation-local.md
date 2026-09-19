# Payroll finalisation and YTD — local implementation report

## Current checkpoint — 18 September 2026

Branch `feature/shiftly-jobs`; unchanged HEAD `1a9830b542e68211e453b5ace7e48d3ce6a35361`. All changes are local and uncommitted. No push, deployment, live migration, fresh production query, TR change or PVS access in this continuation.

The latest implementation supersedes the initial report below. See the current section of `docs/payroll-preproduction-review.md` for the complete acceptance matrix, remaining risks and proposed release sequence. **Local backend integration, manipulated payload and stale-input race each have implemented, locally verified fixes. Production remains unapproved: popup/print visual acceptance and actual Supabase/Deno/schema-equivalent rehearsal are still outstanding.**

### Current file map

- `public/payroll-engine.js`: one shared deterministic calculation module extracted from the host, including payroll financial constants and explicit South African date semantics. Host wrappers and trusted server use the same functions.
- `src/payroll-authority.js`: trusted source calculation, HMAC-confirmed preview, source/fingerprint verification, exact request retries and private commit coordination.
- `supabase/functions/payroll-authority/index.ts`: Auth verification; user-scoped input RPCs; service-only commit; explicit separate local/HTTPS origin configuration; constrained frozen-logo fetch. Not deployed.
- `public/app.js`: thin engine wrappers, read-only documents, authoritative preview hook, saved reprints and self-only current ledger reads.
- `public/payroll-history.js`: strict dates/money/snapshots/context and explicit local release guard.
- `public/payroll-history-ui.js`: token-only confirmation, saved snapshot display, audited YTD editor, independent fields and stale-message handling. No client-money commit payload or legacy draft-building path remains.
- `public/login.html`: compact check beside PDF, confirmation, YTD fields and versioned new scripts. Cross-year errors show the current selection, not a previous dialog's dates.
- `supabase/migrations/20260917100000_payroll_finalisation.sql`: prior ledger/immutability/RLS plus private commit boundary, authoritative input/self-YTD readers, material writer locks and TRUNCATE restriction.
- `tests/payroll-history.test.cjs`, `tests/payroll-summary.test.cjs`: existing contracts/parity/UI/document regression coverage adapted to shared engine/token flow.
- `tests/payroll-db-local.cjs`, `tests/payroll-authority-scenarios.cjs`: explicitly isolated PostgreSQL transaction/security tests.
- `tests/payroll-authority-http.test.cjs`: offline HTTP entrypoint/allowlist/auth/shared-runtime/service-boundary tests.
- `tests/payroll-browser-local.cjs`, `tests/payroll-browser-gateway.cjs`: synthetic local browser fixture, real PostgreSQL RPCs but substitute Auth/PostgREST gateway; not production code.
- Both payroll reports: current evidence first, historical findings clearly dated below.

No dependency/package, Jobs implementation, Billing generator or production configuration changes. Service-worker release version is intentionally unchanged pending release approval. New scripts carry local query versions; coordinated production precache/version changes remain required.

### Current transaction contract

Preview sends company/dates/explicit levy choice to the authority. Database membership/activation checks precede source loading. The shared engine derives all amounts, then the server signs the preview actor/company/input revision/calculation/version/expiry. Confirmation sends only company, request UUID and token. The service reloads/recalculates; a private SQL transaction rechecks source revision under a lock shared by material writers, then saves the complete run once. Monetary browser fields and public amount-RPC calls are rejected.

If inputs change, the user must rerun/review payroll; no silent money substitution. Simultaneous and lost-response confirmations resolve to the original request. A later writer waits until payroll commits, or an earlier writer causes stale rejection. Generation, summary and reprint do not contribute to YTD. Audited YTD adjustments preserve original completed rows. Independent toggles, manual dates, overlap guard and cross-tax-year block remain. No speculative weekly calendar validation was added.

### Fresh validation summary

Original offline suite **148/148**, new HTTP tests **3/3**, original PostgreSQL groups **12/12**, new PostgreSQL authority/security groups **19/19** (31 groups total). Shared TR comparison **70 scenarios, zero differences**; authoritative path **50 equivalent calculated results plus 20 correctly blocked September cases**. Captured TR data was reused offline; history was not repaired. Syntax/TypeScript parser/whitespace checks were local.

Browser verified real login/run/chooser/generation/cancel/confirm/reprint, one run and one contribution, audited edit, two-tab stale rejection, overlap, cross-year confirmation blocking, independent fields/zero defaults and restricted employee UI. Generated document popups were not exposed by the browser-control surface, so printed/payslip visual parity is **not** signed off. HTTP entrypoint VM tests are not a Deno deployment rehearsal. The release gate remains withheld for those limitations and schema/cutover review.

---

## Historical initial checkpoint — 17 September 2026

The following sections document the earlier implementation before the three local blocker fixes. References below to browser monetary payloads or unmitigated races are historical, not the current contract above.

Checkpoint: 17 September 2026. Branch `feature/shiftly-jobs`; unchanged base HEAD `1a9830b542e68211e453b5ace7e48d3ce6a35361`.

**Subsequent pre-production review:** see `docs/payroll-preproduction-review.md`. The sections below record the earlier implementation checkpoint, not final acceptance. The later authorised TR read-only comparison found matching arithmetic on available records, but browser acceptance is blocked by incompatible backend URL guards. Isolated probes confirmed arbitrary consistent financial payload acceptance and a source-update race. No production approval is implied; the described UI flow is conditional code, not a passed end-to-end workflow.

**Local preparation, not a production release.** No live migration, production data access/change, PVS reconciliation, TR data change, push, deployment or commit occurred in this implementation/verification continuation. Application changes are uncommitted. The migration was executed only against freshly created, loopback-only PostgreSQL fixture clusters.

## 1. Exact files changed

- `public/app.js`: separate document generation from history; integrate preview/finalisation/YTD editing; frozen admin/employee reprints.
- `public/login.html`: compact finalisation action beside PDF, confirmation dialog, status and employee YTD fields; load new scripts.
- `public/payroll-history.js` (new): date/year, decimal, immutable snapshot and compatibility-context helpers; local-backend guard.
- `public/payroll-history-ui.js` (new): RPC integration, source refresh/revision checks, confirmation/retry state, saved reprints, employee YTD editing.
- `supabase/migrations/20260917100000_payroll_finalisation.sql` (new): prepared schema, RPCs, immutable history and access controls.
- `tests/payroll-history.test.cjs` (new): contracts, synthetic TR parity and DOM interaction tests.
- `tests/payroll-db-local.cjs` (new): deliberately isolated PostgreSQL fixture runner.
- `tests/payroll-summary.test.cjs`: updated read-only button expectation and async function extraction boundary.
- `docs/payroll-finalisation-local.md` (new): this report.

No package/dependency, Jobs, Billing engine, cloud configuration or service-worker changes. Ignored temporary database evidence is retained, not committed or deleted.

## 2. Database/schema changes

The migration is transactional and must not be installed by replaying historical migrations.

- `company_payroll_rules`: `payroll_history_enabled` and `payroll_tr_parity_verified`, both false by default; ordinary authenticated users cannot activate them.
- `employee_payroll_ytd_opening_balances`: nullable employee-only `employee_uif numeric(14,2)`. Existing `uif_combined` and monetary rows are preserved without reinterpretation/backfill.
- `payroll_runs`: authoritative run header with company, request UUID, dates/tax year, employee count, finalised status, snapshot version, exact request, source revision, frozen company/rules/levy snapshots, actor and server timestamp. Company/request is unique.
- `employee_payroll_period_totals`: adds run ID, employee UIF, independent PAYE/UIF applicability and frozen document row; company-scoped run FK and complete-snapshot constraint. Existing rows remain without a run ID; nothing invents missing historical documents.
- `payroll_financial_events`: append-only value-specific adjustments, previous/target/delta, cutoff, actor/time/reason and request uniqueness. Future period corrections have a linked original and corrected snapshot, with a company/employee/tax-year-scoped FK. No general correction write API is exposed.
- Adds manager/history/self-snapshot/read-adjustment/finalisation RPCs, private date/revision/locking helpers, immutable triggers, explicit function ACLs and narrower read policies. See the SQL file for complete definitions.

**Not purely additive in access behaviour:** old authenticated history writes are revoked and immutable triggers also protect legacy opening/period rows. Applying this migration alone would break the old document-upsert workflow, even while feature flags remain false. A coordinated release is mandatory.

## 3. Removal of document-triggered writes

Removed both `savePayrollPeriodTotals` and its call from `generateSelectedPayslip`. Generate Payslip, Summary and employee documents do not insert/update history. Removed the old “Finalise & Generate Payslip” wording. Preview levy selection now constructs an in-memory snapshot instead of upserting a levy period. Only explicit confirmation invokes `finalise_payroll`.

## 4. Run → Preview → Finalise → Reprint

Run Payroll checks for an existing official snapshot first. If found, it renders saved rows/company/rules without recalculating with current employee or levy settings. Otherwise it refreshes employee/rule inputs, calculates through the existing engine and prepares a revision-checked preview. Documents can be generated repeatedly. The separate header check action opens a confirmation naming company, dates, employee count and YTD consequences. Successful finalisation changes UI status to Finalised. Admin and linked-employee reprints use frozen financial rows; the summary uses the same saved run.

Legacy periods without snapshots can still be previewed through the existing calculation path but cannot be represented as immutable historical reprints. Normal finalisation overlapping those records is rejected, not used to rewrite them.

## 5. Transaction

One PostgreSQL RPC inserts the run header and every active employee's period row in one transaction. It checks manager/company activation, current source revision, complete active roster, distinct company-scoped employee identities, dates, snapshot structure, monetary consistency, flags and continuity. Any employee failure rolls back the header and preceding rows. No partial batch is accepted.

## 6. Idempotency/concurrency

Company-scoped transaction advisory locking serialises finalisation and YTD edits. A unique company/request UUID plus exact payload comparison returns the original result for the same request, rejecting a changed payload under that key. The UI keeps its request and payload after an uncertain response. A reload retrieves authoritative history. A new request for the same period is still blocked by overlap checks. Financial-table direct authenticated writes are revoked.

Source revision is a change detector, not a server-side payroll recalculation. Ordinary attendance/employee/configuration writes outside these RPCs do not all participate in the advisory lock; see risks below.

## 7. Duplicate/overlap protection

The locked server RPC rejects any existing employee period where `existing.start <= selected.end` and `existing.end >= selected.start`, including legacy rows. No off-cycle bypass. This is an RPC/locking/privilege design, not a PostgreSQL exclusion constraint. Privileged maintenance roles remain outside normal application authority.

## 8. Completed periods

Opening completed count plus recorded periods after the opening cutoff supplies the prior count. A successful new row adds one. Adjustments, preview, documents, reprints, date selection and retries add none. Manual dates remain. No weekly start-day, fortnightly anchor or missing-expected-period inference. Existing supported count ceiling remains 52; TR monthly continuity remains separately protected.

## 9. PAYE YTD

Effective PAYE = applicable tax-year opening PAYE + prior period PAYE after the opening cutoff + audited PAYE deltas. Calculation-time reads exclude the current/future selected period. Employee editing reads the current tax-year ledger. The monetary calculation engine itself is not generalised or replaced: existing applicable cumulative PAYE eligibility/methods remain, including legacy takeover gates. The new ledger/editor is common; this is not a claim that every company has been switched to a new cumulative tax method.

## 10. Employee UIF YTD

Same ledger principle, using employee-only UIF stored from the actual active UIF deduction. Existing combined UIF is neither halved nor reused as employee UIF. Unknown historical employee UIF contributes zero until an authorised audited edit supplies it. Employer UIF is not added to employee YTD.

## 11. R0.00 defaults

Missing values read as zero and do not alone block normal payroll. Supplied flags distinguish unknown history from an opening, a completed applicable period or an explicit adjustment, including confirmed zero. Invalid/negative/excess-precision input is rejected. Existing TR continuity with a supplied opening remains protected.

## 12. Employee Add/Edit

Shows effective current-tax-year PAYE/UIF independently according to settings. Existing values load before saving; stale company/context/year/revision prevents saving. Employee details and any changed YTD targets use one transaction. An optional reason accompanies server-recorded actor/time. This UI is deliberately enabled only against an isolated local backend in this preparation.

## 13. Audited adjustments

Changing 12,650 to 12,500 records previous 12,650, target 12,500 and delta -150; it does not rewrite old periods. Employee UIF uses the same independent mechanism. The adjustment cutoff follows the latest applicable opening/period; later payroll incorporates the delta. Explicit zero can be recorded. Stale or uncertain edits require authoritative refresh rather than blind accumulation. Backdated insertion around later official records needs additional operational policy before release.

## 14. Independent toggles

All four combinations are covered. OFF hides the applicable editor and stores no new applicable contribution; it never deletes opening/history/adjustments. Frozen reprints retain the settings and deductions used at finalisation, regardless of later toggles.

## 15. Tax years

March–February handling is centralised for the new path and enforced server-side. A new year starts at zero without an opening. Preview/document generation is not automatically blocked solely for crossing February/March; existing calculator limitations still apply. Finalisation crossing the boundary is explicitly rejected. No splitting, automatic allocation or two-year history creation.

## 16. Immutability/corrections

Ordinary update/delete of official rows is blocked. Reprint never corrects them. The deduction editor refuses a loaded finalised snapshot. Schema supports linked correction events/deltas/snapshots, but the controlled correction RPC and UI are deferred and must be designed/tested before use. Snapshot data is frozen; HTML/PDF renderer source is not stored as a permanent versioned artifact, so a future renderer change could change layout without changing financial figures.

## 17. TR regression results

60 synthetic old-v-new cumulative cases compare results against base commit `1a9830b`: completed counts 0/5/6/10/11; gross 0/8,500/23,000/55,000; retirement 0/1,340.84/1,676.05. All match. Four protected functions are byte-for-byte unchanged: `buildTrElectricalPayrollBreakdown`, `trElectricalAutomaticLevyDeductions`, `calculateCumulativePaye`, `statutoryDeductionRows`.

The database fixture also preserves and reads a synthetic TR opening plus legacy period, including gross/retirement/PAYE and completed counts; combined UIF remains untouched. Monthly continuity and the separate TR activation gate are tested.

**Actual historical/current TR employee payroll parity has NOT been established.** No live financial records were accessed for these checks. Synthetic and unchanged-source evidence does not satisfy full real-data release certification. TR must remain unactivated until an authorised representative baseline comparison proves all requested figures, including levies and resulting YTD. Any unexplained difference stops rollout.

## 18. Other existing data

Fixture opening and legacy period values are compared before/after migration. PVS data was neither reconciled nor corrected, and is not a parity gate. No accountant values imported. Other actual tenants' records have not been verified by this local test. Legacy rows are consumed as currently recorded, not certified as correct.

## 19. Checks run

- Full nine-file offline suite: **148 passed, 0 failed** (Billing, Jobs data/UI/SQL/entitlement/photos/worker, payroll summary and new history contracts).
- Focused payroll suite: **19 passed, 0 failed**, including all 60 synthetic TR cases and lost-response UI retry/frozen reprint assertions.
- Isolated PostgreSQL runner: **12 scenario groups passed**: additive data preservation; disabled activation/TR gate; zero/unknown employee UIF; tenant/role/helper ACLs; complete roster/stale source/retirement validation; atomic concurrent retry; duplicate/overlap/cross-year rejection; self-only saved reprint/immutability; audited edits; subsequent accumulation; four toggle combinations; year rollover and employee-two rollback.
- `node --check`: **32 tracked/new JS/CJS/MJS files**, no syntax errors.
- `git diff --check`: no whitespace errors; Git notes Windows CRLF normalisation.

Commands:

```powershell
node --test tests/billing-pdf.test.cjs tests/jobs-data.test.cjs tests/jobs-ui.test.cjs tests/jobs-sql-static.test.cjs tests/platform-jobs-access.test.cjs tests/jobs-photos.test.cjs tests/jobs-worker.test.cjs tests/payroll-summary.test.cjs tests/payroll-history.test.cjs
node tests/payroll-db-local.cjs
git diff --check
```

No generic build/lint script exists. Billing's bundle build was not needed or run. Existing Jobs database runners were not run. No remote imports fetched. The database runner relies on the already available ignored Windows PostgreSQL runtime under `tmp/jobs-pg-runtime`, uses port 54398, verifies its fresh data directory, and stops its own cluster. Its current-year editor fixtures target tax year 2026 and must be updated when that test year changes. No full Supabase/PostgREST/browser end-to-end or visual/responsive acceptance test has been performed. Existing local `/login` still points at the configured backend; it is NOT an isolated acceptance environment.

## 20. Security/RLS

Manager RPCs require active owner/admin membership and an active company. No invented payroll role. Private definer helpers have explicit revoked public/authenticated execution; fixed search paths. Authenticated financial writes are RPC-only. Prior broad history policies are replaced with owner/admin or linked-self reads. Run headers, which include whole-run payloads, remain manager-only. Employee reprint RPC derives identity from authenticated membership and returns only that employee's frozen document/company/rules, never another employee or the whole request. Tests use reused employee codes across companies. No R2 or service credentials enter these files.

## 21. Migration sequence (not executed live)

First resolve the release blockers in section 23 and rehearse against a schema-equivalent isolated Supabase environment. Review live schema/policy compatibility only under separate authorisation. Obtain a fresh recoverable backup and an approved payroll write pause. Prepare coordinated read-only document/client changes and cache invalidation. Apply ONLY the reviewed new migration in one transaction; do not replay old SQL. Feature flags remain false. Validate schema/ACLs and enable only approved companies; TR also requires its verified parity flag. A flag alone does not coordinate old cached clients.

## 22. Rollback strategy

A migration error inside its transaction rolls back its changes. Before any new finalisation, a reviewed rollback can restore the prior application/access policy after confirming no new records exist. After official records exist, do NOT drop history or restore an old backup blindly: disable new finalisations, retain all run/period/event rows, preserve read-only reprints and fix forward or provide a reviewed compatible client. Never re-enable the old document upsert against new official rows. No destructive down migration is supplied.

## 23. Remaining risks / decisions

This is **not yet approved or verified for production**:

1. Actual TR historical/current parity is outstanding. Synthetic fixtures are not financial certification.
2. No full local Supabase/PostgREST/browser acceptance rehearsal. Fixture schema checks real PostgreSQL semantics but not all existing host policies, constraints, triggers or client networking.
3. Server validates amounts against the submitted snapshot and source revision but does **not independently recompute gross/tax/levies from trusted source data**. An authorised admin can construct a consistent but incorrect snapshot. Decide/implement the required trusted-calculation assurance before production; do not claim that this SQL authenticates tax arithmetic.
4. Revision hashing currently scans the company's history/input rows, including attendance; benchmark realistic sizes. Not all external input writers share its transaction lock, and there is no serialised source-data revision protocol across those writers.
5. Legacy periods lack frozen documents. Do not manufacture or overwrite them; establish a reviewed historical reprint/cutover policy.
6. Backdated non-overlapping finalisation can change later effective YTD without retroactively changing an already official later snapshot. Explicit operational policy remains necessary; no speculative weekly calendar has been introduced.
7. Migration privileges affect all tenants and cached old clients. Production activation requires a coordinated transition, not uploading these files alone. The deliberate loopback-only guard must be replaced through a separately reviewed release configuration, not simply removed casually.
8. Frozen logos currently require PNG/JPEG/WebP up to 2 MB. SVG or inaccessible logos block finalisation; choose a release-compatible treatment if present.
9. Correction UI/API and permanently versioned PDF renderer/artifact storage remain deferred. A manual effective-YTD adjustment is not a corrected historical payslip.

## 24. Production actions still required

None are authorised by this report. After the above gates are satisfied, obtain explicit approval for: the exact migration and cutover window; target-company activation; release-mode configuration/cache changes; commit/push and deployment as separately requested. Rehearse the reviewed schema migration once on isolated equivalent infrastructure, execute the approved production migration transaction during the controlled cutover, validate permissions and unchanged protected values, activate only approved companies, deploy the reviewed client with coordinated asset/service-worker versions, and perform authorised scoped smoke tests. Keep PVS correction separate. Do not activate TR merely because a flag exists or synthetic tests pass.
