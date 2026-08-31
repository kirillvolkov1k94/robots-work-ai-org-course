import assert from 'node:assert/strict';
import test from 'node:test';

import { getNextLesson, importSuccessMessage, progressPercent } from '../assets/app.js';

const lessons = [
  { id: 'one' },
  { id: 'two' },
  { id: 'three' },
];

test('selects the earliest unfinished lesson as the next learning action', () => {
  assert.equal(getNextLesson(lessons, { one: { score: 100 } }).id, 'two');
});

test('reports a rounded percentage for completed lessons', () => {
  assert.equal(progressPercent(lessons, { one: { score: 100 } }), 33);
  assert.equal(progressPercent(lessons, {}), 0);
});

test('confirms a successful import without implying remote synchronization', () => {
  assert.equal(importSuccessMessage(), 'Импорт выполнен: локальный прогресс восстановлен.');
});
