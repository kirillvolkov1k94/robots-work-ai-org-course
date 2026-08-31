# «Роботы работают» — Design Specification

## Product decision

Build a public, Russian, seven-day mobile learning web app for Kirill Volkov. It teaches a non-technical learner to design and safely test a small AI-agent organisation for a real studio process. The app is public; each learner's progress is private to their passwordless email identity.

The owner approved public GitHub Pages hosting and a Supabase-backed cloud progress layer on 31 August 2026.

## Success and boundaries

The course succeeds when the learner leaves with an `Agent Org Blueprint v1` for one bounded business process:

- a Process Passport with a baseline and a measurable target;
- three or four role cards and a route map;
- twelve evaluation fixtures and a Run Ledger;
- an approval policy and a seven-day shadow-pilot plan.

It must not promise error-free autonomous agents, a guaranteed economic result, or a live production deployment. During the course, agents may only read approved/synthetic inputs and prepare drafts. Sending a client message, changing advertising, CRM, bookings, payments, the website, or deleting data is outside the course and requires a separate owner approval.

The course stores only lesson-completion metadata: course identifier, lesson identifier, score, and timestamps. It never asks the learner to put client correspondence, phone numbers, API keys, passwords, contracts, or free-form business artefacts into the app.

## Learning model

Every lesson uses this fixed, beginner-first rhythm:

1. **«Вспомни»** — one short retrieval question from the prior lesson.
2. **«Как это выглядит в жизни»** — a familiar analogy from a tattoo studio or ordinary team work.
3. **«Разбираем по-простому»** — only the knowledge needed for the next action; a technical term appears after its plain-language explanation.
4. **«Сделай за 30 минут»** — a small real-world artefact, completed outside the app in the learner's own notes.
5. **«Проверь»** — a fact-based check plus a visible artefact checklist. A passing check only records learning progress; it is not certification or proof that a business system works.
6. **«Дальше»** — the next immediate action and relevant source cards.

The course adapts only through observable, explainable rules. An unfinished lesson remains the recommended next action. When an assessment is passed, the first unfinished lesson becomes next. Lessons refer to the artefact made before them; if it is absent or contradictory, the text tells the learner to stop, use the template, and mark the situation `REVIEW_REQUIRED` rather than inventing business details.

## Seven-day curriculum

| Day | Lesson | Observable output | Everyday anchor |
| --- | --- | --- | --- |
| 1 | Не строим роботов зря | Process Passport with goal, input, output, baseline, one KPI, risk, and human boundary | First decide whether a studio task is a checklist or a situation that needs judgement |
| 2 | Организация, а не толпа | Role map: Coordinator → Specialist → QA → Approval/Archive | A foreman delegates a narrow job; a checker does not do the same job twice |
| 3 | Договоры между роботами | Three role cards and a route table for normal, missing-data, and external-action paths | A paper hand-off between reception, artist, and administrator |
| 4 | Качество до запуска | Twelve fixtures: normal, edge, and prohibited | Test a new tattoo stencil on paper before it reaches skin |
| 5 | Следы, а не красивые отчёты | Three-run Run Ledger | A kitchen ticket shows who did what, when, and what failed |
| 6 | Полномочия и стоп-кран | Risk matrix and approval packets | A junior employee prepares a payment but cannot send it alone |
| 7 | Пилот без ставки всей студии | Agent Org Blueprint v1 and shadow-pilot decision card | Run a rehearsal beside normal work before changing the real process |

The capstone uses the safe `Studio Intelligence Brief` example: a coordinator requests research; a specialist gathers only permitted public/prepared data; an analyst drafts a structured brief; QA checks evidence and rules; the final step emits an internal report or `APPROVAL_REQUEST`. The system has no production write permissions.

## Content evidence

Course factual claims are source-mapped to primary or authoritative sources checked on 31 August 2026. The core principles are: start with the smallest useful system, use clear tools/instructions/guardrails, distinguish a deterministic workflow from dynamic decisions, add multi-agent roles only when justified by measured failure, run multiple evaluation trials, retain traces, and use human approval before impactful actions.

The course is platform-neutral. It may mention Codex and Hermes as familiar examples, but it must not teach a vendor-specific API as the only way to build or evaluate an organisation. The evaluation loop is `fixtures → criteria → repeated runs → outcome review`.

## UX and visual system

**Audience and job.** A public learning app opened in short 30-minute sessions, primarily from an iPhone 15 Pro Max. Its single job is to make a complicated architecture feel as legible as a page from a well-organised working notebook.

**Layout.** One calm vertical column with a narrow 720px reading width, a fixed-safe-area action zone, and no dashboard clutter. The dashboard opens with the current recommended action; lessons use consistent labelled blocks in the learning rhythm above. At 375px, 430px, 768px, and desktop widths, there must be no horizontal overflow. All targets are at least 44px and focus is always visible.

**Tokens.** The interface avoids the generic purple-AI template recommended by a generic design lookup. Instead it uses a deliberate drafting-table palette:

- paper: `#F7F8F4`;
- ink: `#12313D`;
- graphite: `#33454B`;
- rule line: `#C9D7D2`;
- signal orange for human gates only: `#D85B2A`;
- verified teal: `#167A72`.

Body copy uses the system UI stack for fast iPhone rendering; role IDs, route labels, and evidence fields use a system monospace stack. The two typographic roles make the route map feel like a real work note without downloading a font or introducing an extra third-party request.

**Signature.** The hero is an original “workforce pyramid” mark: a central coordinator robot connects to three small role robots by labelled, directional lines. It is a metaphor, not a claim that healthy agent organisations are literal hierarchies. As progress grows, a small CSS/SVG route line becomes more complete; motion is optional, under 250ms, and disabled by `prefers-reduced-motion`.

**Self-critique.** A generic card grid, an all-purpose dark AI interface, or decorative robots would obscure the course's purpose. The final direction uses a notebook's actual information primitives—labels, ruled lines, checked evidence, and a route diagram—to encode real state rather than decoration.

## Public PWA and Safari policy

The app is a static GitHub Pages site with a web manifest, 180px and 512px icons, `display: standalone`, `start_url: "./"`, a mobile viewport, and safe-area CSS. Its service worker may register only `install` and `activate`. It must never define a `fetch` handler, cache navigation, rewrite responses, redirect, or claim offline behaviour. This intentionally excludes the Safari service-worker failure class previously observed in this project family.

Static files remain useful when the network is present. Cloud save failures never block the lesson: local current and previous valid records remain the immediate fallback, and JSON export/import remain available as an owner-controlled backup.

## Cloud progress architecture

### Chosen model

Use a Supabase project with passwordless email magic-link authentication and Row Level Security (RLS). An unauthenticated visitor can read public course materials but sees a clear “connect your progress” action. After one email confirmation, the existing session is restored by the official browser client on later launches.

Email login is deliberately chosen over anonymous auth because an anonymous browser identity cannot be recovered after browser data is removed or a new device is used. No password is stored or requested by the app.

### Data model

`public.course_progress` stores one record per `(course_id, user_id)`:

```sql
course_id  text        not null
user_id    uuid        not null references auth.users(id) on delete cascade
progress   jsonb       not null
updated_at timestamptz not null default now()
primary key (course_id, user_id)
```

The JSON payload has the same strict schema as local progress: version, course ID, monotonic timestamp, and completed lesson score/timestamps. It contains no practice text.

RLS permits an authenticated user to select, insert, update, and delete only rows where `auth.uid() = user_id`. The browser contains only the Supabase URL and publishable/anon key; it never contains a service-role key, database password, or admin token.

### Reconciliation and failure behaviour

1. Completion is written to local current/previous records first.
2. If the learner is signed in, the client synchronises the strictly validated record to their row.
3. On sign-in or startup, local and remote records merge lesson-by-lesson using the later `completedAt`, then the merged record is uploaded. Invalid remote data is ignored and never overwrites a valid local record.
4. A failed cloud request shows a precise, non-alarming status and retains a retry action plus JSON export. No hidden background analytics or unrelated network requests occur.
5. Sign-out is explicitly visible and affects only the local device session; it never deletes cloud progress.

## Delivery and acceptance

1. Source content is authored only in `content/course-data.js`; generated lesson and reference HTML is never hand-edited.
2. Unit tests cover strict local records, remote merge behaviour, cloud state messages, content contract, generated routes, PWA policy, and mobile shell semantics.
3. Required commands: renderer, deterministic renderer, internal-link check, and all Node tests.
4. A local visual review checks narrow mobile layout, focus, source links, authentication empty/error states, and the service-worker rule.
5. GitHub Pages publication and the exact live URL are only claimed after successful deployment. Physical iPhone Home Screen installation remains a user acceptance step and is not inferred from desktop or emulator checks.

