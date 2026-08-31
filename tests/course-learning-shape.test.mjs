import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import test from 'node:test';

import { sampleCourse } from '../content/course-data.js';
import { renderCourse } from '../tools/render-course.mjs';
import { validateCourse } from '../tools/course-contract.mjs';
import { withTempDir } from './helpers.mjs';

test('ships the approved seven-lesson agent-organisation curriculum', () => {
  assert.deepEqual(sampleCourse.lessons.map((lesson) => lesson.id), [
    'choose-process', 'map-roles', 'define-contracts', 'build-evals',
    'keep-run-ledger', 'set-approval-gates', 'run-shadow-pilot',
  ]);
  assert.equal(sampleCourse.meta.title, 'Роботы работают');
  assert.equal(sampleCourse.lessons.every((lesson) => lesson.sourceIds.length > 0), true);
});

test('requires plain-life examples and proof checklists for every lesson', () => {
  const result = validateCourse(sampleCourse);
  assert.equal(result.ok, true);
  for (const lesson of result.value.lessons) {
    assert.equal(typeof lesson.lifeExample.body, 'string');
    assert.ok(lesson.artifactChecklist.length >= 2);
  }
});

test('rejects a lesson without a plain-life example', () => {
  const invalidCourse = structuredClone(sampleCourse);
  delete invalidCourse.lessons[0].lifeExample;

  const result = validateCourse(invalidCourse);
  assert.equal(result.ok, false);
  assert.ok(result.errors.includes('lesson choose-process needs a life example'));
});

test('rejects a lesson with fewer than two artifact checks', () => {
  const invalidCourse = structuredClone(sampleCourse);
  invalidCourse.lessons[0].artifactChecklist = ['Only one check.'];

  const result = validateCourse(invalidCourse);
  assert.equal(result.ok, false);
  assert.ok(result.errors.includes('lesson choose-process needs at least two artefact checks'));
});

test('renders the new learning blocks without calling them certification', async () => {
  await withTempDir(async (root) => {
    await renderCourse(sampleCourse, root);
    const html = await readFile(join(root, 'lessons', `${sampleCourse.lessons[0].slug}`, 'index.html'), 'utf8');
    assert.match(html, /Как это выглядит в жизни/);
    assert.match(html, /Проверка артефакта/);
    assert.doesNotMatch(html, /сертификац/i);
  });
});
