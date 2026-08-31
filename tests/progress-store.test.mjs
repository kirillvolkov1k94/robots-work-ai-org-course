import assert from 'node:assert/strict';
import test from 'node:test';

import { createProgressStore } from '../assets/progress-store.js';
import { parseStrictJson } from '../assets/strict-json.js';

function memoryStorage() {
  const values = new Map();
  return {
    getItem(key) {
      return values.has(key) ? values.get(key) : null;
    },
    setItem(key, value) {
      values.set(key, String(value));
    },
  };
}

test('imports a valid exported record without retaining arbitrary keys', () => {
  const source = createProgressStore(memoryStorage(), 'sample-course');
  source.recordCompletion('define-outcome', 100);

  const target = createProgressStore(memoryStorage(), 'sample-course');
  assert.deepEqual(target.importJson(source.exportJson()), { ok: true });
  assert.equal(target.load().completed['define-outcome'].score, 100);
  assert.deepEqual(Object.keys(target.load()), ['version', 'courseId', 'updatedAt', 'completed']);
});

test('rejects invalid JSON without replacing existing progress', () => {
  const store = createProgressStore(memoryStorage(), 'sample-course');
  store.recordCompletion('define-outcome', 80);

  assert.deepEqual(store.importJson('{bad json'), { ok: false, reason: 'invalid-json' });
  assert.equal(store.load().completed['define-outcome'].score, 80);
});

test('rejects an import with unknown top-level data', () => {
  const store = createProgressStore(memoryStorage(), 'sample-course');
  const exported = JSON.parse(store.exportJson());
  exported.unexpected = 'must not survive import';

  assert.deepEqual(store.importJson(JSON.stringify(exported)), { ok: false, reason: 'invalid-progress' });
  assert.deepEqual(store.load().completed, {});
});

test('recovers the last valid progress record when the current record is corrupt', () => {
  const storage = memoryStorage();
  const store = createProgressStore(storage, 'sample-course');
  store.recordCompletion('define-outcome', 80);
  store.recordCompletion('shape-practice', 100);

  storage.setItem('universal-learning-system.sample-course.current', '{not valid JSON');

  const recovered = store.load();
  assert.equal(recovered.completed['define-outcome'].score, 80);
  assert.equal(recovered.completed['shape-practice'], undefined);
});

test('strict parser rejects duplicate JSON keys', () => {
  assert.throws(() => parseStrictJson('{"courseId":"a","courseId":"b"}'), /duplicate key/);
});
