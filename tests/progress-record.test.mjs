import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createEmptyProgress,
  isValidProgress,
  mergeProgress,
} from '../assets/progress-record.js';

function record(completed, updatedAt = 0) {
  return { version: 1, courseId: 'robots-work', updatedAt, completed };
}

test('creates and validates the empty record for its course only', () => {
  assert.deepEqual(createEmptyProgress('robots-work'), record({}));
  assert.equal(isValidProgress(record({}), 'robots-work'), true);
  assert.equal(isValidProgress(record({}), 'other-course'), false);
});

test('rejects unknown keys and unsafe progress values', () => {
  assert.equal(isValidProgress({ ...record({}), unexpected: true }, 'robots-work'), false);
  assert.equal(isValidProgress(record({ choose: { score: 100, completedAt: 1, extra: true } }), 'robots-work'), false);
  assert.equal(isValidProgress(record({ choose: { score: 100, completedAt: Number.MAX_SAFE_INTEGER + 1 } }), 'robots-work'), false);
});

test('rejects reserved lesson identifiers before they can affect object prototypes', () => {
  for (const lessonId of ['__proto__', 'constructor', 'prototype']) {
    const candidate = JSON.parse(`{"version":1,"courseId":"robots-work","updatedAt":1,"completed":{"${lessonId}":{"score":100,"completedAt":1}}}`);
    assert.equal(isValidProgress(candidate, 'robots-work'), false);
  }
});

test('keeps the later completion for every lesson when cloud and device differ', () => {
  const local = record({
    choose: { score: 80, completedAt: 15 },
    roles: { score: 100, completedAt: 10 },
  }, 15);
  const remote = record({
    choose: { score: 100, completedAt: 10 },
    roles: { score: 90, completedAt: 20 },
  }, 20);

  assert.deepEqual(mergeProgress('robots-work', local, remote), record({
    choose: { score: 80, completedAt: 15 },
    roles: { score: 90, completedAt: 20 },
  }, 20));
});

test('uses the device completion deterministically when lesson timestamps tie', () => {
  const local = record({ choose: { score: 80, completedAt: 20 } }, 20);
  const remote = record({ choose: { score: 100, completedAt: 20 } }, 20);

  assert.deepEqual(mergeProgress('robots-work', local, remote).completed.choose, {
    score: 80,
    completedAt: 20,
  });
});

test('does not let malformed remote progress replace a valid device record', () => {
  const local = record({ choose: { score: 80, completedAt: 10 } }, 10);
  const malformedRemote = { ...record({}), completed: [], unexpected: true };

  assert.deepEqual(mergeProgress('robots-work', local, malformedRemote), local);
});

test('merges a JSON-own lesson id without reading an inherited completion', () => {
  const remote = record({ toString: { score: 100, completedAt: 10 } }, 10);

  assert.deepEqual(mergeProgress('robots-work', record({}), remote).completed, {
    toString: { score: 100, completedAt: 10 },
  });
});
