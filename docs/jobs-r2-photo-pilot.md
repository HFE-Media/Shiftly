# Jobs R2 photo pilot — local implementation, 15 September 2026

Frontend/backend not deployed. The pilot SQL was applied on 15 September 2026
after explicit approval, with success shown in Supabase SQL Editor. Read-only
postchecks verified four columns, the two functions' execution permissions, RLS
enabled, zero photo rows at that time, and unchanged Demo Company entitlement flags.
The user subsequently confirmed supervisor upload, admin viewing and printed photos.
Existing payroll-summary WIP is preserved. See `jobs-photos-worker.md` for the
separate, not-yet-deployed free Worker adaptation.

## Scope

- Real Demo Company Name: `7e7aefc5-52c2-4cc7-b649-cf255af8c2e3` only.
- Private R2 bucket `shiftly-jobs-test` only; localhost frontend opt-in `jobsPhotos=1`.
- Assigned active supervisor, own open work session, editable Job required to upload.
- Existing entitled owner/admin/assigned supervisor read permissions retained.
- Photos only. No signatures, results, entitlement changes or attendance/payroll changes.

## Implemented locally

`server/jobs-photos.cjs` accepts authenticated same-origin POST requests on loopback.
It checks caller access through a new user-JWT RPC, decodes JPEG/PNG/WebP using sharp,
auto-orients/re-encodes without EXIF/GPS, scales within 1920x1920, writes conditionally
to an immutable company/job/photo UUID key, then registers metadata through a
service-only RPC that rechecks membership, assignment, session, lifecycle and revision
under locks. No browser service-role or R2 credentials. No bucket-list API exposed.

Uploads are proxied through the local backend (not presigned PUTs) to validate bytes
before storage. Existing bucket CORS is compatible with signed reads; it does not
grant authorization. Signed reads expire in five minutes and are generated only for
RLS-visible registered photo IDs. Reopen the Job to refresh links. No links are saved
in SQL/completion snapshots. Images appear in photo grids, linked daily records,
Review and the existing HTML/print Job Card (not a new direct PDF generator).

8 MB input, 40 megapixel decode, 2 MB stored image maximum; 100 photos per Job pilot
limit; one upload per actor and three simultaneous uploads per local process.
These are pilot limits, not a complete company billing quota/retention policy.
Network uncertainty requires authoritative refresh, never automatic registration
replay or object deletion. An unregistered R2 object can remain after a failed save;
do not delete it without checking database registration. No cleanup job is enabled.

## Two prerequisites before real testing

1. Privately create `.env.jobs-photos.local` from `.env.jobs-photos.example`, outside
   `public/`. Populate the replacement R2 S3 credentials and Supabase credentials.
   Never paste these into chat or Git. This file is ignored. The exposed old token
   must remain revoked. The server accepts only the designated Supabase project.
2. Obtain approval to apply ONLY
   `supabase/migrations/20260915120000_jobs_r2_photo_pilot.sql` in the designated
   Supabase SQL Editor. This adds four photo columns and two RPCs; no RLS weakening,
   shared helper replacement or entitlement change. It affects shared schema, but
   the new entry points explicitly reject other company IDs. It is NOT the original
   Jobs foundation and must not be bundled with other migrations or `db push`.
   Stop on any collision/error; do not rerun blindly. Take the normal DB backup first.

Then stop the old preview process on 5191 and run:

```powershell
node scripts/start-jobs-photos.cjs
```

Open `http://127.0.0.1:5191/login?jobsPhotos=1`, sign in normally, select Demo Company
Name and use a supervisor's own active Job session. The URL does not create demo
fixtures or authenticate anyone. Local frontend operations still use cloud data.
The server serves pilot-versioned Jobs scripts to avoid old service-worker assets.

## Verification and release boundary

Offline tests cover image decoding/resizing, scope/origin/auth denial, conditional
writes, error redaction, authorized URL generation, adapter opt-in and SQL static
guards. These are not actual Postgres execution, real R2 or authenticated browser
E2E evidence. Real upload/reopen/finish/history/print, token expiry and company-switch
checks remain pending the prerequisites. Test only non-sensitive images.

Production hosting of the trusted backend remains a separate release step: Firebase
static hosting alone cannot run this Node handler. Choose/approve server hosting,
production credentials/bucket, multi-company limits and removal of pilot guards
before a live release. Do not deploy this pilot and claim production photos work.
No automatic commit, push, migration or deployment is authorized by this document.
