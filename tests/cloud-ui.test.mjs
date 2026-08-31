import assert from 'node:assert/strict';
import test from 'node:test';

import { createProgressRuntime } from '../assets/progress-runtime.js';
import { createEmptyProgress } from '../assets/progress-record.js';

function memoryStore() {
  let value = createEmptyProgress('robots-work');
  return {
    load: () => structuredClone(value),
    recordCompletion(lessonId, score) {
      value = {
        ...value,
        updatedAt: value.updatedAt + 1,
        completed: { ...value.completed, [lessonId]: { score, completedAt: value.updatedAt + 1 } },
      };
      return structuredClone(value);
    },
    importJson(text) {
      value = JSON.parse(text);
      return { ok: true };
    },
  };
}

const publicConfig = {
  url: 'https://example.supabase.co',
  publishableKey: 'sb_publishable_example',
  redirectTo: 'https://course.example.test/',
};

test('keeps blank cloud configuration local and never creates a provider client', async () => {
  let clientCalls = 0;
  const runtime = createProgressRuntime({
    courseId: 'robots-work',
    progressStore: memoryStore(),
    cloudConfig: { url: '', publishableKey: '', redirectTo: '' },
    clientFactory: () => { clientCalls += 1; },
  });

  await runtime.ready;

  assert.equal(runtime.getSnapshot().configured, false);
  assert.equal(runtime.getSnapshot().account, null);
  assert.equal(clientCalls, 0);
});

test('restores a signed-in reader, exposes retry after a failed save, and signs out locally', async () => {
  const store = memoryStore();
  let signedOut = 0;
  let saves = 0;
  const gateway = {
    isConfigured: true,
    async getCurrentUser() { return { id: 'user-1', email: 'owner@example.test' }; },
    async loadProgress() { return null; },
    async saveProgress() {
      saves += 1;
      throw new Error('provider unavailable');
    },
    async signOut() { signedOut += 1; },
  };
  const runtime = createProgressRuntime({
    courseId: 'robots-work',
    progressStore: store,
    cloudConfig: publicConfig,
    gatewayFactory: () => gateway,
  });

  await runtime.ready;
  assert.equal(runtime.getSnapshot().account.email, 'owner@example.test');
  await runtime.recordCompletion('choose-process', 100);
  assert.equal(store.load().completed['choose-process'].score, 100);
  assert.equal(runtime.getSnapshot().state.status, 'retry');
  await assert.rejects(runtime.retry(), /provider unavailable/);
  assert.equal(saves, 2);

  await runtime.signOut();
  assert.equal(signedOut, 1);
  assert.equal(runtime.getSnapshot().account, null);
  assert.equal(store.load().completed['choose-process'].score, 100);
});

test('imports progress into the live controller before retrying a failed cloud backup', async () => {
  const store = memoryStore();
  const uploads = [];
  const gateway = {
    isConfigured: true,
    async getCurrentUser() { return { id: 'user-1', email: 'owner@example.test' }; },
    async loadProgress() { return null; },
    async saveProgress(courseId, progress) {
      uploads.push({ courseId, progress });
      throw new Error('provider unavailable');
    },
    async signOut() {},
  };
  const runtime = createProgressRuntime({
    courseId: 'robots-work',
    progressStore: store,
    cloudConfig: publicConfig,
    gatewayFactory: () => gateway,
  });
  await runtime.ready;
  const imported = {
    ...createEmptyProgress('robots-work'),
    updatedAt: 5,
    completed: { choose: { score: 100, completedAt: 5 } },
  };

  assert.deepEqual(await runtime.importProgress(JSON.stringify(imported)), { ok: true });
  assert.equal(runtime.getSnapshot().state.progress.completed.choose.score, 100);
  assert.equal(runtime.getSnapshot().state.status, 'retry');
  await assert.rejects(runtime.retry(), /provider unavailable/);
  assert.deepEqual(uploads.at(-1), {
    courseId: 'robots-work',
    progress: imported,
  });
  assert.equal(runtime.getSnapshot().state.progress.completed.choose.score, 100);
});
