import assert from 'node:assert/strict';
import { cp, readFile, writeFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import test from 'node:test';

import { withTempDir } from './helpers.mjs';

const templateRoot = fileURLToPath(new URL('../', import.meta.url));

test('reports source-map drift when source evidence changes without regeneration', async () => {
  await withTempDir(async (root) => {
    const copiedTemplate = join(root, 'template');
    await cp(templateRoot, copiedTemplate, { recursive: true });
    const sourceDataPath = join(copiedTemplate, 'content', 'course-data.js');
    const sourceData = await readFile(sourceDataPath, 'utf8');
    await writeFile(
      sourceDataPath,
      sourceData.replace(
        'Выбор процесса, компоненты агента и границы.',
        'Изменённое описание доказательства для проверки рассинхронизации.',
      ),
    );

    const result = spawnSync('node', ['tools/check-deterministic-render.mjs'], {
      cwd: copiedTemplate,
      encoding: 'utf8',
    });

    assert.notEqual(result.status, 0);
    assert.match(`${result.stdout}\n${result.stderr}`, /render drift in source map/);
  });
});
