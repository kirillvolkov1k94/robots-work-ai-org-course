# Publishing plan — «Роботы работают»

## Pre-publication

1. Запустить renderer, deterministic render, internal-link check и весь Node test suite.
2. Проверить, что единственный authored source — `content/course-data.js`; `lessons/**/index.html` и `reference/**/index.html` только сгенерированы.
3. Просмотреть узкий мобильный layout, keyboard focus, source links, empty/error states и отсутствие service-worker fetch handler.
4. Проверить публичные URLs источников и отсутствие секретов, free-form learner text и service-role credentials.

## Publication gate

Публикация GitHub Pages, push, deploy и заявление о live URL требуют отдельного действия и свежего подтверждения владельца. Этот документ не выполняет публикацию и не доказывает её.

## Human acceptance

После deploy владелец отдельно принимает physical iPhone сценарий: Safari, Home Screen install, открытие урока, локальный progress и понятный cloud failure status. Успешный desktop test не заменяет это принятие.
