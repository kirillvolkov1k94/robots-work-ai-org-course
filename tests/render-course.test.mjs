import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import test from 'node:test';

import { renderCourse } from '../tools/render-course.mjs';
import { withTempDir } from './helpers.mjs';

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const course = {
  meta: { id: 'render-fixture', title: 'Render fixture', description: 'Renderer test course.', language: 'en' },
  lessons: [{
    id: 'safe-title',
    slug: 'safe-title',
    title: 'Safe <title>',
    outcome: 'Show safe HTML output.',
    retrieval: 'Recall the safe output rule before reading.',
    sections: [{ heading: 'Part', body: 'Use <strong> only as text.' }],
    practice: ['Write one sentence.'],
    quiz: { question: 'Choose the safe answer.', answers: [{ id: 'yes', text: 'Yes', correct: true }] },
    nextStep: 'Continue with the next practice.',
    lifeExample: { body: 'A coordinator uses a short written brief.' },
    artifactChecklist: ['The brief names an outcome.', 'The evidence is linked.'],
    sourceIds: ['fixture-source'],
  }],
  references: [{ slug: 'reference-fixture', title: 'Reference fixture', body: 'A stable reference page.' }],
  sources: [{
    id: 'fixture-source',
    title: 'Fixture source',
    author: 'Fixture author',
    publishedAt: '2026-08-01',
    sourceType: 'Документация',
    rule: 'Use only the public definition.',
    url: 'https://example.com/',
    accessedAt: '2026-08-30',
    usedFor: 'The fixture lesson source section.',
  }],
};

test('renders navigable pages with escaped lesson content', async () => {
  await withTempDir(async (root) => {
    await renderCourse(course, root);

    const lesson = await readFile(join(root, 'lessons', 'safe-title', 'index.html'), 'utf8');
    const reference = await readFile(join(root, 'reference', 'reference-fixture', 'index.html'), 'utf8');

    assert.match(lesson, /Safe &lt;title&gt;/);
    assert.match(lesson, /<html lang="en">/);
    assert.match(lesson, /<main/);
    assert.match(lesson, /Вспомни сначала[\s\S]*Recall the safe output rule before reading\.[\s\S]*Part/);
    assert.match(lesson, /A coordinator uses a short written brief\./);
    for (const item of course.lessons[0].artifactChecklist) assert.match(lesson, new RegExp(escapeRegExp(item)));
    assert.match(lesson, /Если что-то осталось непонятным, спроси агента/);
    assert.match(lesson, /href="\.\.\/\.\.\/index\.html"/);
    assert.match(lesson, /data-quiz-lesson="safe-title"/);
    assert.match(lesson, /name="answer"/);
    const vendorScript = lesson.indexOf('../../assets/vendor/supabase-js-2.112.4.umd.js');
    const lessonModule = lesson.indexOf('type="module" src="../../assets/lesson-page.js"');
    assert.ok(vendorScript >= 0 && vendorScript < lessonModule, 'loads the UMD client before the lesson module');
    assert.match(lesson, /Следующее действие/);
    assert.match(lesson, /Fixture source/);
    assert.match(reference, /Reference fixture/);
    assert.doesNotMatch(reference, /supabase-js|lesson-page\.js/);
    const sourceMap = await readFile(join(root, 'reference', 'source-map', 'index.html'), 'utf8');
    assert.match(sourceMap, /Карта источников/);
    assert.match(sourceMap, /Документация/);
    assert.match(sourceMap, /2026-08-01/);
    assert.match(sourceMap, /Use only the public definition\./);
  });
});

test('refuses to render a course that violates the contract', async () => {
  await withTempDir(async (root) => {
    const invalid = structuredClone(course);
    invalid.lessons[0].slug = '';
    await assert.rejects(() => renderCourse(invalid, root), /lesson slug is missing/);
  });
});
