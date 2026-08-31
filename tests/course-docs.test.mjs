import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import test from 'node:test';

import { sampleCourse } from '../content/course-data.js';
import { renderCourse } from '../tools/render-course.mjs';
import { withTempDir } from './helpers.mjs';

const root = new URL('../', import.meta.url);

async function readRootFile(name) {
  return readFile(join(root.pathname, name), 'utf8');
}

test('documents the only permitted cloud deletion without weakening other data gates', async () => {
  for (const name of ['MISSION.md', 'SCOPE-LOCK.md', 'README-RU.md']) {
    const content = await readRootFile(name);
    assert.match(content, /публичн/i);
    assert.match(content, /email|почт/i);
    assert.match(content, /Supabase/i);
    assert.match(content, /может удалить только собственную запись облачного учебного прогресса/i);
    assert.match(content, /выход не удаляет/i);
    assert.match(content, /удаление клиентских, бизнес- и чужих данных, опубликованных материалов и любых иных данных запрещено/i);
    assert.match(content, /свободн|клиентск|секрет/i);
    assert.doesNotMatch(content, /не хранит[^.\n]*персональн/i);
  }
});

test('uses the current page titles for reviewed sources', () => {
  const titles = Object.fromEntries(sampleCourse.sources.map((source) => [source.id, source.title]));
  assert.equal(titles['openai-orchestration'], 'Agent orchestration');
  assert.equal(titles['openai-evals'], 'Working with evals');
  assert.equal(titles.toolemu, 'Identifying the Risks of LM Agents with an LM-Emulated Sandbox');
});

test('renders a factual source map instead of a replacement template instruction', async () => {
  await withTempDir(async (temporaryRoot) => {
    await renderCourse(sampleCourse, temporaryRoot);
    const sourceMap = await readFile(join(temporaryRoot, 'reference', 'source-map', 'index.html'), 'utf8');
    assert.match(sourceMap, /15 проверенных источников/);
    assert.doesNotMatch(sourceMap, /Замените примеры/);
  });
});
