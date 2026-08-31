# Task 4 report — dashboard and lesson cloud-progress integration

## Revision range

- Base: `10e6a67cf67fdac41d8d9d6a7384bc16cbbafbe3`.
- Head: `HEAD` at the single cohesive `feat: connect dashboard progress to cloud backup` commit.

## Implementation

- Added the lightweight browser-safe `assets/progress-runtime.js`. It is the single lifecycle helper shared by dashboard and lesson pages: it constructs the strict gateway/controller through injectable factories, checks the public configuration before any account call, uses local progress while signed out, and reconstructs/merges through the existing controller after a restored signed-in session.
- Loaded the already-vendored official Supabase UMD client before `assets/app.js`. `cloud-config.js` remains the imported module with its deliberately empty public values; blank configuration does not create a provider client or render a sign-in affordance.
- Dashboard now keeps export/import available in all modes. A configured signed-out reader gets one dynamically rendered, programmatically labelled email form and plain `aria-live` outcomes. A signed-in reader sees a limited account identifier, local/cloud status, save-now and retry actions, and device-only sign-out; sign-out does not delete cloud progress.
- A passing lesson quiz records locally first. Feedback distinguishes local, saving, saved and retry outcomes without claiming that a failed cloud backup erased local completion. Public lesson reading and quizzes remain available without sign-in.
- The controller leaves ordinary completion in `local` state when no cloud gateway is attached; explicit unavailable-cloud retry still reports `retry`. This prevents blank configuration from creating a false cloud-failure state.

## TDD evidence

RED command:

```sh
node --test tests/cloud-ui.test.mjs tests/app-dom.test.mjs tests/lesson-page.test.mjs
```

Observed: 2 passed, 5 failed. Failures proved the missing runtime module, absent signed-out magic-link form/local-only state, old quiz wording, and missing controller injection path. A second narrow RED command, `node --test tests/app-model.test.mjs`, produced 4 passed and 1 failed for the missing visible local save-state message.

GREEN command:

```sh
node --test tests/cloud-ui.test.mjs tests/app-dom.test.mjs tests/app-model.test.mjs tests/lesson-page.test.mjs tests/static-shell.test.mjs
```

Observed: 17 passed, 0 failed. The focused tests cover blank-config/no-client local mode, signed-out labelled form, safe magic-link success and failure, signed-in restore/save/retry/sign-out, local-first lesson completion after cloud failure, truthful UI wording, and UMD-before-module ordering.

## Final verification

```sh
node --test tests/*.test.mjs
npm run render
npm run check:render
npm run check:links
git diff --check
```

Observed: 84/84 Node tests passed; renderer and deterministic render passed; internal-link check passed; authored diff whitespace check passed.

## Changed files

- Added `assets/progress-runtime.js` and `tests/cloud-ui.test.mjs`.
- Modified `assets/app.js`, `assets/lesson-page.js`, `assets/progress-controller.js`, `index.html`, and focused dashboard/model/lesson/static-shell tests.

## Remaining limitations

- `assets/cloud-config.js` is intentionally blank, so the delivered default preview remains local-only and does not demonstrate a live provider or email delivery.
- Tests prove browser-local behaviour and injected provider contracts only. They do not prove deployed Supabase, redirect allowlists, email delivery, cross-device user acceptance, or a live authenticated browser session.

## Fix round 1 — complete cloud progress user paths

### Revision range and root causes

- Base: `dab6e2de64a1ee5f21d28b432b97d1d8b6b8f8ed`.
- Head: `HEAD` at the single cohesive `fix: complete cloud progress user paths` commit.
- Generated lesson pages loaded `lesson-page.js` as a module but omitted the UMD global that the runtime resolves. The shared page shell had only one script slot.
- Gateway sign-out delegated to the provider default scope rather than the UI's device-local promise.
- Dashboard imported directly into the local store while the controller retained its previous in-memory progress. A subsequent retry could therefore upload stale empty progress and report a misleading save result.

### Corrections

- The canonical renderer now has an optional classic vendor-script slot. It emits the vendored UMD before the lesson module for every lesson only; generated reference pages remain script-free. All seven lesson pages were regenerated from the canonical renderer.
- Gateway sign-out explicitly calls the official client with `{ scope: 'local' }`. It never invokes progress deletion.
- Controller now owns `importProgress`: it performs the existing strict local import, adopts the valid record into its current state, emits local state, and queues the adopted snapshot through the existing serialized confirmation path. Runtime exposes this method and dashboard import calls it. Cloud failure leaves the imported local record in `retry`; UI reports restored local backup, not cloud success.

### TDD evidence

RED command:

```sh
node --test tests/render-course.test.mjs tests/supabase-gateway.test.mjs tests/cloud-ui.test.mjs
```

Observed: 11 passed, 3 failed. The failures proved the absent lesson UMD tag/order, missing `scope: 'local'`, and absent live runtime import API.

GREEN command:

```sh
node --test tests/render-course.test.mjs tests/supabase-gateway.test.mjs tests/cloud-ui.test.mjs tests/app-dom.test.mjs tests/progress-controller.test.mjs
```

Observed: 30 passed, 0 failed. Tests cover generated UMD ordering and script-free references, exact local sign-out/no delete, real runtime/controller import with failed cloud retry retaining the imported lesson, and truthful dashboard import status.

### Final verification

```sh
npm run render
node --test tests/*.test.mjs
npm run check:render
npm run check:links
git diff --check
```

Observed: renderer completed; 87/87 Node tests passed; deterministic render, internal-link check, and authored diff whitespace check passed.

### Remaining limitations

- Default `cloud-config.js` remains deliberately blank. These checks do not prove a deployed provider, redirect allowlist, email delivery, or physical browser session.
