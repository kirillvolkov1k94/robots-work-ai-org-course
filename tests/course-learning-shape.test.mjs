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

const LIFE_ANCHOR = '<section><h2>Как это выглядит в жизни</h2>';

function assertLifeAnchorIsFirstInstruction(html, lessonId) {
  const articleStart = html.indexOf('<article class="lesson">');
  const titleStart = html.indexOf('<h1>', articleStart);
  const titleEnd = html.indexOf('</h1>', titleStart);
  const lifeAnchor = html.indexOf(LIFE_ANCHOR, titleEnd);
  assert.ok(articleStart >= 0, `${lessonId}: lesson article is missing`);
  assert.ok(titleStart > articleStart, `${lessonId}: learner-visible opening h1 is missing`);
  assert.ok(titleEnd > titleStart, `${lessonId}: lesson title closing h1 is missing`);
  assert.ok(lifeAnchor > titleEnd, `${lessonId}: life anchor is missing after title`);
  assert.equal(html.slice(titleEnd + '</h1>'.length, lifeAnchor).trim(), '', `${lessonId}: life anchor must be the first learner-visible instruction`);
}

test('renders the life anchor as the first learner-visible instruction after every lesson title', async () => {
  await withTempDir(async (root) => {
    await renderCourse(sampleCourse, root);
    for (const lesson of sampleCourse.lessons) {
      const html = await readFile(join(root, 'lessons', lesson.slug, 'index.html'), 'utf8');
      assertLifeAnchorIsFirstInstruction(html, lesson.id);
      const injectedTechnicalBlock = html.replace(
        LIFE_ANCHOR,
        '<section><h2>Supabase API</h2><p>RLS и JSON schema</p></section>\n  ' + LIFE_ANCHOR,
      );
      assert.throws(() => assertLifeAnchorIsFirstInstruction(injectedTechnicalBlock, lesson.id));
      const missingOpeningHeading = html.replace('<h1>', '');
      assert.throws(() => assertLifeAnchorIsFirstInstruction(missingOpeningHeading, lesson.id));
    }
  });
});

test('keeps deletion outside the learner-owned cloud progress record blocked by the course gate', () => {
  const lesson = sampleCourse.lessons.find((item) => item.id === 'set-approval-gates');
  const content = [...lesson.sections.map((section) => section.body), ...lesson.practice, ...lesson.artifactChecklist].join(' ');
  assert.match(content, /запрещают удаление клиентских, бизнес- и чужих данных, опубликованных материалов и любых иных данных/i);
  assert.match(content, /action gates|стоп-правил/i);
});

test('gives days five and seven a local tabletop run protocol with observable evidence', () => {
  for (const id of ['keep-run-ledger', 'run-shadow-pilot']) {
    const lesson = sampleCourse.lessons.find((item) => item.id === id);
    const content = [...lesson.sections.map((section) => section.body), ...lesson.practice, ...lesson.artifactChecklist].join(' ');
    assert.match(content, /стол|локальн|на бумаге/i);
    assert.match(content, /синтетическ|публичн/i);
    assert.match(content, /время|минут/i);
    assert.match(content, /статус|стоп|результат/i);
    assert.doesNotMatch(content, /отправь|запусти в production/i);
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
