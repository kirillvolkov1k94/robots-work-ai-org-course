# Robots Work Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to execute this plan task-by-task. Steps use checkbox syntax.

**Goal:** Build and publish a seven-day Russian PWA course that teaches a non-technical learner to design a safe AI-agent organisation, with private passwordless cloud progress.

**Architecture:** Static GitHub Pages files own all course content and resilient local progress. A narrow Supabase adapter adds passwordless email authentication and RLS-protected progress mirroring. Every lesson/reference page is generated from content/course-data.js and is never hand-edited.

**Tech Stack:** Static HTML, CSS, ES modules, Node built-in test runner, official browser Supabase client, Supabase Auth/Postgres/RLS, GitHub Pages.

**Spec:** docs/superpowers/specs/2026-08-31-robots-work-design.md

## Global constraints

- The public course is Russian, named РОБОТЫ РАБОТАЮТ, has seven 30-minute lessons, and explains a living example before any IT term.
- Course practice remains read-only/draft-only; it never asks for client data, passwords, keys, free-form practice text, payments, CRM changes, advertising changes, or messages to customers.
- Do not claim error-free agents or guaranteed economic outcomes. A pass records learning progress, not a credential or proof of production quality.
- Retain strict current/previous local records and JSON export/import even if cloud save fails.
- Cloud identity is a one-time passwordless email link. Browser code contains only a project URL and publishable/anon key, never a service role key.
- Each cloud row must be constrained by RLS where auth.uid() equals user_id.
- Keep 44px targets, visible focus, aria-live feedback, safe-area padding, a maximum 720px reading column, and no horizontal overflow at 375px.
- Preserve standalone manifest, start_url ./, 180px/512px icons, and a service worker with install and activate only.
- Before each behavioural change, write and run a failing test. Never edit generated lessons or references manually.

---

### Task 1: Extend the course contract and generator

**Files:**
- Create: tests/course-learning-shape.test.mjs
- Modify: tools/course-contract.mjs
- Modify: tools/render-course.mjs
- Modify: tests/course-contract.test.mjs
- Modify: tests/render-course.test.mjs

**Interfaces:**
- Lesson fields: lifeExample: { body: string }, artifactChecklist: string[].
- Source fields: author, publishedAt, sourceType, rule.
- Rendered outputs: headings Как это выглядит в жизни and Проверка артефакта; source-map cards show source type, date, and narrow rule.

- [ ] **Step 1: Write the failing test**

```js
test('requires plain-life examples and proof checklists for every lesson', () => {
  const result = validateCourse(sampleCourse);
  assert.equal(result.ok, true);
  for (const lesson of result.value.lessons) {
    assert.equal(typeof lesson.lifeExample.body, 'string');
    assert.ok(lesson.artifactChecklist.length >= 2);
  }
});

test('renders the new learning blocks without calling them certification', async () => {
  const html = await renderOneLesson(sampleCourse.lessons[0]);
  assert.match(html, /Как это выглядит в жизни/);
  assert.match(html, /Проверка артефакта/);
  assert.doesNotMatch(html, /сертификац/i);
});
```

- [ ] **Step 2: Run RED**

Run: node --test tests/course-learning-shape.test.mjs tests/render-course.test.mjs

Expected: fails because the template lacks the fields and markup.

- [ ] **Step 3: Implement the minimum contract and renderer**

```js
if (!lesson.lifeExample || !isNonEmptyString(lesson.lifeExample.body)) {
  errors.push('lesson needs a life example');
}
if (!Array.isArray(lesson.artifactChecklist) || lesson.artifactChecklist.length < 2) {
  errors.push('lesson needs at least two artefact checks');
}
```

Validate author, publishedAt, sourceType, and rule for every source. Render the life example and checklist in semantic sections.

- [ ] **Step 4: Run GREEN**

Run: node --test tests/course-learning-shape.test.mjs tests/course-contract.test.mjs tests/render-course.test.mjs && node --test tests/*.test.mjs

Expected: all tests pass, including source URL safety tests.

- [ ] **Step 5: Commit**

```bash
git add tools/course-contract.mjs tools/render-course.mjs tests/course-learning-shape.test.mjs tests/course-contract.test.mjs tests/render-course.test.mjs
git commit -m "feat: enrich generated course lesson structure"
```

### Task 2: Author the seven-day curriculum and course documents

**Files:**
- Modify: content/course-data.js
- Create: MISSION.md, RESOURCES.md, GLOSSARY.md, SCOPE-LOCK.md, ASSUMPTIONS.md, learning-records/README.md, PUBLISHING-PLAN.md
- Modify: README-RU.md
- Generated: lessons/**/index.html and reference/**/index.html

**Interfaces:**
- Lesson IDs: choose-process, map-roles, define-contracts, build-evals, keep-run-ledger, set-approval-gates, run-shadow-pilot.
- Course output: Agent Org Blueprint v1 made of a Process Passport, role cards, route map, 12 fixtures, Run Ledger, risk matrix, approval policy, and shadow-pilot decision card.

- [ ] **Step 1: Write the failing sequence test**

```js
test('ships the approved seven-lesson agent-organisation curriculum', () => {
  assert.deepEqual(sampleCourse.lessons.map((lesson) => lesson.id), [
    'choose-process', 'map-roles', 'define-contracts', 'build-evals',
    'keep-run-ledger', 'set-approval-gates', 'run-shadow-pilot',
  ]);
  assert.equal(sampleCourse.meta.title, 'Роботы работают');
  assert.equal(sampleCourse.lessons.every((lesson) => lesson.sourceIds.length > 0), true);
});
```

- [ ] **Step 2: Run RED**

Run: node --test tests/course-learning-shape.test.mjs

Expected: template has three placeholder lessons and a placeholder title.

- [ ] **Step 3: Implement complete content and evidence**

Every lesson has one observed outcome, retrieval prompt, familiar studio/work example, plain explanation, named 30-minute artifact, at least two artifact checks, non-trick check, safe stop/approval boundary, source IDs, and next action. Use the verified primary/authoritative source set: OpenAI agent guide and SDK docs, Anthropic agent/evals research, MCP, NIST, OWASP, AgentBench, ToolEmu. Label field reports and research papers accurately.

Write course documents in the original teach formats. Include data ownership/access/deletion, public link scope, no-service-role policy, source gaps, and physical iPhone acceptance boundary.

- [ ] **Step 4: Generate and run GREEN**

Run: node tools/render-course.mjs && node --test tests/course-learning-shape.test.mjs tests/course-contract.test.mjs tests/render-course.test.mjs

Expected: seven lesson pages and source map are generated and validated.

- [ ] **Step 5: Commit**

```bash
git add content/course-data.js MISSION.md RESOURCES.md GLOSSARY.md SCOPE-LOCK.md ASSUMPTIONS.md learning-records/README.md PUBLISHING-PLAN.md README-RU.md lessons reference
git commit -m "feat: add robots work course curriculum"
```

### Task 3: Build strict cloud-progress primitives

**Files:**
- Create: assets/progress-record.js, assets/progress-controller.js, assets/supabase-gateway.js, assets/cloud-config.js, supabase/schema.sql
- Modify: assets/progress-store.js
- Create: tests/progress-record.test.mjs, tests/progress-controller.test.mjs, tests/supabase-gateway.test.mjs

**Interfaces:**
- createEmptyProgress(courseId)
- isValidProgress(value, courseId)
- mergeProgress(courseId, local, remote)
- createProgressController({ localStore, gateway, courseId, onStateChange })
- createSupabaseGateway({ config, clientFactory })

- [ ] **Step 1: Write failing merge and local-first tests**

```js
test('keeps the later completion for every lesson when cloud and device differ', () => {
  const merged = mergeProgress('robots-work', localRecord, remoteRecord);
  assert.deepEqual(merged.completed, {
    choose: { score: 100, completedAt: 15 },
    roles: { score: 100, completedAt: 20 },
  });
});

test('does not let malformed remote progress replace a valid device record', async () => {
  const controller = createProgressController({ localStore, gateway: malformedGateway, courseId: 'robots-work' });
  await controller.restore();
  assert.equal(controller.load().completed.choose.score, 80);
});
```

- [ ] **Step 2: Run RED**

Run: node --test tests/progress-record.test.mjs tests/progress-controller.test.mjs

Expected: missing module or missing API failure.

- [ ] **Step 3: Implement minimum safe behaviour**

Move record schema validation from progress-store.js into progress-record.js without weakening strict JSON parsing. Merge only valid records and choose later completedAt per lesson. Controller first writes current/previous local data, reports local/saving/saved/link-sent/retry, then attempts cloud save. Failure preserves local data and exposes retry.

Gateway is an injected wrapper around the official browser client: magic-link request, current user, one-table select/upsert, sign-out. schema.sql creates course_progress keyed by course_id/user_id, enables RLS, and defines select/insert/update/delete policies using auth.uid() equals user_id and matching WITH CHECK clauses.

- [ ] **Step 4: Run GREEN**

Run: node --test tests/progress-record.test.mjs tests/progress-controller.test.mjs tests/supabase-gateway.test.mjs tests/progress-store.test.mjs && node --test tests/*.test.mjs

Expected: unknown remote fields are rejected and failed cloud save cannot remove local completion.

- [ ] **Step 5: Commit**

```bash
git add assets/progress-record.js assets/progress-controller.js assets/supabase-gateway.js assets/cloud-config.js assets/progress-store.js supabase/schema.sql tests/progress-record.test.mjs tests/progress-controller.test.mjs tests/supabase-gateway.test.mjs
git commit -m "feat: add resilient cloud progress primitives"
```

### Task 4: Integrate cloud state into dashboard and lessons

**Files:**
- Modify: index.html, assets/app.js, assets/lesson-page.js
- Create: tests/cloud-ui.test.mjs
- Modify: tests/app-dom.test.mjs, tests/app-model.test.mjs, tests/lesson-page.test.mjs

**Interfaces:**
- Anonymous readers can take any lesson.
- Dashboard shows a labelled magic-link form when signed out.
- Completion stores locally first and then uses controller cloud state.
- Signed-in dashboard has save status, retry, and sign-out.

- [ ] **Step 1: Write failing user-visible tests**

```js
test('shows a labelled magic-link action to a signed-out reader', () => {
  const root = renderDashboard({ account: null, status: 'local' });
  assert.equal(findByLabel(root, 'Email для сохранения прогресса').tagName, 'input');
  assert.match(textOf(root), /Отправить ссылку для входа/);
});

test('records a passing quiz locally before reporting a cloud retry', async () => {
  const controller = controllerThatFailsCloudSave();
  await submitPassingQuiz({ controller });
  assert.equal(controller.load().completed['choose-process'].score, 100);
  assert.match(lastStatus(controller), /сохранён на устройстве/i);
});
```

- [ ] **Step 2: Run RED**

Run: node --test tests/cloud-ui.test.mjs tests/app-dom.test.mjs tests/lesson-page.test.mjs

Expected: cloud UI and controller path are unavailable.

- [ ] **Step 3: Implement the narrow integration**

Load vendored official client and cloud-config.js before the module. Use gateway only when public config is complete; otherwise preserve local backup and show exact setup state. The form uses a labelled email input, an action button, and aria-live status. On sign-in replace it with save state/retry and a visible Выйти на этом устройстве action. Lessons still work when signed out, then sync on later dashboard login.

- [ ] **Step 4: Run GREEN**

Run: node --test tests/cloud-ui.test.mjs tests/app-dom.test.mjs tests/app-model.test.mjs tests/lesson-page.test.mjs && node --test tests/*.test.mjs

Expected: public reading works and all save outcomes are accessible.

- [ ] **Step 5: Commit**

```bash
git add index.html assets/app.js assets/lesson-page.js tests/cloud-ui.test.mjs tests/app-dom.test.mjs tests/app-model.test.mjs tests/lesson-page.test.mjs
git commit -m "feat: connect dashboard progress to cloud backup"
```

### Task 5: Apply notebook visual identity and app icon

**Files:**
- Modify: assets/styles.css, index.html, manifest.webmanifest, assets/icons/course-icon.svg, assets/icons/course-icon-180.png, assets/icons/course-icon-512.png
- Create: tests/notebook-ui.test.mjs

**Interfaces:**
- Palette: paper #F7F8F4, ink #12313D, graphite #33454B, rule #C9D7D2, signal #D85B2A, verified #167A72.
- Hero includes an accessible route map of coordinator and three specialists.
- Icon is an original no-text coordinator robot above three smaller robots.

- [ ] **Step 1: Write failing visual shell tests**

```js
test('has an accessible role route map and named cloud-progress controls', async () => {
  const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
  assert.match(html, /aria-label="Карта ролей агентов"/);
  assert.match(html, /id="progress-email"/);
});

test('keeps notebook tokens, safe areas, touch targets, focus, and reduced motion', async () => {
  const css = await readFile(new URL('../assets/styles.css', import.meta.url), 'utf8');
  assert.match(css, /env\\(safe-area-inset-top\\)/);
  assert.match(css, /min-height:\\s*44px/);
  assert.match(css, /:focus-visible/);
  assert.match(css, /prefers-reduced-motion/);
});
```

- [ ] **Step 2: Run RED**

Run: node --test tests/notebook-ui.test.mjs

Expected: required route map and design assertions fail.

- [ ] **Step 3: Implement and generate the accepted icon**

Use only the documented palette, system UI text, and mono role labels. Add an inline SVG route mark plus text alternative. No animation library or generic card grid. Generate one original readable robot-organisation icon, export it to 180x180 and 512x512 PNG, and keep an SVG fallback.

- [ ] **Step 4: Run GREEN**

Run: node --test tests/notebook-ui.test.mjs tests/pwa-policy.test.mjs tests/static-shell.test.mjs && node --test tests/*.test.mjs

Expected: all tests pass and both icon files decode to their declared dimensions.

- [ ] **Step 5: Commit**

```bash
git add assets/styles.css index.html manifest.webmanifest assets/icons tests/notebook-ui.test.mjs
git commit -m "feat: add notebook mobile course interface"
```

### Task 6: Regenerate and verify the release candidate

**Files:**
- Modify generated lessons and references
- Create: VALIDATION-REPORT.md
- Modify: README-RU.md, PUBLISHING-PLAN.md

**Interfaces:**
- Produces deterministic pages, a local visual review record, and an evidence-based release report.

- [ ] **Step 1: Regenerate**

Run: node tools/render-course.mjs

- [ ] **Step 2: Run release commands**

```bash
node tools/check-deterministic-render.mjs
node tools/check-internal-links.mjs
node --test tests/*.test.mjs
```

Expected: all exit 0. Resolve stale source map or broken route before continuing.

- [ ] **Step 3: Review in a local browser**

Inspect dashboard and first/last lesson at iPhone-width and desktop: recommendation, source links, valid/corrupt import, signed-out cloud UI, focus, no overflow, and install/activate-only service worker. State that this does not prove real magic-link delivery or physical iPhone installation.

- [ ] **Step 4: Write evidence and commit**

```bash
git add lessons reference VALIDATION-REPORT.md README-RU.md PUBLISHING-PLAN.md
git commit -m "docs: add verified course release evidence"
```

### Task 7: Provision the authorised cloud store and publish

**Files:**
- Modify: assets/cloud-config.js, README-RU.md, VALIDATION-REPORT.md
- Create: .github/workflows/deploy-pages.yml

**Interfaces:**
- Creates public GitHub Pages URL and private RLS-protected cloud rows.

- [ ] **Step 1: Provision Supabase safely**

In the owner-authorised account, create the project, run supabase/schema.sql, enable email magic links, and set exact production redirect URL once Pages URL is known. Inspect table/policies. Never write passwords, service-role keys, cookies, email address, or login link into code or report.

- [ ] **Step 2: Configure public values and regression-test**

Write only project URL, public anon/publishable key, and exact redirect URL to cloud-config.js.

```bash
node tools/render-course.mjs
node tools/check-deterministic-render.mjs
node tools/check-internal-links.mjs
node --test tests/*.test.mjs
```

- [ ] **Step 3: Add Pages workflow, commit, and push feature branch**

Use the official artifact deployment workflow with contents read, pages write, id-token write. It deploys the static root excluding .git.

```bash
git add assets/cloud-config.js .github/workflows/deploy-pages.yml README-RU.md VALIDATION-REPORT.md
git commit -m "chore: configure public course deployment"
git push -u origin feature/robots-work-course
```

- [ ] **Step 4: Deploy through PR flow, never direct push to main**

Create a PR, inspect for secrets, merge using the owner-approved publication authority, and wait for Pages. If a new repository only supports a branch source, explicitly configure the feature branch as temporary Pages source without force push or history rewrite.

- [ ] **Step 5: Verify live result and hand off iPhone acceptance**

Open the HTTPS root and one generated lesson. Confirm manifest/service worker do not redirect. Send one magic link only through owner browser interaction; verify unauthenticated context cannot read other progress. Record only outcome, URL, and timestamp.

Tell the owner: Safari → Share → Add to Home Screen → launch icon → complete a lesson → close/reopen → confirm progress. Do not mark iPhone acceptance passed without owner confirmation.

## Plan self-review

- **Coverage:** Tasks 1–2 build the evidence-based beginner course; 3–4 add resilient private cloud progress; 5 covers visual mobile identity; 6 covers release proof; 7 covers authorised production and iPhone boundary.
- **No placeholders:** every task names files, observable interfaces, commands, expected outcomes, and failure boundaries.
- **Interface consistency:** one strict ProgressRecord flows through storage, merge, controller, gateway, and UI; course data remains the only generated-page input.
