import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { sampleCourse } from '../content/course-data.js';
import { renderCourse } from './render-course.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const temporaryRoot = await mkdtemp(join(tmpdir(), 'uls-render-check-'));

try {
  await renderCourse(sampleCourse, temporaryRoot);
  for (const lesson of sampleCourse.lessons) {
    const generated = await readFile(join(temporaryRoot, 'lessons', lesson.slug, 'index.html'), 'utf8');
    const committed = await readFile(join(root, 'lessons', lesson.slug, 'index.html'), 'utf8');
    assert.equal(committed, generated, `render drift in lesson ${lesson.slug}`);
  }
  for (const reference of sampleCourse.references) {
    const generated = await readFile(join(temporaryRoot, 'reference', reference.slug, 'index.html'), 'utf8');
    const committed = await readFile(join(root, 'reference', reference.slug, 'index.html'), 'utf8');
    assert.equal(committed, generated, `render drift in reference ${reference.slug}`);
  }
  const generatedSourceMap = await readFile(join(temporaryRoot, 'reference', 'source-map', 'index.html'), 'utf8');
  const committedSourceMap = await readFile(join(root, 'reference', 'source-map', 'index.html'), 'utf8');
  assert.equal(committedSourceMap, generatedSourceMap, 'render drift in source map');
} finally {
  await rm(temporaryRoot, { recursive: true, force: true });
}
