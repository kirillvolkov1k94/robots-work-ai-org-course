# Task 2 report — seven-day curriculum and course documents

## Fix round 1

Base: `2393bba` (`feat: add robots work course curriculum`).
Head: `HEAD` after the single Task 2 fix commit; its SHA is reported in the delivery handoff.

### Corrected contracts

- The rendered lesson now starts with the ordinary-life anchor, before outcome and retrieval prompts. The anchors do not introduce framework labels before their plain explanation.
- Days 5 and 7 now include a local/tabletop, no-service dry run: use the learner's own role cards and route map with one synthetic/public fixture, time the actual route, record the real result and stop state, and repeat at most three times. Missing evidence stays missing; it is never invented.
- `MISSION.md`, `SCOPE-LOCK.md` and `README-RU.md` now state the planned—not yet connected—Supabase passwordless email and RLS model: lessons remain public; cloud contains only email identity and validated learning-progress JSON; the owner may read/delete only their progress; sign-out does not delete it; no free-form business/client data or secrets are saved.
- Source map now describes the 15 checked course sources, not replacement examples. Reviewed source titles match their current target pages: `Agent orchestration`, `Working with evals`, and `Identifying the Risks of LM Agents with an LM-Emulated Sandbox`.
- Glossary now defines `REVIEW_REQUIRED`, `MISSING_DATA`, `INTERNAL_BRIEF`, baseline, KPI and QA.

### Fix-round TDD evidence

RED command:

```sh
node --test tests/course-learning-shape.test.mjs tests/course-docs.test.mjs
```

Result: 5 passed, 6 failed. Failures proved the reversed rendered order, absent tabletop protocol, inaccurate source-map copy, missing cloud-model documents, old source titles and framework labels in anchors.

GREEN command:

```sh
node tools/render-course.mjs && node --test tests/course-learning-shape.test.mjs tests/course-docs.test.mjs tests/course-contract.test.mjs tests/render-course.test.mjs
```

Result: 30 passed, 0 failed.

### Remaining limits

- Supabase/passwordless/RLS is specified only; Task 3/7 owns implementation and provider acceptance.
- Local tabletop evidence is learner-owned outside the app. It does not prove an external integration, production readiness, business result, deploy, or physical iPhone acceptance.

### Fix-round final verification

```sh
node tools/render-course.mjs
node tools/check-deterministic-render.mjs
node tools/check-internal-links.mjs
node --test tests/*.test.mjs
```

Result: renderer completed; deterministic render and internal-link checks passed; Node suite passed 50/50. Direct course audit: 7 lessons, 15 sources. `git diff --check` was clean after this report formatting correction.

## Fix round 2

Base: `df32fda` (`fix: clarify course safety and progress model`).
Head: `HEAD` after the single Task 2 fix commit; its SHA is reported in the delivery handoff.

### Corrected contracts

- The planned signed-in learner may delete only their own cloud learning-progress record; sign-out never deletes it.
- Course stop-rules/action gates prohibit deleting client, business, third-party and published data, or anything outside that own progress record. The scope is stated identically in `MISSION.md`, `SCOPE-LOCK.md` and `README-RU.md`; none claims that the cloud provider is already live.
- Beginner-first protection now inspects the generated learner-visible fragment between the lesson title and the «Как это выглядит в жизни» anchor, so a framework label placed there fails the test.

### Fix-round TDD evidence

RED command:

```sh
node --test tests/course-learning-shape.test.mjs tests/course-docs.test.mjs
```

Result: 11 passed, 2 failed. The new failures proved the ambiguous policy wording and absent explicit action-gate rule. The newly added rendered-order negative guard passed because the prior renderer fix already placed the life anchor first.

GREEN command:

```sh
node tools/render-course.mjs && node --test tests/course-learning-shape.test.mjs tests/course-docs.test.mjs tests/course-contract.test.mjs tests/render-course.test.mjs
```

Result: 32 passed, 0 failed.

### Remaining limits

- The deletion boundary describes a planned Supabase/RLS feature only; Task 3/7 owns its implementation and live acceptance.
- No course action may delete any data. The sole future self-service deletion is the signed-in learner's own cloud progress record and remains unimplemented in this Task 2 change.

### Fix-round final verification

```sh
node tools/render-course.mjs
node tools/check-deterministic-render.mjs
node tools/check-internal-links.mjs
node --test tests/*.test.mjs
```

Result: renderer completed; deterministic render and internal-link checks passed; Node suite passed 52/52; `git diff --check` was clean.

## Fix round 3

Base: `ecabd48` (`fix: clarify course deletion boundary`).
Head: `HEAD` after the single Task 2 test-hardening commit; its SHA is reported in the delivery handoff.

### Corrected contracts

- Policy tests now reject a planned model if its text says it is already connected, implemented, launched or live, and reject any sign-out wording that deletes cloud progress. Each test also runs an in-memory contradiction mutation as proof.
- The closed-list term scan is replaced by a structural invariant on generated lesson HTML: inside the lesson article, nothing except whitespace may occur between `</h1>` and the «Как это выглядит в жизни» section.
- The structural test injects a `Supabase API / RLS / JSON schema` block before the life anchor and proves that the invariant throws. Header and metadata markup outside the lesson article are deliberately outside the check.

### Proof and focused result

```sh
node --test tests/course-learning-shape.test.mjs tests/course-docs.test.mjs
```

Result: 11 passed, 0 failed. The embedded false-live, sign-out-deletes and injected-technical-block mutations each threw as required; current authored pages passed unchanged.

### Remaining limits

- This is test/renderer-contract hardening only. It does not change the curriculum, cloud runtime, deployment, service worker or provider state.

### Fix-round final verification

```sh
node tools/render-course.mjs
node tools/check-deterministic-render.mjs
node tools/check-internal-links.mjs
node --test tests/*.test.mjs
```

Result: renderer completed; deterministic render and internal-link checks passed; Node suite passed 50/50. The count is lower than the prior 52 because three weak/overlapping term-order tests were replaced with one structural rendered-order invariant and its proof mutation. `git diff --check` was clean.

## Scope completed

- Replaced the template course with the approved seven lessons in `content/course-data.js`:
  `choose-process`, `map-roles`, `define-contracts`, `build-evals`, `keep-run-ledger`, `set-approval-gates`, and `run-shadow-pilot`.
- Each lesson has an observable outcome, retrieval prompt, studio/work analogy, plain explanation, named 30-minute practice artefact, at least two visible artefact checks, a non-trick quiz, explicit stop/approval boundary, source mapping and next action.
- Added 15 public, mapped sources with author, publication date (or explicit no-date checked date), type, narrow rule, URL, access date and usage mapping. The set accurately labels official documentation, engineering practice, a field report, a standard/specification, an industry guide and research papers.
- Added the authored course documents: `MISSION.md`, `RESOURCES.md`, `GLOSSARY.md`, `SCOPE-LOCK.md`, `ASSUMPTIONS.md`, `learning-records/README.md`, `PUBLISHING-PLAN.md`, and `README-RU.md`.
- Kept Studio Intelligence Brief read-only/draft-only. It has no client messaging, ads, CRM, booking, payments, website or deletion rights; no learner text is stored.
- Updated the two old test fixtures whose assertion text deliberately named template IDs/source text.

## TDD evidence

RED command:

```sh
node --test tests/course-learning-shape.test.mjs
```

Result: 4 passed, 1 failed. The new `ships the approved seven-lesson agent-organisation curriculum` test failed exactly because the template still exposed `define-outcome`, `shape-practice`, and `review-evidence` instead of the seven approved IDs.

GREEN command:

```sh
node tools/render-course.mjs && node --test tests/course-learning-shape.test.mjs tests/course-contract.test.mjs tests/render-course.test.mjs
```

Result: 24 passed, 0 failed.

## Generated files

- Generated lesson pages: `lessons/choose-process/index.html`, `lessons/map-roles/index.html`, `lessons/define-contracts/index.html`, `lessons/build-evals/index.html`, `lessons/keep-run-ledger/index.html`, `lessons/set-approval-gates/index.html`, `lessons/run-shadow-pilot/index.html`.
- Generated references: `reference/course-contract/index.html` and `reference/source-map/index.html`.
- Removed the three stale generated template routes: `define-outcome`, `shape-practice`, `review-evidence`. No generated HTML was hand-edited.

## Final verification

```sh
node tools/render-course.mjs
node tools/check-deterministic-render.mjs
node tools/check-internal-links.mjs
node --test tests/*.test.mjs
```

Result: renderer completed; deterministic-render and internal-link checks passed; Node suite passed 44/44. A direct source audit reported 7 lessons, 15 sources and 1 authored reference (plus the generated source map). `git diff --check` was clean.

## Self-review

- Confirmed authored course material exists only in `content/course-data.js`; lesson/reference HTML was generated after it.
- Confirmed each lesson maps to at least one known source, and no source URL carries credentials or sensitive query data (contract tests pass).
- Confirmed no claim of flawless systems, guaranteed income, production readiness or live acceptance.
- Confirmed documentation states data ownership, access/deletion boundary, no-service-role policy, source gaps and physical iPhone acceptance boundary.

## Concerns / non-claims

- Public source URLs were supplied by the approved research map; this task did not perform live web re-validation.
- Tests and generated pages are local technical evidence only. GitHub Pages deployment, exact live URL, iPhone Home Screen/Safari acceptance and any live process approval remain outside Task 2.
