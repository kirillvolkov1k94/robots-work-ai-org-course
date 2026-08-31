import assert from 'node:assert/strict';
import test from 'node:test';

import { formatQuizFeedback } from '../assets/lesson-page.js';

test('explains that a passed quiz records only local course progress', () => {
  assert.equal(
    formatQuizFeedback({ score: 100, passed: true }),
    'Верно: 100%. Прогресс этого урока сохранён только в этом браузере.',
  );
});

test('directs an incomplete answer back to the material without recording completion', () => {
  assert.equal(
    formatQuizFeedback({ score: 50, passed: false }),
    'Результат: 50%. Вернись к материалу и попробуй ещё раз.',
  );
});
