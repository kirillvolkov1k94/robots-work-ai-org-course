# Release verification — «Роботы работают»

**Checked:** 2026-09-01 (Asia/Novosibirsk)
**Published revision:** `23e69c2` on `main` via pull request #1
**Scope:** released source, local static preview, authorised Supabase configuration and read-only verification, plus the public GitHub Pages URL.

## Statuses kept separate

| Status | Result | Evidence / boundary |
| --- | --- | --- |
| Locally verified | PASS | Deterministic generation, routes, full Node suite, PWA policy, assets and browser rendering were checked below. |
| Supabase base | PARTIAL | The project, schema, owner-only RLS, URL allowlist and Email provider were checked. No magic link was sent, no owner session was completed and no authenticated cloud row was written in this run. |
| Publicly deployed | PASS | GitHub Pages reports `built` from `main` with HTTPS enforced; root, first lesson, manifest and service worker were checked on the public HTTPS URL. |
| Accepted on iPhone | NOT ACCEPTED | A real owner must test Safari → Add to Home Screen after public deployment. Desktop/browser emulation is not this acceptance. |

## Deterministic release checks

Run from the course root; every command exited with code `0`.

```sh
npm test
npm run check:render
npm run check:links
git diff --cached --check
```

Observed results:

- Node test runner reported `95` tests passed, `0` failed, `0` skipped and `0` cancelled.
- The deterministic-render check exited successfully.
- The internal-link check reported `Internal link check passed.`
- The staged whitespace check was clean.
- A targeted staged-file scan found no service-role key or JWT-shaped credential. The browser configuration contains only the project URL, the standard Supabase publishable key and the exact public redirect URL.

## Served PWA and asset checks

The candidate was served through `http://127.0.0.1:4174/`.

- The dashboard loaded with a labelled cloud-progress email action and an empty console error list.
- The service worker registers only `install` and `activate`. Source and test inspection found no `fetch` handler, `respondWith`, response redirect or navigation-cache opening.
- `manifest.webmanifest` declares `display: "standalone"`, `start_url: "./"`, lavender colours and both declared icon sizes.
- `course-icon-180.png` and `course-icon-512.png` decode as exactly `180×180` and `512×512`; the source artwork is `1254×1254`.
- All 11 served HTML routes use `#2A1C3D` as the theme colour. The interface uses the approved lavender palette; the reviewed primary contrast combinations are 6.91:1–15.77:1 and user-visible statuses include text, not colour alone.

## Public HTTPS verification

- GitHub Pages reports `built` from `main` with HTTPS enforced at `https://kirillvolkov1k94.github.io/robots-work-ai-org-course/`.
- The public root, `lessons/choose-process/`, `manifest.webmanifest` and `service-worker.js` each returned HTTP `200` with no redirect. The root and lesson contained the expected course markup; the manifest declares standalone display and the service worker still has no network interception.
- In a fresh public-browser visit, the dashboard rendered the seven-lesson route and labelled cloud email action, then the first-lesson link opened its full lesson. Both pages had an empty console error list.
- In a `430×932` mobile viewport, matching iPhone 15 Pro Max CSS dimensions, the public dashboard and first lesson had no horizontal overflow; the lesson check button measured `44px` high. This browser emulation is not physical iPhone acceptance.

## Supabase evidence

- A free Supabase project was created for this course; no GitHub integration, custom domain, paid add-on or server-side secret was configured.
- The reviewed `supabase/schema.sql` completed successfully. A follow-up read-only query returned `table_exists = true`, `rls_enabled = true`, `policy_count = 4` for `public.course_progress`.
- The configured Site URL and the single allowlisted redirect both exactly match `https://kirillvolkov1k94.github.io/robots-work-ai-org-course/`.
- Email authentication is enabled, new-user signup is allowed and email confirmation is enabled.
- An anonymous read attempt against `course_progress` returned HTTP `401`; it did not disclose course-progress rows.

## Privacy and release boundaries

- Cloud data is limited by the implementation to authenticated identity and validated learning-progress JSON. The course does not collect learner artefacts, business text, client data, passwords, database passwords, service-role keys or admin tokens.
- A publishable browser key is intentionally present in `assets/cloud-config.js`; it is not a privileged server secret. RLS and table privileges remain the access boundary.
- This proof does not send a magic link, authenticate an email address, create a cloud progress row or independently prove that a second authenticated user cannot access another user's row. Those are still live owner-acceptance checks.
- Public source links were displayed and route integrity was checked locally; availability and contents of third-party pages were not re-accepted as part of this release proof.
- The course intentionally makes no offline guarantee. Its service-worker policy avoids navigation interception to avoid the Safari redirect/expired-response failure class.

## Known coverage limitation

The documentation tests cover important forbidden/required clauses, but they are not a universal semantic proof against every future contradictory sentence. The current cloud and release wording was therefore also read manually in the release review. The palette regression test forbids the known retired green/orange tokens and includes the 404 route; it is not a universal whitelist for every conceivable future colour. Both limits are recorded rather than treated as automatically solved.

## Required next evidence

1. On the public course, the owner completes one passwordless email login and checks that a completed lesson remains after reload. Do not record or disclose the email link or identity in this repository.
2. The owner tests the real iPhone Safari Home Screen path: install, launch, dashboard → lesson → return, completion, close/reopen, export/import and safe-area layout. Only the owner’s explicit confirmation can change the iPhone status to accepted.
