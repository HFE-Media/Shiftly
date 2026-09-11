# Jobs checkpoint and remaining features

Checkpoint: 11 September 2026. The user approved the current UI and requested that the remaining features be recorded, not implemented yet.

## Next phase (not implemented live)

1. **Photo uploads:** capture/select Before, During, After and Other photos; securely store and associate them with the correct company, job and work record; display authorized photos in job history and the Job Card/PDF.
2. **Client signature sign-off:** capture client name and signature, timestamp and any supported unavailable reason; persist securely and show the sign-off in review and the Job Card/PDF. Decide submission requirements explicitly before changing current behavior.
3. **Testing & Results entry:** enable live entry, validation and persistence of test descriptions/results; associate entries with the appropriate work record and include them in review and the Job Card/PDF.

Materials entry is already implemented live. Submit for Review currently works without signature capture. Existing photo/signature placeholders must not be described as working capture features.

## Preserve during future implementation

- Existing company isolation, role permissions, revision/concurrency checks and session safeguards.
- Existing job records, activity history and completed-job snapshots.
- The approved Admin and Supervisor layouts and responsive behavior.
- No silent changes to RLS, mutation permissions, Storage policy, entitlements or production data. Review and obtain any required authority for backend/storage changes.
- The user's preference is to deploy requested app fixes after validation, unless they specify otherwise. Confirmation-only discussions do not authorize implementation.

## Verified checkpoint

Application commit: `c518ac3bd2a8cd9d8b1a46c4966e950af93512fc`.

- Development and deployment worktrees were clean and matched this commit; remote main matched.
- All 106 tests passed across Jobs UI, data, SQL static checks, platform Jobs access and billing PDF suites.
- JavaScript syntax checks passed for jobs.js, jobs-data.js and service-worker.js.
- Live custom-domain responses matched local login.html, jobs.js?v=25, jobs.css?v=27, jobs-data.js?v=5 and service-worker.js (line endings normalized).
- Service worker cache: shiftly-v241.
- Foundation migration SHA256 remains `8d6ecee456cd0ab7a8c63e27d7ea36225414868fe23abf2c68856eba97935f5d`.

These are code/test and deployed-asset checks, not a new authenticated end-to-end production or database security audit. No production job data was modified for this checkpoint. This document-only checkpoint does not require a new Firebase deployment because deployed application files are unchanged.
