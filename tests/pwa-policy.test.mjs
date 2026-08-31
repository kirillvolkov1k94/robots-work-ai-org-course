import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import { executeWorker } from './helpers.mjs';

test('service worker registers no network interception handler', async () => {
  const registrations = await executeWorker(new URL('../service-worker.js', import.meta.url));
  assert.deepEqual(registrations.map(({ type }) => type).sort(), ['activate', 'install']);
});

test('manifest declares a standalone iPhone web app with both icon sizes', async () => {
  const manifest = JSON.parse(await readFile(new URL('../manifest.webmanifest', import.meta.url), 'utf8'));
  assert.equal(manifest.display, 'standalone');
  assert.equal(manifest.start_url, './');
  assert.ok(manifest.icons.some((icon) => icon.sizes === '180x180'));
  assert.ok(manifest.icons.some((icon) => icon.sizes === '512x512'));
});
