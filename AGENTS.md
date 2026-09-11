# Shiftly agent operating instructions

## Start here

Read this file and `CODEX_HANDOVER.md` completely before changing anything. Then read the relevant module source and the applicable `docs/` evidence. These files preserve the September 2026 account-migration checkpoint; they are not proof that the repository or production has remained unchanged.

- Inspect `git status`, branch, HEAD, worktrees and the proposed diff first. Never discard or recreate existing user work.
- Expected migration baseline: `feature/shiftly-jobs` at `cd5b860d6db356060ae3689f0c08fe65241ca8ab`. The migration adds only these two root documents, uncommitted. Do not mistake them for accidentally unfinished application work.
- The user may use `/confirm` to ask for agreement or a plan. That is discussion only, not implementation approval.
- Work only on the requested task. Do not turn an audit, checkpoint, bug explanation or handover into feature development or a redesign.
- If source, old documentation and chat disagree, inspect current code and Git evidence; explain the discrepancy. Never promote a proposal, fixture or screenshot into a verified live feature.

## Deployment and Git authority

**Do not deploy merely because work is finished. Commit, push, merge, branch-switch and deploy only when the user explicitly requests the relevant action.** Historical conversation and `docs/jobs-next-phase.md` contain an earlier “deploy requested fixes” preference. The migration instruction supersedes that as a standing default.

- Do not automatically stage all files, create an empty commit, squash, reset, rebase, delete a branch or rewrite history.
- The `main` branch is checked out in `C:/dev/Final/Shiftly Marketing Launch`. The Jobs development worktree is `C:/dev/Final/Swiftly - Copy`. Inspect both before any explicitly authorized release; do not assume they match.
- `cd5b860` is a local checkpoint; cached `origin/main` and local `main` were `b1e9844`. Do not assert remote freshness without authorized verification.
- Firebase's intended Shiftly project is `shiftly-21919`. The PR-preview workflow still references legacy `clocking-app-d926c`; report and obtain direction before touching it.
- Do not use deployment commands copied from README or an old runbook as authorization.

## Production and database safety

- Treat the configured Supabase project as live/sensitive regardless of a `test` label in `public/config.js`.
- No production browsing, login, SQL, migrations, entitlement changes, Storage changes or cloud writes for an ordinary repository audit. Request explicit scope if needed.
- Never run `supabase db push`, migration replay, schema reset, blanket setup SQL or a test database runner as an incidental check.
- `database/` includes historical setup, data backfills, company-specific changes and destructive/replacement statements. It is not a safe sequential bootstrap.
- Attendance auto-close migrations can immediately process stale events and schedule cron. They are not read-only validation.
- The Jobs foundation was reported installed in historical context. **Do not rerun it.** Frozen migration: `supabase/migrations/20260904100000_jobs_foundation.sql`; expected SHA256 `8d6ecee456cd0ab7a8c63e27d7ea36225414868fe23abf2c68856eba97935f5d`. Resolve byte/line-ending differences rather than altering approved SQL.
- The staging wrapper has explicit project checks and disables writes. Do not bypass those checks or repurpose the production-linked worktree as staging.
- Preserve RLS, explicit RPC authorization, fixed definer search paths, company-scoped keys, active membership/employee checks, revision guards and locks.
- UI hiding is not authorization. A hidden mobile cancellation menu does not create a desktop-only backend permission.

## Architecture and module boundaries

This is a static vanilla HTML/CSS/JavaScript application, not React/Next or an Expo app in this repository.

- Marketing: `public/index.html`, `public/marketing.js`, `public/marketing.css`; `/billing` is a public Billing marketing page.
- Authenticated operation: `/login`, `public/login.html`, `public/app.js`.
- Jobs: `public/jobs.js`, `public/jobs-data.js`, `public/jobs.css`, two Jobs migrations and tests. Use the host authentication/navigation bridge; do not invent a second app shell.
- Billing documents: `public/app.js` plus `src/billing-pdf.js`; generated deployable bundle under `public/vendor/`.
- Shared infrastructure: Supabase, `public/config.js`, Firebase/Vercel routing, PWA manifest/service worker.
- Avoid broad edits to the large `app.js` monolith. Trace callers, state and database effects before small scoped edits.

## Invariants to preserve

- Every tenant operation must use the selected company's trusted context and backend membership checks. Employee/site codes are not globally unique identities.
- Jobs entitlement is `companies.jobs_enabled`, default false; fail closed on missing/loading/failed access. Platform entitlement controls do not grant company membership.
- Billing remains separately gated by owner/admin role, `billing_enabled` and membership `billing_access`. Do not make it appear merely because Jobs is open.
- Jobs work time and attendance clocking are independent. Start/Continue Job is not attendance IN; Finish Work for Today is not attendance OUT.
- Job state `in_progress` may display Paused/Continue when there is no open session. Do not add a second persisted pause state casually.
- One open Jobs session per employee per company; no silent session closure on switching, cancellation or submission.
- Submission, correction, completion, emergency closure and cancellation retain reasons/history and applicable lead/manager permissions. Completed snapshots must remain historical.
- Unknown mutation outcomes require authoritative refresh, not blind retry. Discard stale responses after company/role/session changes.
- Local Jobs demo requires explicit local demo mode; never enable mock fallback on production.
- Do not claim photos/signatures/testing-results capture works because tables or demo controls exist. Live media persistence is disabled at this checkpoint.
- Payslip generation can persist payroll period totals. Do not click it against live data just to inspect layout.
- Preserve payroll company-specific rules, tax-year/versioned calculations, YTD continuity and blocked-event approval behavior. Changes require focused financial regression checks; code presence is not statutory certification.

## Approved UI conventions

- Preserve the compact black/gold Shiftly visual language and exact approved demo/live parity. Match nearby typography and controls; avoid oversized banners and duplicated actions.
- Admin detail tabs: Overview, Work Record, Team & Time, Review, Job Card. No dominating lifecycle card.
- Team editing: small pencil at the far right of Assigned team. Cancellation: compact more-actions menu after tabs, hidden on mobile at the current breakpoint.
- Work Record: latest two records in an internally scrolling area. Review: latest one with scrolling and total work-days/team-time/team-members outside it. Preserve older records and original numbering.
- Supervisor: Overview is details-first; Today's Work owns start/continue/finish; Sign-off owns submission; Job Records contains history. No duplicate Continue Job cards.
- Supervisor row: details on left; status above Open Job on the right. Do not restore excess mobile minimum height.
- All Jobs uses a compact horizontal search field and compact dropdown status filters, not a large row of filter pills.
- Keep global logout, role-appropriate navigation and Billing access consistent with the host app.

## Local checks and caching

- Read `package.json` before commands. No generic `npm test`, lint or application build script exists at this checkpoint.
- Existing offline suite: `node --test tests/billing-pdf.test.cjs tests/jobs-data.test.cjs tests/jobs-ui.test.cjs tests/jobs-sql-static.test.cjs tests/platform-jobs-access.test.cjs` (106 passing at migration).
- Use `node --check` for tracked JS/CJS/MJS and `git diff --check` for whitespace. Invite TypeScript needs an appropriate offline parser or explicitly authorized Deno checks; do not silently fetch remote imports.
- `npm run build:billing-pdf` writes generated vendor output. Run only when appropriate to the task, then inspect the diff. Do not delete committed vendor/license artifacts as junk.
- `tests/jobs-db-*` and `tests/jobs-psql-harness.cjs` create databases/apply SQL; do not run as ordinary unit tests.
- `node dev-server.js 5191` serves `public/` on loopback. A local URL without demo isolation may still connect to configured live Supabase. Jobs demo route: `/login?jobsDemo=admin` or `supervisor` on localhost.
- Coordinate edited asset query versions in `login.html` and `service-worker.js` for an explicitly requested release. Current baseline: app v196, jobs v25, jobs-data v5, jobs CSS v27, cache `shiftly-v241`.
- Offline shell caching does not establish offline database writes or durable offline clocking. Do not promise either.

## Credentials and reporting

- Never print/document credential values, JWTs, service-role keys, access tokens, invite links or passwords. Public anon keys also need not be copied into handovers.
- Keep `.env*`, credential files, `.firebase/`, `.vercel/`, `supabase/.temp/`, `node_modules/`, `tmp/` and logs out of commits. Inspect exact files, not broad staging.
- Do not delete ignored files or private biometric/payroll data during cleanup. Report first.
- End with files changed, checks actually run, results, remaining limitations and exactly which external actions did or did not occur.
- Do not say “live”, “safe”, “complete”, “tested” or “deployed” beyond the evidence. Record the scope/date of previous checks separately from fresh verification.
