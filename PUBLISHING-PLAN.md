# Publishing plan — «Роботы работают»

## Pre-publication

1. Запустить renderer, deterministic render, internal-link check и весь Node test suite.
2. Проверить, что единственный authored source — `content/course-data.js`; `lessons/**/index.html` и `reference/**/index.html` только сгенерированы.
3. Просмотреть узкий мобильный layout, keyboard focus, source links, empty/error states и отсутствие service-worker fetch handler.
4. Проверить публичные URLs источников и отсутствие секретов, free-form learner text и service-role credentials.

Локальное и облачное доказательство этого этапа за 2026-09-01 находится в [VALIDATION-REPORT.md](VALIDATION-REPORT.md). Supabase уже настроен с owner-only RLS и точным production redirect; GitHub Pages настроен на ветку `main`, но этот релиз-кандидат ещё не влит и не доказан по публичному URL. Принятия на iPhone также ещё нет.

## Publication gate

Владелец уже разрешил публикацию GitHub Pages, push и deploy в рамках этого проекта. Они всё равно выполняются отдельным проверяемым шагом; этот документ сам по себе ничего не публикует и не доказывает live-состояние.

## Human acceptance

После deploy владелец отдельно принимает physical iPhone сценарий: Safari, Home Screen install, открытие урока, локальный progress и понятный cloud failure status. Успешный desktop test не заменяет это принятие.
