# Jobs photos — Cloudflare Workers Free adaptation

## Status (15 September 2026)

### Released 16 September 2026 (Africa/Johannesburg)

Follow-up Job Card layout release: paired two-column photo rows, bounded 65mm
contain-fit images, per-row break avoidance and heading attached to the first pair.
Jobs JS v27 / CSS v29 / SW v244 deployed Hosting-only with explicit user approval.
All four changed live assets matched local; 134 offline tests passed. Browser
synthetic portrait/landscape fixture visually checked for uncropped images and
aligned captions. In-app browser did not expose print preview, so exact PDF page
breaks await the user's regenerated PDF. No Worker/SQL/storage changes in this fix.

User confirmed the hosted-Worker local test succeeded and explicitly approved live
deployment. Firebase Hosting-only deployment to `shiftly-21919` completed. The
custom-domain login, jobs.js v26, jobs-data.js v6, jobs.css v28 and service-worker
v243 returned HTTP 200 and matched local files after newline normalization.
Production Worker version: `192387c9-9b3a-4937-bf71-4195323df9a5`.
Temporary localhost origin removed: hosted OPTIONS returns 403 for localhost and
204 for https://shiftlyapp.co.za. No new SQL, purchases, subscription upgrades,
entitlement changes, Git commits, pushes, merges or branch switches in this release.
134 offline tests pass after updating expected release asset/cache versions;
Jobs JS/data/SW syntax checks and whitespace checks passed. The user performed the
authenticated hosted test; post-release verification here checked deployed assets
and CORS, not another authenticated upload. Worst-case Free-plan CPU remains
unmeasured. Signatures and testing-results capture remain outside this addition.

The following is the dated pre-release record, superseded by the release above.

Worker deployed after explicit approval, on the verified Workers Free plan:
`https://shiftly-jobs-photos.shiftly-static-app.workers.dev`.
Current version after encrypted secret installation:
`f13323e5-785d-4e9f-96a7-dce4f4c37a0a` (2026-09-15 21:19 UTC).
Local round-trip verification deployment: `080b9ad9-8cf6-44e5-ae06-a2385d02466f`.
This temporary deployment adds only `http://127.0.0.1:5191` to the production
origin allowlist via CLI override. Redeploy checked-in configuration to remove it
before frontend release. Local server uses `SHIFTLY_PHOTO_WORKER_TEST=1` to select
the hosted endpoint and distinct asset versions; it does not load private env keys.
The browser session requires the user to sign in again for the final hosted test.
No new purchase, subscription, billing change or production entitlement change.
Rollout SQL applied once after explicit approval and dashboard recovery on 15 September.
Postcheck: four photo rows retained, RLS enabled, both functions security-definer with
fixed search_path; context authenticated-only (also service_role), registration
service_role-only, anon denied. Jobs/Billing entitlement digest unchanged.
The existing Node pilot remains available locally; no production frontend endpoint
is configured and no Firebase release has occurred. The Worker is not yet an
end-to-end verified production photo feature.

Verified hosted probes: approved-origin OPTIONS 204, unauthenticated POST 401,
unapproved-origin POST 403. No photos uploaded in these probes. Supabase anon and
service-role keys and an independent signing secret were installed as encrypted
Worker secrets with explicit permission, without printing values. The install
script refuses to rotate an existing signing secret automatically.

## Implementation

- `workers/jobs-photos/index.mjs`: private R2 binding, caller-JWT RPC authorization,
  RLS-scoped photo lookup, service-only final registration. Server checks company,
  assignment/session/revision via SQL; never trusts a supplied actor ID.
- `jpeg.mjs`: baseline JPEG structural validation, 1920px dimension/2MB limits,
  strips APP/COM metadata and rejects trailing payloads. This is NOT full pixel
  decoding or malware scanning. Browser canvas decodes/re-encodes and resizes first;
  the server independently enforces structure, size and metadata stripping.
- Five-minute HMAC-signed Worker image URLs, private bucket, no-store and nosniff.
  These are bearer links until expiry; revocation is not instantaneous. Signed URL
  and JWT logging must remain disabled. No photos or credentials in frontend config.
- Per-actor/company upload limiter: 10/minute per Cloudflare location, not a global
  billing cap. Existing SQL 100-photos/job guard retained. R2 can still incur usage
  charges past its free allowance; no unlimited-free claim.
- Existing `shiftly-jobs-test` bucket retained despite its name: existing objects
  and database references need not be moved. No public bucket setting needed.
- Frontend Worker endpoint is optional and strictly restricted to the named
  workers.dev host shape. Leaving it unset retains local-only pilot behavior.

## Verification so far

134 offline tests pass across the existing seven suites plus jobs-worker.test.cjs.
Worker tests cover denial, context mismatch, body limits, metadata removal, scoped
conditional writes, uncertain finalization, tampered/expired links and SQL guards.
Wrangler 4.132.0 deploy --dry-run accepts the 10.97KiB package and configured bindings.
JS syntax and git diff --check pass. These are NOT hosted Free-plan CPU measurements
or browser-canvas round-trip evidence. Test those before frontend release.

## Remaining release steps

1. User signs into Cloudflare and approves deployment access. Confirm Workers Free;
   do not upgrade or enable paid products. R2 access scoped to the existing bucket.
2. Set Supabase anon/service keys and an independent random PHOTO_SIGNING_SECRET as
   encrypted Worker secrets, never in tracked files or browser code. User approval
   required before transmitting credentials to the cloud service.
3. Review/apply ONLY `20260916090000_jobs_r2_enabled_companies.sql` after action-time
   approval. It replaces two R2 functions to admit active Jobs-enabled companies;
   preserves role/membership/session checks and bucket references. No foundation replay.
4. Deploy Worker, test with the real demo tenant, verify actual Free-tier CPU limits
   (10ms), browser-generated JPEG compatibility, denied-company cases and signed reads.
5. Configure the exact returned Worker URL, coordinate Jobs asset/cache versions,
   then separately deploy Firebase Hosting after reviewing both worktrees. No Git
   commit/push/merge is implied. Preserve unrelated accepted payroll WIP.

Rollback: disable the frontend photo endpoint/revert the photo frontend release;
retain stored photo metadata and objects. Do not delete objects on uncertain writes.
The old local pilot migration must not be replayed to roll back function changes.
