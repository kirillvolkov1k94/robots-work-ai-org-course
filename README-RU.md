# «Роботы работают»

Публичный русскоязычный семидневный курс: за 30 минут в день ученик проектирует и безопасно проверяет маленькую организацию ИИ-агентов для одного процесса студии.

Итог — Agent Org Blueprint v1: Process Passport, role cards, route map, 12 fixtures, Run Ledger, risk matrix, approval policy и shadow-pilot decision card. Курс не обещает доход, безошибочность, автономность или production-запуск.

## Безопасная практика

Studio Intelligence Brief работает только с разрешёнными публичными или подготовленными данными и выдаёт внутренний черновик либо `APPROVAL_REQUEST`. Сообщения, реклама, CRM, запись, платежи, сайт и удаление данных вне курса и требуют отдельного владельческого одобрения.

Приложение хранит только метаданные прогресса. Не вставляй в него клиентские тексты, телефоны, ключи, пароли, договоры или личный Blueprint.

## Локальная проверка

```sh
node tools/render-course.mjs
node tools/check-deterministic-render.mjs
node tools/check-internal-links.mjs
node --test tests/*.test.mjs
```

Авторский источник — `content/course-data.js`; не редактируй вручную `lessons/**/index.html` или `reference/**/index.html`.
