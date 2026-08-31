import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { sampleCourse } from '../content/course-data.js';
import { validateCourse } from './course-contract.mjs';

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function pageShell({ title, body, language = 'ru', assetPrefix, homePrefix, scriptPath = null }) {
  return `<!doctype html>
<html lang="${escapeHtml(language)}">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
    <meta name="theme-color" content="#0f766e">
    <link rel="stylesheet" href="${assetPrefix}assets/styles.css">
    <link rel="manifest" href="${homePrefix}manifest.webmanifest">
    <link rel="apple-touch-icon" href="${assetPrefix}assets/icons/course-icon-180.png">
    <title>${escapeHtml(title)}</title>
  </head>
  <body>
    <a class="skip-link" href="#content">К содержанию</a>
    <header class="site-header"><a href="${homePrefix}index.html">Учебная система</a></header>
    <main id="content" aria-label="Материал курса">${body}</main>
    ${scriptPath ? `<script type="module" src="${scriptPath}"></script>` : ''}
  </body>
</html>
`;
}

function renderLesson(lesson, sourcesById) {
  const sections = lesson.sections
    .map((section) => `<section><h2>${escapeHtml(section.heading)}</h2><p>${escapeHtml(section.body)}</p></section>`)
    .join('\n');
  const practice = lesson.practice.map((item) => `<li>${escapeHtml(item)}</li>`).join('');
  const artifactChecks = lesson.artifactChecklist.map((item) => `<li>${escapeHtml(item)}</li>`).join('');
  const answers = lesson.quiz.answers
    .map((answer) => `<label class="quiz-answer"><input type="checkbox" name="answer" value="${escapeHtml(answer.id)}"> ${escapeHtml(answer.text)}</label>`)
    .join('');
  const sources = lesson.sourceIds
    .map((sourceId) => sourcesById.get(sourceId))
    .map((source) => `<li><a href="${escapeHtml(source.url)}">${escapeHtml(source.title)}</a></li>`)
    .join('');

  return `<article class="lesson">
  <p class="eyebrow">Урок</p>
  <h1>${escapeHtml(lesson.title)}</h1>
  <section><h2>Как это выглядит в жизни</h2><p>${escapeHtml(lesson.lifeExample.body)}</p></section>
  <p class="outcome"><strong>Результат:</strong> ${escapeHtml(lesson.outcome)}</p>
  <section class="retrieval"><h2>Вспомни сначала</h2><p>${escapeHtml(lesson.retrieval)}</p></section>
  ${sections}
  <section><h2>Практика</h2><ol>${practice}</ol></section>
  <section><h2>Проверка артефакта</h2><ul>${artifactChecks}</ul></section>
  <section><h2>Проверь себя</h2><form class="quiz-form" data-quiz-lesson="${escapeHtml(lesson.id)}"><fieldset><legend>${escapeHtml(lesson.quiz.question)}</legend>${answers}</fieldset><button class="button button-primary" type="submit">Проверить ответ</button><p data-quiz-status aria-live="polite"></p></form></section>
  <section><h2>Источники</h2><ul>${sources}</ul></section>
  <section><h2>Следующее действие</h2><p>${escapeHtml(lesson.nextStep)}</p></section>
  <aside class="lesson-help" aria-label="Помощь по уроку"><p>Если что-то осталось непонятным, спроси агента и назови урок или конкретный фрагмент.</p></aside>
</article>`;
}

function renderReference(reference) {
  return `<article class="reference">
  <p class="eyebrow">Справочник</p>
  <h1>${escapeHtml(reference.title)}</h1>
  <p>${escapeHtml(reference.body)}</p>
</article>`;
}

function renderSourceMap(sources) {
  const items = sources.length === 0
    ? '<li>В этом учебном примере источники ещё не добавлены.</li>'
    : sources.map((source) => `<li id="source-${escapeHtml(source.id)}" class="source-card"><a href="${escapeHtml(source.url)}">${escapeHtml(source.title)}</a><br><small>Тип: ${escapeHtml(source.sourceType)}</small><br><small>Опубликовано: ${escapeHtml(source.publishedAt)}</small><br><small>Правило: ${escapeHtml(source.rule)}</small><br><small>Проверено: ${escapeHtml(source.accessedAt)}</small><br><small>Использовано для: ${escapeHtml(source.usedFor)}</small></li>`).join('');
  return `<article class="reference"><p class="eyebrow">Справочник</p><h1>Карта источников</h1><p>Здесь ${sources.length} проверенных источников курса: для каждого указаны тип, дата, правило применения и область уроков. Источники проверены на дату, указанную в карточке.</p><ul>${items}</ul></article>`;
}

async function writePage(root, segments, html) {
  const directory = join(root, ...segments);
  await mkdir(directory, { recursive: true });
  await writeFile(join(directory, 'index.html'), html, 'utf8');
}

export function renderHtmlPage({ title, body, language = 'ru', assetPrefix = '../../', homePrefix = '../../', scriptPath = null }) {
  return pageShell({ title, body, language, assetPrefix, homePrefix, scriptPath });
}

export async function renderCourse(course, root) {
  const validation = validateCourse(course);
  if (!validation.ok) throw new Error(validation.errors.join('; '));

  const sourcesById = new Map(validation.value.sources.map((source) => [source.id, source]));
  await Promise.all(validation.value.lessons.map((lesson) => writePage(
    root,
    ['lessons', lesson.slug],
    renderHtmlPage({ title: lesson.title, body: renderLesson(lesson, sourcesById), language: validation.value.meta.language, scriptPath: '../../assets/lesson-page.js' }),
  )));

  await Promise.all(validation.value.references.map((reference) => writePage(
    root,
    ['reference', reference.slug],
    renderHtmlPage({ title: reference.title, body: renderReference(reference), language: validation.value.meta.language }),
  )));

  await writePage(
    root,
    ['reference', 'source-map'],
    renderHtmlPage({ title: 'Карта источников', body: renderSourceMap(validation.value.sources), language: validation.value.meta.language }),
  );
}

const modulePath = fileURLToPath(import.meta.url);
if (process.argv[1] && resolve(process.argv[1]) === modulePath) {
  const root = resolve(dirname(modulePath), '..');
  await renderCourse(sampleCourse, root);
}
