# Final Jobs repository checkpoint — 11 September 2026

## Scope and Git baseline

Repository-only review requested by the user. No production connections, SQL execution, migrations, entitlement changes, pushes or deployments were performed during this audit. Earlier deployment checks in jobs-next-phase.md are historical, not fresh verification.

- Branch: `feature/shiftly-jobs`.
- Starting HEAD: `b1e984488d7f608ca8c817e568f5c1df50500d91`.
- Starting staged / unstaged / untracked files: none; working tree clean. No accidentally uncommitted Jobs implementation found.
- Last application commit: `c518ac3` (compact supervisor mobile rows).
- Recent relevant history: `446b1da` stacked status/action, `99ca0ae` supervisor tab cleanup, `6ecc1bb` filter typography, `7512d97` compact search/filter menu, `1fb393e` cancellation menu typography.
- The deployment worktree also started clean at b1e9844. No remote freshness claim is made: no fetch or remote query was used in this audit.
- Final audit changes are this document and ignore-file hardening only. The local commit containing this document is the final checkpoint; no empty commit or history rewrite is needed.

## Repository hygiene

- Ignored local files/directories exist: .env, .env.local, .firebase, .vercel, node_modules, supabase/.temp, tmp, server logs and a local workspace file. Retained untouched; never stage these wholesale. Their credential values were not disclosed or audited.
- `Clocking System.code-workspace` is already tracked despite the later workspace ignore rule. It contains only a relative current-directory entry. Harmless legacy editor metadata; retained, not silently removed.
- Tracked test/preview utilities under tests and scripts are intentional source, not generated outputs. They are outside Firebase's public directory and Vercel's configured public build input. Generated preview/debug outputs belong in ignored tmp/ or logs.
- Billing PDF bundle and accompanying license files under public/vendor are intentional deployable generated assets. Rebuilding reproduced their tracked content.
- Heuristic scan of 88 tracked text/code files found no matches for private-key blocks, AWS access-key IDs, GitHub token formats or Supabase secret-key formats. This is not an exhaustive secret/history scan.
- public/config.js contains a public Supabase URL and a JWT with role `anon`; that browser key is not a service-role secret. Its `test` label/comment does not prove the target database is disposable. No connection was made.
- Ignore coverage already included caches, logs, node_modules, tmp and common local files. Added coverage for .env variants and common credential-file names, retaining example environment templates. Existing ignored files were not deleted.

## Current implementation review

Evidence: public/app.js host integration; public/jobs.js UI and guards; public/jobs-data.js adapters; the two Jobs SQL migrations; all five automated test suites. Results below establish repository implementation and simulated-transport behavior, not current production database installation or real-device visual acceptance.

| Area | Current implementation / validation |
| --- | --- |
| Company entitlement | jobs_enabled defaults false in SQL. UI gates fail closed on false/missing entitlement, missing identity and refresh failure. SQL actor/access checks also require active company and membership. |
| Platform Jobs Access | Platform-admin-only control updates only the selected company's jobs_enabled with a concurrency predicate; failure restores UI state. Does not grant platform admins implicit company Jobs membership. |
| Admin / Owner | Company-scoped dashboard groups, counts, All Jobs search/filter dropdown, Create Job and job-detail workspace. Team editing is a compact pencil; cancellation is in the more-actions menu. |
| Supervisor | Only assigned Jobs; Current, Continue, Scheduled, Awaiting Review and Recently Completed groups. Overview is details-first; Today's Work owns work controls, Sign-off owns submission, Job Records contains collapsed history. |
| Create / lead / team | Atomic create_job_with_team RPC; explicit schedule intent; backend number returned. Lead directory uses active linked supervisor accounts; legacy supervisor code matching is presentation-only. Lead selection auto-selects its employee card. Assignment/removal/replacement use revision-controlled RPCs. |
| Scheduling | Manager-only draft/scheduled transition; date alone does not schedule. UI validates date/time input and end order. |
| Start / continue / finish | Assigned active supervisor starts own session. Finish requires meaningful work, records a daily work record and closes only their own session. Job stays in_progress; Paused/Continue is a derived display state. No attendance clock writes. |
| Multi-day Jobs | Subsequent sessions append work records to the same Job. Admin Work Record shows latest two with internal scrolling; Review shows latest one with dynamic totals and scrolling. Original numbering/history retained. |
| Open sessions | SQL advisory lock and unique open-session index enforce one open Job session per employee per company. Review/completion/cancellation block on open sessions. No automatic close on company switching or deactivation. |
| Emergency close | Manager action with reason and explicit UI confirmation; preserves original start and logs recovery without fabricating completed work. |
| Submit / correction / resubmit | Assigned active lead submits meaningful recorded work with no open sessions. Manager returns submitted Job with reason; lead can continue and resubmit. Current submission does not require a signature. |
| Completion | Manager approves submitted Job; no open sessions and valid lead required. Backend creates historical completion snapshot; completed detail uses that snapshot. |
| Cancellation | Manager-only reason/confirmation flow preserves history; no hard-delete UI. Mobile menu hiding is presentation, not device-based authorization. |
| Numbering | Per-company/year counter, atomic increment, company/number uniqueness, JC-YYYY-NNNN format. Failed atomic creation rolls back associated work. |
| Isolation / restrictions | Company-scoped reads, SQL RLS and explicit RPC authorization; employee/billing/viewer roles do not get Jobs. Foreign-key company scoping and pinned definer search paths are present. |
| Company switching | Generation/context checks discard stale async results; clear rows, directories, drafts and dialogs on switch/sign-out/access loss. Unknown mutation outcomes require refresh, not blind replay. |
| Supabase adapter | Live UI uses scoped paginated reads and explicit planning/execution/review capabilities. Only validated material entry is exposed from generic evidence operations. No direct Jobs table writes from the live UI. |
| Demo isolation | Mock/demo requires local/file host plus explicit demo mode; production hostname cannot create mock adapter. Demo fixtures do not establish live functionality. |
| Header / navigation | Uses host navigation handlers and clears Jobs on exit; active Jobs shortcut hidden; Supervisor scanner route preserved. |
| Billing / other modules | Jobs entitlement update changes only jobs_enabled. Billing loader fallback/navigation gates remain separate and tested. Existing host modules are reused, not replaced; this is not exhaustive payroll/attendance regression coverage. |

## Intentionally incomplete / limitations

1. **Photos:** live upload/capture, object storage, authorized retrieval and actual photo rendering are not enabled. Demo photo UI is not live storage.
2. **Client signature sign-off:** live capture is disabled; no end-to-end stored signature image retrieval/rendering. Submission currently works without it.
3. **Testing & Results:** live entry UI/API capability is not exposed, although normalization and backend evidence scaffolding exist.
4. **Media Storage:** mediaPersistence is false; this audit does not verify or provision bucket/policy configuration. Stored metadata scaffolding alone is not a working media pipeline.
5. **Notes:** work-day notes persist with Finish Work for Today; separate standalone note entry is not exposed live.
6. **Materials:** working live entry path with validation, revision guard and work-session linking; do not confuse this with unsupported general evidence/media operations.
7. **Job Card / PDF:** HTML Job Card and print styles exist, including stored completion snapshots. The Download PDF action invokes window.print; it is not a direct generated/downloaded PDF pipeline like Billing's bundled PDF renderer. Output depends on browser print settings. No live photo/signature embedding is complete. This audit did not open a print preview or perform visual PDF QA.
8. **Work days terminology:** count is persisted finished work records/sessions, so multiple records on one calendar date can count separately. Existing behavior retained.

## Check results

- All discovered `tests/*.test.cjs`: **106/106 pass** (UI, data, SQL static, platform access, Billing PDF).
- `node --check`: **20 tracked JS/CJS/MJS files pass**.
- Supabase invite-function TypeScript: offline esbuild TypeScript parse/transform passes. Not a Deno typecheck; remote imports were not fetched.
- `npm run build:billing-pdf`: passes, no tracked output content changes.
- `git diff --check`: passes.
- No generic test/build/typecheck/lint script beyond the Billing scripts exists in package.json. Test files were enumerated explicitly.
- Database validation/psql scenario runners were inspected but NOT executed: they create fixture databases and execute migration SQL, outside the user's no-migrations constraint. Database enforcement is reviewed statically and through simulated tests, not freshly exercised against PostgreSQL.

## Deployment and handover cautions

- `.firebaserc` defaults to shiftly-21919, but `.github/workflows/firebase-hosting-pull-request.yml` still targets legacy clocking-app-d926c and its legacy service-account secret reference. This is a real deployment-configuration mismatch for PR previews. Left unchanged because retargeting CI credentials/project is not a safe incidental Jobs UI fix. Review before using automatic PR previews.
- No application source changed in this checkpoint; no deployment is necessary for the local documentation/ignore updates. Production state was deliberately not rechecked. The user's explicit no-push/no-deploy instruction overrides the earlier standing deployment preference for this audit.
- Future work remains the three items in jobs-next-phase.md. Do not start it as part of this checkpoint.
