# Payroll pre-production review — updated 18 September 2026

## Current LOCAL result (supersedes the historical assessment below)

HEAD remains `1a9830b542e68211e453b5ace7e48d3ce6a35361`, branch `feature/shiftly-jobs`. These are uncommitted local fixes. No push, deployment, live migration, fresh production reads, TR mutation or PVS access occurred in this continuation.

| Original blocker | Current result |
|---|---|
| Local backend/browser blocker | **FIXED locally.** Explicit local flag plus loopback frontend/backend permits client construction. Actual UI login, preview, confirmation and reprint ran against disposable PostgreSQL. |
| Manipulated financial payload blocker | **FIXED in local implementation/tests.** Clients cannot call either amount-commit function. The service calculates from trusted database inputs and rejects monetary request fields and altered tokens. |
| Stale finalisation race blocker | **FIXED in local implementation/tests.** Material writers share the finalisation transaction lock, and commit revalidates the source revision. Both race orderings passed. |

**Overall production gate remains withheld.** Visual popup/print acceptance and a real isolated Supabase/Deno/schema-equivalent rehearsal remain incomplete. Local fixes are not a claim that every release criterion passed.

### How authority now works

`public/payroll-engine.js` holds the shared calculation functions/constants; host functions delegate to it. `src/payroll-authority.js` runs that same module on the server. No second independent SQL financial engine was introduced. Server date operations use South African wall time independently of server timezone. Existing company-specific cumulative eligibility and TR continuity are retained.

- Preview sends only `{action:'preview', c, start, end, levyWeeks}`.
- Supabase Auth verifies the caller. `get_payroll_calculation_inputs` runs with their JWT and checks manager/company access and activation. It loads company, rules, employees, selected-period attendance/deductions/adjustments, deduction types, applicable NBCEI levy and authoritative history. A matching saved levy selection is retained; otherwise the same shared builder handles the explicit 4/5-week choice.
- The service calculates gross, adjustments, retirement/levies, PAYE, UIF, net and document/YTD context. It returns the calculated rows and a 15-minute HMAC token binding actor, company, dates, choice, revision, calculation fingerprint and engine version.
- Confirmation sends only `{action:'finalise', c, request, token}`. Monetary values and employee rosters are not browser inputs to finalisation. The service reloads trusted inputs, recalculates and checks the signed fingerprint.
- Only its private service credential can call `commit_trusted_payroll`. The internal `finalise_payroll` is not executable by ordinary clients either. SQL retains membership, activation, atomic whole roster, consistency, duplicate/overlap, single-tax-year and immutability checks.
- A matching successful request is returned on retry, including a request that committed between the first lookup and a later stale/unknown-response error. A different confirmation cannot reuse its request ID.
- Logos are fetched only from the configured Supabase company-logo public Storage path, without redirects, with MIME/2 MB bounds, and embedded. Service/signing credentials never go to the client.
- Employee preview uses the new self-only YTD reader, including audited adjustments; saved self-reprints remain self-only.

### Staleness/concurrency mechanism

BEFORE INSERT/UPDATE/DELETE triggers lock the company on companies, memberships, employees, rules, deduction types, clock events, deductions, adjustments, levy periods, openings, period totals and financial events. Cross-company moves lock both IDs in sorted order. Ordinary client TRUNCATE rights are revoked. Finalisation takes the same transaction lock and rechecks membership/revision.

If an input writer wins first, finalisation waits then rejects the obsolete revision. If payroll wins first, the writer cannot commit between revision validation and payroll commit; it applies afterward. The UI displays **“Payroll inputs changed. Run Payroll again and review before finalising.”** It does not silently approve recalculated money. Unknown-response retries keep the same request/token. Privileged maintenance must not bypass triggers; large-company lock/hash cost still needs rehearsal.

### Fresh checks

- Original nine-file suite: **148 passed, zero failed**.
- New HTTP-adapter suite: **3 passed** (local/production allowlists, authenticated money-field rejection, shared globals execution/service-only commit/signature tamper/retry). Edge TypeScript was parsed offline and executed in a VM with mocked HTTP; not deployed/run in the Deno service.
- PostgreSQL: original **12 groups retained and passed**, plus **19 new authority/security groups**, **31 total**. Original internal money fixtures now enter through the private service boundary; authenticated calls to either commit function are explicitly denied.
- New groups cover six manipulated financial/roster fields; role/private RPC bypass; stale employee settings, independent toggles, YTD edits, deduction types and attendance; calculate-to-commit race; simultaneous identical confirmation; lost-response retry; unchanged successful full run; exact saved/calculated amounts and document equality; duplicate/cross-year guards; and a writer observed waiting on the advisory lock until payroll committed.
- TR: **70 deployed-source/shared-engine comparisons matched**, zero numeric differences. The actual authority calculator separately matched **50 calculated employee results** and rejected the same **20 September scenarios**. September remains expected 6 completed periods/found 5. This is not 70 successful finalisations.
- TR used only the existing authorised capture. No missing period/history was created. July retained saved levy inputs; August used labelled equivalent choices. Actual captured current PAYE is zero; the separate 60 synthetic cumulative cases cover nonzero PAYE. This is regression evidence, not statutory certification.
- JS syntax and `git diff --check` were checked locally. No payroll build command exists; no unrelated Billing vendor rebuild was needed.

### Actual browser evidence and limitations

`tests/payroll-browser-local.cjs` starts a disposable loopback PostgreSQL cluster with real migration/RPCs. `tests/payroll-browser-gateway.cjs` supplies synthetic owner/employee Auth and a minimal PostgREST-compatible gateway. Application HTML/JS is real, not injected authenticated UI state. **The gateway is a test substitute, not the actual Supabase server distribution.** Backend connections were loopback-only; no production config/credentials were served.

| Browser scenario | Observed result |
|---|---|
| Run Payroll / PDF chooser | Actual UI calculated two synthetic employees and opened chooser |
| Summary, payslip, repeated payslip generation | Actions returned without error; zero financial rows before confirmation |
| Check beside PDF / confirmation / Cancel | Position and company/dates/two-employee count verified; Cancel created no financial rows |
| Successful confirmation | One two-employee run; PAYE 3381.00 and employee UIF 177.12 per employee, once |
| Reprint / rerun saved dates | Finalised status, disabled finalisation button, unchanged amounts |
| Owner YTD edit | E1 targets 3400.00 PAYE / 180.00 UIF produced audited deltas 19.00 / 2.88; original period unchanged |
| Two-tab stale preview | October confirmation rejected after second tab's YTD edit; no new run |
| Overlap | 10–25 September rejected against saved 1–18 September |
| February/March | 20 February–5 March preview allowed, confirmation disabled with explanation |
| Independent fields / zero defaults | Both, PAYE-only, UIF-only, neither verified after authoritative refresh; new employee showed 0.00 / 0.00 |
| Employee permissions | Self dashboard only, no finalisation/YTD editor; own saved-payslip request exercised; SQL denial tested separately |
| Forged money / simultaneous retries | Service/SQL regression evidence, not browser DevTools injection |
| Actual generated popup/print appearance | **NOT VERIFIED**: browser-control surface did not expose `window.open` document windows. Button actions and read-only behaviour are verified, not visual PDF output |

Old development service-worker caches were encountered: an obsolete UI call was denied by the new ACL and saved nothing. New script query versions loaded the token-based path (observed authority POSTs). Cached same-origin fixture REST reads required fresh authoritative preview for changed test flags. Production API is cross-origin, but asset/cache cutover must still be coordinated. No global security/caching relaxation was made.

### Remaining risks and exact release order — proposal only

1. Finish popup/print visual acceptance in a browser exposing those windows. Rehearse the real Edge entrypoint with isolated Supabase/Deno and schema/policies equivalent to deployment. VM/gateway tests do not replace this.
2. Review actual material input/write paths and grants from an explicitly authorised schema snapshot; load-test revision scan/lock cost. No production inspection was done here. Preserve legacy totals and TR's continuity condition; PVS correction stays separate.
3. Obtain explicit approval for the final migration hash, targets, rollback, endpoint/origins and each Git/release operation. The frontend deliberately remains **loopback-only**: a reviewed production activation/config path must be prepared, not assumed present.
4. With approval, back up/checkpoint and pause financial writes for cutover. Verify schema/policies, then apply **only** `20260917100000_payroll_finalisation.sql` once, transactionally. Never replay old setup/backfills. Leave activation flags false initially.
5. Deploy the reviewed authority with backend-only service credential, private confirmation secret and exact HTTPS origins. Check authentication and private RPC ACLs before activation.
6. Deploy the approved client/config/shared assets with coordinated HTML query versions and service-worker precache/cache version. Require old clients to reload: the migration closes their old direct-upsert path.
7. Activate only explicitly approved tenants. TR additionally needs its parity flag, with unchanged continuity. Run the approved one-contribution/reprint smoke workflow and end the pause.
8. On failure, stop finalisation/disable activation and preserve runs/events. Do not delete history, reopen browser monetary writes or blindly restore old code. Recovery is a coordinated roll-forward/config fix; data restoration requires separate approval.

Other limits: legacy rows without snapshots, backdated period policy, no general correction API, logo restrictions, future renderer changes and broad revision cost. Local fixture evidence/private captured data remains ignored under `tmp/`. Nothing has been committed or released.

---

## Historical assessment — 17 September 2026, BEFORE the fixes

The text below preserves the original findings. Its statements about vulnerabilities being unfixed are historical, superseded by the current section above.

**Decision: do not migrate or deploy this version.** This review found concrete blockers, not just missing test coverage. No application or migration fixes were made during this validation pass. The earlier uncommitted implementation is preserved.

Branch `feature/shiftly-jobs`; HEAD remains `1a9830b542e68211e453b5ace7e48d3ce6a35361`. No commit, push, deployment, live migration or live payroll mutation. No PVS records were queried or changed. Explicitly authorised TR-only production reads used GET requests; credentials stayed in local process memory and were not printed or copied into reports. Fresh isolated PostgreSQL databases were the only database write targets.

## 1. TR parity results

Read-only collection returned one TR company, 10 employees, 10 opening balances, zero stored payroll-period totals, three saved levy configurations, no payroll deductions/adjustments and 287 clock events in the bounded July–September range. The same captured dataset fed both paths; comparisons did not change TR records.

The OLD calculator is the freshly retrieved deployed `https://shiftlyapp.co.za/app.js?v=197`, not merely a historical Git assumption. Its SHA256 is recorded with private evidence. The NEW calculation functions came from current local `public/app.js`; its YTD inputs came from the new SQL reader running against the copied TR records in an isolated PostgreSQL fixture. Supplied context was adapted using `public/payroll-history.js`. This is an offline engine/reader comparison, not a claim that the blocked browser path ran successfully.

| Selected period | Levy basis | Employee comparisons | Old continuity | New continuity | Monetary/input differences |
|---|---|---:|---|---|---:|
| 1–28 July 2026 | Saved 4-week configuration | 10 | Pass | Pass | 0 |
| 1–29 July 2026 | Saved 5-week configuration | 10 | Pass | Pass | 0 |
| 1–30 July 2026 | Saved 5-week configuration | 10 | Pass | Pass | 0 |
| 1–31 August 2026 | Equivalent 4-week selection | 10 | Pass | Pass | 0 |
| 1–31 August 2026 | Equivalent 5-week selection | 10 | Pass | Pass | 0 |
| 1–17 September 2026 | Equivalent 4-week selection | 10 | Blocked | Blocked | 0 diagnostic differences |
| 1–17 September 2026 | Equivalent 5-week selection | 10 | Blocked | Blocked | 0 diagnostic differences |

**70 employee/period-scenario comparisons; zero exact numeric differences** in gross, provident, PAYE, employee UIF, net, previous gross/retirement/PAYE, opening completed count, prior period count and calculated resulting effective PAYE YTD. Six key calculation functions are identical between deployed and local source: `calculatePayroll`, `buildTrElectricalPayrollBreakdown`, `trElectricalAutomaticLevyDeductions`, `calculateCumulativePaye`, `statutoryDeductionRows`, `attachAdjustmentsToPayrollRows`.

Employee-by-employee monetary table and detailed context/levy/breakdown/deduction/YTD objects are private local evidence under `tmp/payroll-tr-parity-REF2SK/comparison.md` and `comparison.json`. Raw read-only records and copied production source are in that same ignored folder. They must not enter Git. The table uses employee codes; the underlying private fixture contains payroll data.

Limits: the saved levy configurations are not proof of successful historical payroll finalisation. There is no saved August/September levy choice, so 4 and 5 weeks are explicitly alternative equivalent-input scenarios, not invented historical facts. Captured current rates/memberships cannot prove what every historical employee setting used to be. The captured actual cases produced zero current PAYE; this does not replace the earlier synthetic nonzero-PAYE regression coverage or historical payslip certification. September diagnostic calculations were compared after recording the continuity rejection, not presented as successful payroll runs. No period was created to make the comparison pass.

## 2. TR differences and existing data condition

No unexplained old/new monetary differences were found in these cases. Both September paths report **expected 6 completed periods, found 5**: the openings contain five completed periods as of 31 July, and the captured period table contains no later finalised rows. This is a pre-existing continuity/data condition, not a difference introduced by the new reader. It prevents claiming a successful current September workflow. No repair or manufacture of August history occurred.

Reader semantics are not identical for every imaginable legacy date range: the old reader admits openings before the selected end and prior rows whose start is before selected start; the new reader requires an opening before selected start and a prior row ending before it. Legitimate non-overlapping forward periods match in this dataset. Overlapping opening/legacy-history edge cases still require explicit cutover treatment rather than assuming universal equivalence.

## 3. Browser acceptance results

Actual browser navigation to an isolated static server at `http://127.0.0.1:5197/login` loaded the unchanged application with a loopback-only test configuration. A content-security policy restricted backend connections to the local origins. No real production credentials were served. The page displayed:

> Test Supabase is not connected yet. Paste the new project URL and anon key into public/config.js.

Root cause: `public/app.js:116` accepts only HTTPS `*.supabase.co` URLs to construct `sb`; `public/payroll-history.js` requires a loopback backend to enable the new feature. A real local URL makes `sb=null`; a hosted Supabase URL disables the new payroll bridge. **There is no configuration satisfying both guards.** This is an implementation integration defect. An isolated test backend alone cannot fix it; injecting a fake authenticated state or editing the served guard would mask it.

| Requested browser scenario | Actual browser result | Separate existing evidence |
|---|---|---|
| Run Payroll; Generate Payslip twice; Generate Summary; repeated preview | Blocked before login/client creation | Source/DOM tests remove financial writes |
| Check next to PDF; correct company/dates/count; cancel | Authenticated panel unreachable | Markup placement and DOM confirmation tests only |
| Confirm; exactly one run and one YTD increment | Not executed in browser | Isolated PostgreSQL atomic/retry tests pass |
| Reprint; reload without YTD change | Not executed in browser | DOM frozen-row and database read-only tests pass |
| Duplicate and overlapping finalisation | Not executed in browser | Server rejection tests pass |
| February/March block | Not executed in browser | Helper and SQL boundary tests pass |
| Four toggle combinations; R0.00 without opening; audited edit | Not executed in browser | Snapshot/SQL tests pass; visual fields unaccepted |
| Normal employee cannot edit YTD | Not executed in browser | Role/RPC denial tests pass |
| Payslip appearance and functionality | No full visual regression acceptance | Existing summary/PDF tests pass |

These rows are deliberately not reported as browser passes. The complete acceptance sequence remains blocked, not complete.

## 4. Backend/database acceptance

The existing isolated database runner again passed 12 scenario groups: preservation; activation/TR gate; zero/unknown UIF; role/tenant/helper restrictions; complete roster/stale revision/retirement consistency; atomic concurrent retries; duplicate/overlap/tax-year rejection; self-only reprint/immutability; audited adjustment; accumulation; toggles; rollback/year rollover.

Two additional controlled probes against disposable fixtures reproduced security failures:

1. With a current revision and authorised owner, a payload replacing both employees' gross with 12,345, PAYE with 1 and UIF with 0, and making the document snapshot agree, **was accepted**. No trusted source recomputation rejected it.
2. A test-only trigger paused insertion after revision validation. Another connection changed an employee rate before insertion resumed. Finalisation **still committed the old snapshot**. All test hooks and mutations existed only in the disposable local cluster, which was stopped afterward.

The fixture program exited successfully because it asserted the current vulnerable behaviours. These findings are **failed security acceptance criteria**, not mitigations or security-test passes. The original 12 passing groups do not cover them.

## 5. Server trust-boundary assessment

### Browser-calculated values

Attendance grouping/approved-event filtering, hours/day counts, overtime, rate-derived gross, adjustments, provident and other TR levies, statutory PAYE and UIF, cumulative annualisation/retirement allowance inputs, total deductions, net and rendered YTD. These are currently browser JavaScript results. Existing company/rate/deduction sources can be fetched from the database, but the final money is submitted by the client.

### Exact finalisation request

`finalise_payroll(c, request, payload)` receives company UUID, client request UUID and JSON containing:

- `version`, `start`, `end`, `revision`;
- company `{id,name,logo_url}` with optional embedded logo;
- normalised rules and levy snapshot;
- all rows: `employee_id`, rounded `gross_remuneration`, `retirement_fund_contributions`, `paye_deducted`, `employee_uif`, and the full `document_row` (including gross, deductions, breakdown/net/YTD and rendering information).

### What the database independently verifies

Active company and owner/admin membership; activation flags; same-request replay; supported version; current revision at the check; ordered dates/single tax year; distinct full active roster/company identities; company name/ID and logo representation; PAYE/UIF toggle agreement; normal period non-overlap; period count and applicable TR continuity; decimal/range checks; gross matching document gross; PAYE/UIF/provident matching their supplied deduction sums; transaction, actor/timestamps and immutable storage.

It does **not** independently derive actual payable hours, gross from attendance/rates, correct levy amount, retirement treatment, correct annualised PAYE/UIF, or all net/YTD snapshot fields from trusted inputs. Most rule fields and the levy snapshot are not independently matched to source configuration. A self-consistent payload is not necessarily a correct payroll.

RLS/roles answer **who may act**, not **whether the payroll arithmetic is correct**. Current financial correctness substantially trusts the authorised browser. An admin permitted to edit rates or make audited YTD adjustments is not thereby authorised to silently invent an official calculation through a tampered request.

## 6. Exact stale-finalisation protection

UI checks company/session/date context, current run identity and cloned row/rule fingerprints. Inputs are freshly loaded and database revisions compared around calculation. The server hashes company, rules, employees, openings, periods, financial events, deductions, adjustments, levy periods and clock events, and rejects a payload with an older revision at its validation point. A repeated identical request returns the original saved result even after history changes, which is correct idempotency.

Limit: the company advisory lock serialises only participating finalisation/YTD RPCs. Existing attendance/employee/rule writers do not all acquire it. A source mutation after the revision check but before commit is not prevented; the controlled probe reproduced this. Comparing the same hash again without a shared locking/version protocol would still leave another race window.

## 7. Exact manipulated-payload protection

Unauthorised users/other tenants are denied; malformed, incomplete, inconsistent or duplicate payloads are rejected. **An authorised, well-formed, internally consistent arbitrary financial payload is not prevented.** This was verified locally, not merely inferred.

The stable JSON row/rule comparison is browser-side change detection, not a signature. The `revision` is an MD5 of database inputs, not an HMAC over trusted calculated money; an authorised caller can obtain the current revision and attach arbitrary amounts. Exact saved payload comparison protects replay consistency for one request UUID. Neither establishes payroll arithmetic integrity. Switching the hash algorithm alone would not fix this.

## 8. Recommendation: shared trusted calculation before production

Yes: independently calculate the authoritative result before production finalisation. Keep one calculation engine; do not port payroll arithmetic separately into SQL.

Smallest defensible approach:

1. Extract the existing calculation functions/constants unchanged into one pure shared module, passing company/date/rules/levy/YTD inputs explicitly instead of reading browser globals. Freeze equivalence with deployed TR results before using it.
2. A trusted backend endpoint authenticates the caller and loads authorised source data itself, then runs that same module. The client sends selected dates/explicit allowed choices, not authoritative amounts.
3. Bind the calculated candidate to the source version and authorised company/actor; commit via an internal-only transaction that revalidates a source version with a concurrency protocol honoured by relevant writers. Consume the candidate/request once and reject stale sources. Do not leave a public amount-submission RPC as a bypass.
4. Return/store the server-calculated snapshot for preview/confirmation/reprints. Keep the current confirmation UI and idempotency/overlap safeguards.

This is a bounded follow-up, but not a one-line check: functions currently depend on browser/global company/date state; trusted loading, runtime packaging and cross-writer concurrency require work. The local VM comparison proves reuse is feasible, not that a production endpoint exists. Adding numeric bounds, signing client-provided money or rechecking only PAYE against client-provided gross is insufficient. No redesign/extraction/endpoint was implemented during this assessment.

## 9. Implementation/report discrepancies

Re-reviewed all 24 sections against current files. The old report now has a prominent pointer to this review; its earlier date-scoped test claims are retained rather than silently rewritten.

| Earlier sections | Review |
|---|---|
| 1–3 files/schema/document separation | Accurate source description; migration also tightens permissions globally, not merely additive schema |
| 4 workflow; 12 editor; 14 visible toggles | Conditional implementation only; cannot currently run end-to-end due to incompatible URL guards |
| 5–8 transaction/retry/overlap/count | Existing tested behaviour accurate; does not imply independent money verification or fully serialised input changes |
| 9–11 ledger/defaults | Present; new admin reader handles adjustments, but ordinary employee pre-finalisation previews still select the legacy reader because `canUseCompanyDashboard()` is false. They can omit new adjustments; official self-reprints use the saved snapshot |
| 13 adjustments | Append-only delta behaviour present; shared-input concurrency and backdated-period policy remain incomplete |
| 15 tax year | Explicit SQL/helper crossing block present; browser acceptance not passed |
| 16 immutable/corrections | Immutable records present; correction columns are scaffolding, not an implemented correction workflow or independently versioned PDF renderer |
| 17 TR | Prior synthetic evidence accurate for its date; superseded/extended by this real-data comparison, with limits and September continuity block |
| 18 protected data | PVS remains untouched; actual other tenants not audited |
| 19 tests | 148 offline and 12 SQL groups reproduced; no full browser success; additional probes expose defects |
| 20 security | Role/RLS protections exist; they do not establish calculation correctness. Input race remains |
| 21–22 migration/rollback | Proposed only; would need reviewed exact execution/rollback artifacts and coordinated cache/client transition |
| 23–24 risks/release | Production correctly withheld; blockers now demonstrated, not hypothetical |

Additional design clarification: the ledger/editor is common, but automatic cumulative PAYE eligibility still uses existing company-specific takeover gates. This preserves TR arithmetic; it is not a universally generalised cumulative calculator. Source/report must not imply otherwise. Header “Not Finalised” is not an authoritative legacy-period classification when the new reader is disabled.

## 10. Current checks

- Nine offline test files: **148 passed, 0 failed**, rerun in this review.
- Existing isolated PostgreSQL acceptance: **12 groups passed**, rerun as part of the trust probe.
- Real TR engine/reader comparison: **70 scenarios matched numerically**, including 20 blocked diagnostic scenarios. Not 70 successful finalisations.
- Actual browser acceptance: **blocked/failing at local client initialisation**; remaining workflow not run.
- Manipulated payload acceptance protection: **failed**.
- Concurrent source-change protection: **failed**.
- `git diff --check`: passed (Windows line-ending notices only).

Only reports and ignored validation/evidence scripts were added/updated during this pass. Existing application/migration files were not changed. Private reproduction artifacts: `tmp/payroll-tr-readonly.cjs`, `tmp/payroll-tr-local-ledger.cjs`, `tmp/payroll-tr-compare.cjs`, `tmp/payroll-trust-audit.cjs`, `tmp/payroll-acceptance-server.cjs`. The collector is the only script that performs the explicitly authorised TR GET reads; the others use local files/fixtures. Do not run it later without appropriate read authority.

## 11. Remaining production risks

Browser integration defect; arbitrary authorised financial payloads; input-update race; employee preview reader divergence; pre-existing TR September continuity block; lack of actual historical nonzero-PAYE finalised snapshots in the available capture; incomplete browser/PDF acceptance; full schema/policy-equivalent Supabase rehearsal still missing; broad revision-hash cost; legacy records without snapshots; backdated period policy; coordinated migration/client/cache transition; no implemented correction API; logo restrictions and future renderer changes. PVS reconciliation is expressly excluded.

## 12. Exact remaining steps before migration/deployment

1. Approve targeted local fixes/approach, not production: align the local connection guards without permitting production test fallback; align employee preview YTD reads.
2. Implement and regression-test shared trusted calculation plus a source-version/locking protocol; remove public client-money bypasses. Retest the two demonstrated probes expecting rejection/retry.
3. Run the complete requested browser workflow against a real isolated Supabase/backend environment with synthetic payroll data; include reload/role changes and actual payslip/summary visual checks.
4. Keep TR unchanged. Confirm whether the captured missing later history is expected and obtain an authorised representative historical/current baseline if further certification is required. Do not create a missing period merely to satisfy the gate. Re-run real-data equivalence after any engine extraction.
5. Rehearse the reviewed migration and permission changes on schema-equivalent isolated infrastructure; prepare exact cutover/rollback instructions and cache coordination. No historical SQL replay.
6. Return updated evidence and request explicit approval for production migration, target activation and deployment. Commit/push remain separately unapproved. PVS corrections remain a separate future task.
