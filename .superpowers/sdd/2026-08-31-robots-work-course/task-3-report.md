# Task 3 report — resilient cloud progress primitives

## Revision range

- Base: `7cdfad6488731e2555a8fa13375211ded8b60885`.
- Head: `HEAD` at the single cohesive `feat: add resilient cloud progress primitives` commit.

## Implementation

- Added a strict, course-isolated progress-record boundary. It creates empty records, rejects unknown keys and unsafe timestamps, and merges valid device/cloud records lesson by lesson. Timestamp ties deterministically keep the device completion; malformed remote data cannot replace a valid device record.
- Refactored the existing local progress store to use those canonical record primitives without changing its current/previous recovery, export/import, or completion API.
- Added a DOM- and network-free controller. Device persistence and observable `local` state happen before cloud save; it reports `saving`, `saved`, `link-sent`, and `retry` states. A failed provider call retains local progress and leaves an explicit retry method.
- Added a fail-closed injected Supabase gateway. It accepts only complete public browser config (`url`, one publishable/anon key, `redirectTo`), uses no service-role input, scopes every select/upsert/delete to `course_progress`, the course, and the authenticated user, and removes provider details from errors.
- Added `supabase/schema.sql` with the `(course_id, user_id)` primary key, cascading Auth user reference, JSONB progress, timestamp update trigger, RLS, and owner-only SELECT/INSERT/UPDATE/DELETE policies.
- Vendored the unchanged official `@supabase/supabase-js` 2.112.4 UMD browser distribution under `assets/vendor/`, with its MIT license file, exact dependency lock, and notice/source/SHA-256 in `THIRD-PARTY-NOTICES.md`. No CDN is required.

## TDD evidence

RED command:

```sh
node --test tests/progress-record.test.mjs tests/progress-controller.test.mjs tests/supabase-gateway.test.mjs
```

Observed: 3 failing test files because each required new module was absent (`progress-record.js`, `progress-controller.js`, `supabase-gateway.js`).

GREEN command:

```sh
node --test tests/progress-record.test.mjs tests/progress-controller.test.mjs tests/supabase-gateway.test.mjs tests/progress-store.test.mjs
```

Observed: 18 passed, 0 failed. Coverage includes valid/invalid records, unknown keys, independent lesson merge, deterministic ties, malformed remote preservation, local-first failed save/retry, status and magic-link transitions, gateway auth/upsert/filter/error paths, schema RLS constraints, and unchanged local-store behavior.

## Final verification

```sh
npm run render
node tools/check-deterministic-render.mjs
node tools/check-internal-links.mjs
node --test tests/*.test.mjs
```

Observed: renderer completed; deterministic render passed; internal-link check passed; full Node suite passed 63/63. `git diff --check` passed for authored source/config/test files; the byte-for-byte official UMD artifact intentionally retains its upstream trailing whitespace.

## Changed files

- Added `assets/progress-record.js`, `assets/progress-controller.js`, `assets/supabase-gateway.js`, `assets/cloud-config.js`, `supabase/schema.sql`, three focused test files, `assets/vendor/supabase-js-2.112.4.umd.js`, its preserved license, `THIRD-PARTY-NOTICES.md`, and `package-lock.json`.
- Modified `assets/progress-store.js` and `package.json`.

## Remaining limitations

- `assets/cloud-config.js` intentionally contains empty public placeholders, so cloud progress is disabled by default.
- No Supabase project, credentials, magic-link provider, browser UI wiring, deployment, service worker behavior, or other live resource was created or changed. The tests prove offline contracts only; they do not prove provider, email, or deployed-browser acceptance.

## Fix round 1 — persistence hardening

### Revision range and reproduced root causes

- Base: `d546dd9579f9e78e1f3aba1b80b08070bef86a9e`.
- Head: `HEAD` at the single cohesive `fix: harden cloud progress persistence` commit.
- The first implementation accepted an `sb_secret_*` value because it only denied service-role wording, issued concurrent cloud writes from one controller, restored a local/remote merge without uploading it, and treated undefined provider responses as successful. It also permitted reserved JSON-own lesson keys and read completion candidates through inherited object properties.

### Corrections

- Config now accepts only `sb_publishable_*` public keys or a legacy JWT with `role: anon`; it rejects current `sb_secret_*`, legacy service-role and ambiguous values. Provider and redirect URLs require HTTPS except explicit localhost/loopback development.
- Reserved lesson IDs are rejected and merge uses own-property-safe records/lookups.
- Gateway operations require strict `{ data, error: null }` envelopes and operation-specific data shapes. Controller independently rejects undefined gateway responses, so malformed results enter `retry` rather than `saved` or `link-sent`.
- One controller serializes snapshots and captures them on execution. Only the newest queued state can report `saved`; failed saves keep local progress and the retry path.
- Restore persists a valid merged result locally, then uploads it when it differs from valid remote progress or when nonempty local progress has no remote record. Malformed remote data remains ignored.
- `ASSUMPTIONS.md` now explicitly limits cloud progress to backup/reconciliation. It does not promise conflict-free simultaneous multi-device synchronization; local storage and JSON export remain available.

### TDD evidence

RED command:

```sh
node --test tests/progress-record.test.mjs tests/progress-controller.test.mjs tests/supabase-gateway.test.mjs
```

Observed: 13 passed, 7 failed. The failures reproduced permissive secret/HTTP config, undefined-envelope false success, concurrent save ordering, missing restore upload, reserved-key acceptance and inherited completion lookup. A focused follow-up controller RED run also showed 3 passed, 4 failed, including undefined magic-link false success.

GREEN command:

```sh
node --test tests/progress-record.test.mjs tests/progress-controller.test.mjs tests/supabase-gateway.test.mjs tests/progress-store.test.mjs
```

Observed: 26 passed, 0 failed.

### Final verification

```sh
npm run render
node tools/check-deterministic-render.mjs
node tools/check-internal-links.mjs
node --test tests/*.test.mjs
```

Observed: renderer completed; deterministic render passed; internal-link check passed; full Node suite passed 71/71. Authored source/config/test files pass `git diff --check`; the unchanged official UMD artifact intentionally retains upstream trailing whitespace.
