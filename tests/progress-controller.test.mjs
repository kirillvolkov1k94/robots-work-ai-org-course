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
      async saveProgress(courseId, progress) { return progress; },
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

test('does not claim saved when a gateway returns an undefined save envelope', async () => {
  const controller = createProgressController({
    localStore: memoryStore(),
    gateway: { async saveProgress() { return undefined; } },
    courseId: 'robots-work',
  });

  await controller.recordCompletion('choose', 100);

  assert.equal(controller.getState().status, 'retry');
  assert.equal(controller.load().completed.choose.score, 100);
});

test('does not claim link-sent when a gateway returns an undefined magic-link envelope', async () => {
  const controller = createProgressController({
    localStore: memoryStore(),
    gateway: { async requestMagicLink() { return undefined; } },
    courseId: 'robots-work',
  });

  await assert.rejects(controller.requestMagicLink('owner@example.test'), /malformed response/);

  assert.equal(controller.getState().status, 'retry');
});

test('serializes snapshots so an older cloud request cannot finish after newer local progress', async () => {
  const pending = [];
  const controller = createProgressController({
    localStore: memoryStore(),
    gateway: {
      saveProgress(courseId, progress) {
        return new Promise((resolve) => pending.push({ courseId, progress, resolve }));
      },
    },
    courseId: 'robots-work',
  });

  const first = controller.recordCompletion('choose', 100);
  const second = controller.recordCompletion('roles', 100);
  await Promise.resolve();

  assert.equal(pending.length, 1);
  pending[0].resolve(pending[0].progress);
  await first;
  await Promise.resolve();

  assert.equal(pending.length, 2);
  assert.deepEqual(Object.keys(pending[1].progress.completed), ['choose', 'roles']);
  pending[1].resolve(pending[1].progress);
  await Promise.all([first, second]);

  assert.equal(controller.getState().status, 'saved');
});

test('uploads a local and remote merge after safely persisting it', async () => {
  const localStore = memoryStore({
    ...createEmptyProgress('robots-work'),
    updatedAt: 10,
    completed: { choose: { score: 80, completedAt: 10 } },
  });
  const remote = {
    ...createEmptyProgress('robots-work'),
    updatedAt: 20,
    completed: { roles: { score: 100, completedAt: 20 } },
  };
  const uploads = [];
  const controller = createProgressController({
    localStore,
    gateway: {
      async loadProgress() { return remote; },
      async saveProgress(courseId, progress) {
        uploads.push({ courseId, progress });
        return progress;
      },
    },
    courseId: 'robots-work',
  });

  await controller.restore();

  assert.deepEqual(localStore.load().completed, {
    choose: { score: 80, completedAt: 10 },
    roles: { score: 100, completedAt: 20 },
  });
  assert.deepEqual(uploads, [{
    courseId: 'robots-work',
    progress: {
      version: 1,
      courseId: 'robots-work',
      updatedAt: 20,
      completed: {
        choose: { score: 80, completedAt: 10 },
        roles: { score: 100, completedAt: 20 },
      },
    },
  }]);
});
