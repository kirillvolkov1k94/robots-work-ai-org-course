# Publishing plan — «Роботы работают»

## Pre-publication

1. Запустить renderer, deterministic render, internal-link check и весь Node test suite.
2. Проверить, что единственный authored source — `content/course-data.js`; `lessons/**/index.html` и `reference/**/index.html` только сгенерированы.
3. Просмотреть узкий мобильный layout, keyboard focus, source links, empty/error states и отсутствие service-worker fetch handler.
4. Проверить публичные URLs источников и отсутствие секретов, free-form learner text и service-role credentials.

Локальное, облачное и публичное доказательство этого этапа за 2026-09-01 находится в [VALIDATION-REPORT.md](VALIDATION-REPORT.md). Supabase настроен с owner-only RLS и точным production redirect. GitHub Pages собран из `main`; публичные главная, первый урок, manifest и service worker проверены по HTTPS. Принятия на физическом iPhone пока нет.

## Publication gate

Владелец разрешил публикацию GitHub Pages, push и deploy в рамках этого проекта. 2026-09-01 релиз прошёл отдельным проверяемым шагом через pull request в `main`; этот документ сам по себе ничего не публикует и не заменяет live-проверку.

## Human acceptance

После deploy владелец отдельно принимает physical iPhone сценарий: Safari, Home Screen install, открытие урока, локальный progress и понятный cloud failure status. Успешный desktop test не заменяет это принятие.
