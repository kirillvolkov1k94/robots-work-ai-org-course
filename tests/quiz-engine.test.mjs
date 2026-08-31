import assert from 'node:assert/strict';
import test from 'node:test';

import { gradeQuiz } from '../assets/quiz-engine.js';

const quiz = {
  answers: [
    { id: 'a', correct: true },
    { id: 'b', correct: false },
  ],
};

test('marks an exact answer set as a passing quiz', () => {
  assert.deepEqual(gradeQuiz(quiz, ['a']), {
    score: 100,
    correctIds: ['a'],
    passed: true,
  });
});

test('does not pass when a correct answer is combined with a wrong answer', () => {
  assert.deepEqual(gradeQuiz(quiz, ['a', 'b']), {
    score: 50,
    correctIds: ['a'],
    passed: false,
  });
});
