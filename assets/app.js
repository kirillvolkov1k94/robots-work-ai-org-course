import { sampleCourse } from '../content/course-data.js';
import { createProgressStore } from './progress-store.js';

export function getNextLesson(lessons, completed) {
  return lessons.find((lesson) => !completed[lesson.id]) ?? lessons.at(-1);
}

export function progressPercent(lessons, completed) {
  if (lessons.length === 0) return 0;
  const completedCount = lessons.filter((lesson) => completed[lesson.id]).length;
  return Math.round((completedCount / lessons.length) * 100);
}

export function importSuccessMessage() {
  return 'Импорт выполнен: локальный прогресс восстановлен.';
}

function createElement(document, tagName, options = {}) {
  const element = document.createElement(tagName);
  if (options.className) element.className = options.className;
  if (options.text) element.textContent = options.text;
  if (options.attributes) {
    for (const [name, value] of Object.entries(options.attributes)) {
      element.setAttribute(name, value);
    }
  }
  return element;
}

function createButton(document, text, onClick) {
  const button = createElement(document, 'button', { className: 'button button-secondary', text, attributes: { type: 'button' } });
  button.addEventListener('click', onClick);
  return button;
}

function buildLessonList(document, course, completed) {
  const list = createElement(document, 'ol', { className: 'lesson-list' });
  for (const lesson of course.lessons) {
    const item = createElement(document, 'li', { className: completed[lesson.id] ? 'lesson-item is-complete' : 'lesson-item' });
    const link = createElement(document, 'a', {
      text: lesson.title,
      attributes: { href: `lessons/${encodeURIComponent(lesson.slug)}/` },
    });
    const status = createElement(document, 'span', {
      className: 'lesson-status',
      text: completed[lesson.id] ? `Пройдено: ${completed[lesson.id].score}%` : 'Следующий шаг',
    });
    item.append(link, status);
    list.append(item);
  }
  return list;
}

function exportProgress(window, store, setStatus) {
  const blob = new Blob([store.exportJson()], { type: 'application/json' });
  const url = window.URL.createObjectURL(blob);
  const anchor = window.document.createElement('a');
  anchor.href = url;
  anchor.download = 'learning-progress-backup.json';
  anchor.click();
  window.URL.revokeObjectURL(url);
  setStatus('Резервная копия прогресса подготовлена для сохранения на устройстве.');
}

function buildDashboard(document, window, course, store, render) {
  const state = store.load();
  const next = getNextLesson(course.lessons, state.completed);
  const percentage = progressPercent(course.lessons, state.completed);
  const fragment = document.createDocumentFragment();
  const status = createElement(document, 'p', {
    className: 'status-message',
    attributes: { 'aria-live': 'polite', 'aria-atomic': 'true' },
  });
  const setStatus = (message) => { status.textContent = message; };

  const hero = createElement(document, 'section', { className: 'hero' });
  hero.append(
    createElement(document, 'p', { className: 'eyebrow', text: 'Учебный маршрут' }),
    createElement(document, 'h1', { text: course.meta.title }),
    createElement(document, 'p', { className: 'hero-copy', text: course.meta.description }),
  );

  const progress = createElement(document, 'section', { className: 'progress-card', attributes: { 'aria-labelledby': 'progress-title' } });
  progress.append(
    createElement(document, 'h2', { text: 'Текущий прогресс', attributes: { id: 'progress-title' } }),
    createElement(document, 'p', { className: 'progress-value', text: `${percentage}%` }),
  );
  const meter = createElement(document, 'div', { className: 'progress-meter', attributes: { role: 'progressbar', 'aria-valuemin': '0', 'aria-valuemax': '100', 'aria-valuenow': String(percentage), 'aria-label': 'Прогресс курса' } });
  meter.append(createElement(document, 'span', { attributes: { style: `width: ${percentage}%` } }));
  progress.append(meter);

  const nextCard = createElement(document, 'section', { className: 'next-card', attributes: { 'aria-labelledby': 'next-title' } });
  nextCard.append(
    createElement(document, 'p', { className: 'eyebrow', text: 'Рекомендуемое действие' }),
    createElement(document, 'h2', { text: next.title, attributes: { id: 'next-title' } }),
    createElement(document, 'p', { text: next.outcome }),
    createElement(document, 'a', { className: 'button button-primary', text: 'Открыть урок', attributes: { href: `lessons/${encodeURIComponent(next.slug)}/` } }),
  );

  const listSection = createElement(document, 'section', { className: 'course-map', attributes: { 'aria-labelledby': 'course-map-title' } });
  listSection.append(createElement(document, 'h2', { text: 'Карта курса', attributes: { id: 'course-map-title' } }), buildLessonList(document, course, state.completed));

  const backup = createElement(document, 'section', { className: 'backup-card', attributes: { 'aria-labelledby': 'backup-title' } });
  backup.append(createElement(document, 'h2', { text: 'Прогресс и резервная копия', attributes: { id: 'backup-title' } }));
  backup.append(createElement(document, 'p', { text: 'По умолчанию прогресс хранится только в этом браузере. Экспортируй JSON, если нужна отдельная копия.' }));
  backup.append(createButton(document, 'Экспортировать прогресс', () => exportProgress(window, store, setStatus)));
  const importLabel = createElement(document, 'label', { className: 'file-button', text: 'Импортировать резервную копию' });
  const input = createElement(document, 'input', { attributes: { type: 'file', accept: 'application/json,.json' } });
  input.addEventListener('change', async () => {
    const file = input.files?.[0];
    if (!file) return;
    const result = store.importJson(await file.text());
    if (!result.ok) {
      setStatus('Импорт не выполнен: файл не соответствует формату этого курса.');
      return;
    }
    render(importSuccessMessage());
  });
  importLabel.append(input);
  backup.append(importLabel, status);

  fragment.append(hero, progress, nextCard, listSection, backup);
  return fragment;
}

export function bootCourseApp({ document, window, course = sampleCourse, progressStore } = {}) {
  const root = document.querySelector('#app');
  if (!root) throw new Error('course root is missing');
  if (document.documentElement && course.meta.language) document.documentElement.lang = course.meta.language;
  const store = progressStore ?? createProgressStore(window.localStorage, course.meta.id);
  const render = (statusMessage = '') => {
    root.replaceChildren(buildDashboard(document, window, course, store, render));
    const status = root.querySelector('.status-message');
    if (statusMessage && status) status.textContent = statusMessage;
  };
  render();
  return { render, store };
}

if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  bootCourseApp({ document, window });
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./service-worker.js').catch(() => undefined);
  }
}
