# Local release verification — «Роботы работают»

**Checked:** 2026-09-01 (Asia/Novosibirsk)
**Candidate source:** `6a89c49 fix: harden notebook accessibility`
**Scope:** local source tree and a temporary `http://127.0.0.1:4173/` static preview. No GitHub, Supabase project, email, deploy, or public URL was created or used in this verification.

## Statuses kept separate

| Status | Result | Evidence / boundary |
| --- | --- | --- |
| Locally verified | PASS | The deterministic build, internal routes, full Node suite, served static files and two browser layouts were checked below. |
| Publicly deployed | NOT ATTEMPTED | No GitHub repository, Pages deployment or public HTTPS URL exists for this candidate yet. |
| Accepted on iPhone | NOT ACCEPTED | A real owner must test Safari → Add to Home Screen after a successful public deployment. Desktop/browser emulation is not this acceptance. |

## Deterministic release checks

Run from the course root; every command exited with code `0`.

```sh
node tools/render-course.mjs
node tools/check-deterministic-render.mjs
node tools/check-internal-links.mjs
node --test tests/*.test.mjs
git diff --check
```

Observed results:

- Renderer regenerated the seven lesson pages and two reference pages from `content/course-data.js`; no generated file required a manual edit.
- Deterministic-render check exited successfully.
- Internal-link check reported `Internal link check passed.`
- Node test runner reported `93` tests passed, `0` failed, `0` skipped and `0` cancelled.
- Whitespace check was clean.

## Served PWA and asset checks

The candidate was served only through `python3 -m http.server 4173 --bind 127.0.0.1`.

- `curl http://127.0.0.1:4173/service-worker.js` returned `200`; its registered events are exactly `install` and `activate`. Source and served-file inspection found no `fetch` handler, `respondWith`, response redirect or navigation cache opening.
- `manifest.webmanifest` served with `200` and declares `display: "standalone"`, `start_url: "./"`, notebook colours and both declared icon sizes.
- Served `course-icon-180.png` and `course-icon-512.png` both returned `200`; `sips` decoded them as exactly `180×180` and `512×512`.
- `assets/cloud-config.js` is deliberately blank: `{"url":"","publishableKey":"","redirectTo":""}`. The blank configuration keeps the dashboard local-only and does not create a provider client.
- The tracked `learning-records/` path contains only `learning-records/README.md`. A targeted scan of executable authored course assets found no live publishable key or JWT-shaped browser credential. The official Supabase client remains vendored, but is inert while configuration is blank.

## Browser review

The local page was opened in the in-app browser. Console error log after the checks was empty. The viewport override was reset after review.

### Narrow layout — 375×812

- Dashboard loaded with the labelled main landmark, accessible role map and the first recommended lesson `lessons/choose-process/`; document and body widths were both `375`, with no horizontal overflow.
- With blank cloud configuration, the visible state says that cloud backup is not configured and that progress remains on this device. No email form or provider call is implied in this disabled state.
- First lesson `lessons/choose-process/` loaded with three public source links and no horizontal overflow. Selecting only the correct check produced the visible polite status: `Верно: 100%. Прогресс этого урока сохранён на устройстве.`
- Valid local import restored one completed lesson: dashboard showed `14%`, first lesson `Пройдено: 100%`, and next action changed to `Организация, а не толпа`. A malformed import produced `Импорт не выполнен: файл не соответствует формату этого курса.` while retaining that `14%` state.
- Last lesson `lessons/run-shadow-pilot/` loaded with five public source links and no horizontal overflow. Its Home link and check button measured `44px` high; quiz-answer labels measured `75px` and `100px` high. Inline source links remain ordinary text links, rather than pretending that every line of reading text is a 44px button.
- Keyboard focus on the course Home link was visibly rendered as a solid `3px` outline in the signal colour (`rgb(216, 91, 42)`).

### Wide layout — 1440×900

- Dashboard and last lesson both loaded without horizontal overflow; their reading columns measured `832px`, staying within the intended maximum width.
- The route map exposed `aria-label="Карта ролей агентов"`; the final lesson kept five visible source links and a `44px` Home link.

## Privacy and release boundaries

- This local release proof does not send a magic link, authenticate an email address, create a cloud row, or test Supabase Row Level Security against a live project. Those remain unverified until the authorised provisioning step.
- No personal progress export, client data, credentials, analytics integration or public course URL was added by this verification.
- Public source links were displayed and route integrity was checked locally; availability and contents of third-party pages were not re-accepted as part of this local test.
- The course makes no offline claim. Its service-worker policy intentionally avoids navigation interception to avoid the Safari redirect/expired-response failure class.

## Known coverage limitation

Current documentation and the blank configuration correctly state that Supabase is planned and not connected. However, the Task 2 regression guard in `tests/course-docs.test.mjs` is not a complete semantic proof against every future contradictory sentence: for example, a coexisting phrase such as `Supabase уже реализован и готов к использованию.` could evade its narrowed matcher. This is a **future test-coverage limitation**, not a current affirmative live claim; the Task 2 repair cap was reached, so it is recorded here rather than silently treated as solved.

## Required next evidence

1. Provision the authorised Supabase project, run the reviewed schema, configure the exact production redirect, and verify passwordless email plus RLS without exposing secrets.
2. Publish through the approved GitHub Pages flow and verify the actual HTTPS root and a generated lesson.
3. The owner tests the real iPhone Safari Home Screen path: install, launch, dashboard → lesson → return, completion, close/reopen, export/import and safe-area layout. Only the owner’s explicit confirmation can change the iPhone status to accepted.
