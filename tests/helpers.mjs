import { readFile, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import vm from 'node:vm';

export async function withTempDir(run) {
  const root = await mkdtemp(join(tmpdir(), 'universal-learning-system-'));
  try {
    return await run(root);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

export async function executeWorker(path) {
  const registrations = [];
  const self = {
    addEventListener(type, listener) {
      registrations.push({ type, listener });
    },
    skipWaiting() {},
  };
  const source = await readFile(path, 'utf8');
  vm.runInNewContext(source, { self, caches: { keys: async () => [] }, Promise });
  return registrations;
}
