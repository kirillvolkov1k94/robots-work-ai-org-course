import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import test from 'node:test';

import { sampleCourse } from '../content/course-data.js';
import { renderCourse } from '../tools/render-course.mjs';
import { validateCourse } from '../tools/course-contract.mjs';
import { withTempDir } from './helpers.mjs';

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
  assert.ok(result.errors.includes('lesson define-outcome needs a life example'));
});

test('rejects a lesson with fewer than two artifact checks', () => {
  const invalidCourse = structuredClone(sampleCourse);
  invalidCourse.lessons[0].artifactChecklist = ['Only one check.'];

  const result = validateCourse(invalidCourse);
  assert.equal(result.ok, false);
  assert.ok(result.errors.includes('lesson define-outcome needs at least two artefact checks'));
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
