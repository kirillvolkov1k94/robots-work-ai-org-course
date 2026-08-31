# Task 1 report

## Implementation

- Extended the lesson contract with `lifeExample.body` and a minimum two-item `artifactChecklist`, including item type checks.
- Extended source validation with required `author`, `publishedAt`, `sourceType`, and narrow `rule` fields.
- Updated the canonical course data and test fixtures to satisfy the extended contract.
- Added semantic generated lesson sections titled `Как это выглядит в жизни` and `Проверка артефакта`.
- Added source-map card metadata for source type, publication date, and narrow rule.
- Regenerated the committed lesson and source-map HTML through the renderer.

## TDD evidence

RED command:

```text
node --test tests/course-learning-shape.test.mjs tests/render-course.test.mjs
```

Expected RED observed: 2 failures. The new learning-shape test failed because lessons had no `lifeExample`, and the renderer output lacked `Как это выглядит в жизни`.

GREEN command:

```text
node --test tests/course-learning-shape.test.mjs tests/course-contract.test.mjs tests/render-course.test.mjs
```

Observed: 21 tests passed, 0 failed.

## Full verification

```text
npm run render
node --test tests/*.test.mjs
```

Observed: 41 tests passed, 0 failed.

## Files

Modified contract, renderer, canonical data, contract/render tests, and generated lesson/source-map HTML; added `tests/course-learning-shape.test.mjs`.

## Self-review

- Source URLs remain validated for HTTP(S), credentials, and sensitive query parameters.
- New user content is escaped by the existing renderer path.
- Generated HTML was produced by `npm run render`; no generated page was hand-authored.
- No cloud progress, visual redesign, course documents, deployment, or external systems were changed.

## Concerns

The task brief listed contract/renderer/test files, but the existing canonical course data and committed generated pages predated the new required fields; updating and regenerating those files was necessary for the canonical renderer and deterministic-render suite to remain valid.
