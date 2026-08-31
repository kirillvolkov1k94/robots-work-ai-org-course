import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import test from 'node:test';

import { checkInternalLinks } from '../tools/check-internal-links.mjs';
import { withTempDir } from './helpers.mjs';

test('finds no broken internal links in the rendered template', async () => {
  assert.deepEqual(await checkInternalLinks(new URL('../', import.meta.url)), []);
});

test('reports a missing relative target without treating an external URL as local', async () => {
  await withTempDir(async (root) => {
    await mkdir(join(root, 'pages'));
    await writeFile(join(root, 'pages', 'index.html'), '<a href="missing.html">Broken</a><a href="https://example.com">External</a>');

    assert.deepEqual(await checkInternalLinks(root), [{
      from: 'pages/index.html',
      href: 'missing.html',
      target: 'pages/missing.html',
    }]);
  });
});
