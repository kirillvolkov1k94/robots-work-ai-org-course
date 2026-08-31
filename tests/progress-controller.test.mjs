import assert from 'node:assert/strict';
import test from 'node:test';

import { createProgressController } from '../assets/progress-controller.js';
import { createEmptyProgress } from '../assets/progress-record.js';

function memoryStore(initial = createEmptyProgress('robots-work')) {
  let value = structuredClone(initial);
  return {
    load() {
      return structuredClone(value);
    },
    recordCompletion(lessonId, score) {
      const completedAt = value.updatedAt + 1;
      value = {
        ...value,
        updatedAt: completedAt,
        completed: { ...value.completed, [lessonId]: { score, completedAt } },
      };
      return structuredClone(value);
    },
    importJson(text) {
      value = JSON.parse(text);
      return { ok: true };
    },
  };
}

test('restores local progress before rejecting malformed remote data', async () => {
  const localStore = memoryStore({
    ...createEmptyProgress('robots-work'),
    updatedAt: 10,
    completed: { choose: { score: 80, completedAt: 10 } },
  });
  const states = [];
  const controller = createProgressController({
    localStore,
    gateway: { async loadProgress() { return { completed: [] }; } },
    courseId: 'robots-work',
    onStateChange: (state) => states.push(state.status),
  });

  await controller.restore();

  assert.equal(controller.load().completed.choose.score, 80);
  assert.deepEqual(states, ['local']);
});

test('persists locally before a failed cloud save and exposes retry', async () => {
  const localStore = memoryStore();
  const states = [];
  let saves = 0;
  const controller = createProgressController({
    localStore,
    gateway: {
      async saveProgress() {
        saves += 1;
        throw new Error('provider unavailable');
      },
    },
    courseId: 'robots-work',
    onStateChange: (state) => states.push(state.status),
  });

  await controller.recordCompletion('choose', 100);

  assert.equal(localStore.load().completed.choose.score, 100);
  assert.equal(controller.getState().status, 'retry');
  assert.deepEqual(states, ['local', 'saving', 'retry']);
  await assert.rejects(controller.retry(), /provider unavailable/);
  assert.equal(saves, 2);
  assert.equal(localStore.load().completed.choose.score, 100);
});

test('reports saved and link-sent states through injected gateway methods', async () => {
  const states = [];
  const controller = createProgressController({
    localStore: memoryStore(),
    gateway: {
      async saveProgress() {},
      async requestMagicLink(email) { return { email }; },
    },
    courseId: 'robots-work',
    onStateChange: (state) => states.push(state.status),
  });

  await controller.recordCompletion('choose', 100);
  await controller.requestMagicLink('owner@example.test');

  assert.equal(controller.getState().status, 'link-sent');
  assert.deepEqual(states, ['local', 'saving', 'saved', 'link-sent']);
});
