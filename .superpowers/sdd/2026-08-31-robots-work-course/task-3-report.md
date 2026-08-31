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
