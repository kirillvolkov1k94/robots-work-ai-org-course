import assert from 'node:assert/strict';
import test from 'node:test';

import { bindLessonPage, formatQuizFeedback } from '../assets/lesson-page.js';
import { createProgressController } from '../assets/progress-controller.js';
import { createEmptyProgress } from '../assets/progress-record.js';

test('explains that a passed quiz records a local copy first', () => {
  assert.equal(
    formatQuizFeedback({ score: 100, passed: true }),
    'Верно: 100%. Прогресс этого урока сохранён на устройстве.',
  );
});

class FakeForm {
  constructor() {
    this.dataset = { quizLesson: 'choose-process' };
    this.listeners = new Map();
    this.status = { textContent: '' };
  }

  addEventListener(type, listener) { this.listeners.set(type, listener); }

  querySelector(selector) { return selector === '[data-quiz-status]' ? this.status : null; }
}

test('records a passing quiz locally before reporting a cloud retry', async () => {
  let record = createEmptyProgress('robots-work');
  const store = {
    load: () => structuredClone(record),
    recordCompletion(lessonId, score) {
      record = { ...record, updatedAt: 1, completed: { ...record.completed, [lessonId]: { score, completedAt: 1 } } };
      return structuredClone(record);
    },
  };
  const controller = createProgressController({
    localStore: store,
    courseId: 'robots-work',
    gateway: { async saveProgress() { throw new Error('offline'); } },
  });
  const form = new FakeForm();
  const document = { querySelectorAll: () => [form] };
  const previousFormData = globalThis.FormData;
  globalThis.FormData = class {
    getAll() { return ['unknown-owner']; }
  };
  try {
    bindLessonPage({ document, window: { localStorage: {} }, progressStore: store, progressController: controller });
    await form.listeners.get('submit')({ preventDefault() {} });
  } finally {
    globalThis.FormData = previousFormData;
  }

  assert.equal(controller.load().completed['choose-process'].score, 100);
  assert.match(form.status.textContent, /сохранён на устройстве; облако/i);
});

test('directs an incomplete answer back to the material without recording completion', () => {
  assert.equal(
    formatQuizFeedback({ score: 50, passed: false }),
    'Результат: 50%. Вернись к материалу и попробуй ещё раз.',
  );
});
