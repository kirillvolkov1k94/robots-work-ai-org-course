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

function assertNoAffirmativeSupabaseLiveClaim(content) {
  assert.doesNotMatch(content, /supabase[^.\n]*(?<!не )(?:подключ[её]н|работает в production|работает в продакшен|live)/i);
}

function assertNoAffirmativeSignOutDeletion(content) {
  const signOutClauses = content.match(/(?:выход|sign out)[^.!?\n]*/gi) ?? [];
  for (const clause of signOutClauses) {
    for (const deletionVerb of clause.matchAll(/(?:удаля\w*|стира\w*)/gi)) {
      const beforeVerb = clause.slice(Math.max(0, deletionVerb.index - 32), deletionVerb.index);
      assert.match(
        beforeVerb,
        /(?:не|нельзя|запрещено)(?:\s+(?:должен|может))?\s*$/i,
        `affirmative sign-out deletion in clause: ${clause}`,
      );
    }
  }
}

function assertPlannedCloudPolicy(content) {
  assert.match(content, /запланирован[^.\n]*ещё не подключ/i);
  assertNoAffirmativeSupabaseLiveClaim(content);
  assert.match(content, /выход не удаляет её/i);
  assertNoAffirmativeSignOutDeletion(content);
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
    assertPlannedCloudPolicy(content);

  }

  assert.doesNotThrow(() => assertNoAffirmativeSupabaseLiveClaim('Supabase ещё не подключён.'));
  assert.throws(() => assertNoAffirmativeSupabaseLiveClaim('Supabase подключён и работает в production.'));
  assert.doesNotThrow(() => assertNoAffirmativeSignOutDeletion('Выход не должен стирать облачный прогресс.'));
  assert.throws(() => assertNoAffirmativeSignOutDeletion('Выход не удаляет её, но стирает облачный прогресс.'));
  assert.throws(() => assertNoAffirmativeSignOutDeletion('Выход удаляет облачный прогресс.'));
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
