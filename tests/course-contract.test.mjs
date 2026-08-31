import assert from 'node:assert/strict';
import test from 'node:test';

import { validateCourse } from '../tools/course-contract.mjs';

const validCourse = {
  meta: { id: 'sample-course', title: 'A sample course', description: 'A complete sample.', language: 'en' },
  lessons: [{
    id: 'define-outcome',
    slug: 'define-outcome',
    title: 'Define the learning outcome',
    outcome: 'A clear outcome',
    retrieval: 'What makes an outcome observable?',
    sections: [{ heading: 'Recall', body: 'Recall the outcome.' }],
    practice: ['Write the outcome once.'],
    quiz: { question: 'Which outcome is observable?', answers: [{ id: 'yes', text: 'A demonstrable action', correct: true }] },
    nextStep: 'Practice the outcome once.',
    lifeExample: { body: 'A teammate writes the outcome before starting work.' },
    artifactChecklist: ['The action is observable.', 'The evidence is saved.'],
    sourceIds: [],
  }],
  references: [],
  sources: [],
};

test('accepts a course with all required learning fields', () => {
  assert.deepEqual(validateCourse(validCourse), { ok: true, value: validCourse });
});

test('rejects a course without a learner-facing description', () => {
  const course = structuredClone(validCourse);
  delete course.meta.description;

  assert.deepEqual(validateCourse(course), {
    ok: false,
    errors: ['course meta description is missing'],
  });
});

test('rejects two lessons with the same public route', () => {
  const course = structuredClone(validCourse);
  course.lessons.push({ ...structuredClone(course.lessons[0]), id: 'another-lesson' });
  assert.deepEqual(validateCourse(course), {
    ok: false,
    errors: ['duplicate lesson slug: define-outcome'],
  });
});

test('rejects a lesson without an observable outcome', () => {
  const course = structuredClone(validCourse);
  delete course.lessons[0].outcome;
  assert.deepEqual(validateCourse(course), {
    ok: false,
    errors: ['lesson define-outcome is missing outcome'],
  });
});

test('rejects a lesson without a separate retrieval prompt', () => {
  const course = structuredClone(validCourse);
  delete course.lessons[0].retrieval;

  assert.deepEqual(validateCourse(course), {
    ok: false,
    errors: ['lesson define-outcome is missing retrieval prompt'],
  });
});

test('rejects an empty lesson that cannot teach, practice, or check anything', () => {
  const course = structuredClone(validCourse);
  course.lessons[0].sections = [];
  course.lessons[0].practice = [];
  course.lessons[0].quiz = { question: '', answers: [] };

  const result = validateCourse(course);
  assert.equal(result.ok, false);
  assert.ok(result.errors.includes('lesson define-outcome sections must be non-empty'));
  assert.ok(result.errors.includes('lesson define-outcome practice must be non-empty'));
  assert.ok(result.errors.includes('lesson define-outcome quiz question is missing'));
  assert.ok(result.errors.includes('lesson define-outcome quiz answers must be non-empty'));
});

test('rejects a lesson without an explicit next action and source mapping field', () => {
  const course = structuredClone(validCourse);
  delete course.lessons[0].nextStep;
  delete course.lessons[0].sourceIds;

  assert.deepEqual(validateCourse(course), {
    ok: false,
    errors: [
      'lesson define-outcome is missing next step',
      'lesson define-outcome source IDs must be an array',
    ],
  });
});

test('rejects a lesson that maps to an unknown source', () => {
  const course = structuredClone(validCourse);
  course.lessons[0].sourceIds = ['missing-source'];

  assert.deepEqual(validateCourse(course), {
    ok: false,
    errors: ['lesson define-outcome references unknown source ID: missing-source'],
  });
});

test('rejects a lesson slug that could escape the generated lessons directory', () => {
  const course = structuredClone(validCourse);
  course.lessons[0].slug = '../../outside';

  assert.deepEqual(validateCourse(course), {
    ok: false,
    errors: ['lesson define-outcome slug must be URL-safe'],
  });
});

test('rejects a reference slug that could escape the generated reference directory', () => {
  const course = structuredClone(validCourse);
  course.references = [{ slug: '../outside', title: 'Unsafe reference', body: 'Unsafe path.' }];

  assert.deepEqual(validateCourse(course), {
    ok: false,
    errors: ['reference Unsafe reference slug must be URL-safe'],
  });
});

test('reserves the generated source-map reference route', () => {
  const course = structuredClone(validCourse);
  course.references = [{ slug: 'source-map', title: 'Conflicting reference', body: 'Would overwrite generated output.' }];

  assert.deepEqual(validateCourse(course), {
    ok: false,
    errors: ['reference slug source-map is reserved'],
  });
});

test('rejects a source URL with a non-web protocol before it reaches generated href markup', () => {
  const course = structuredClone(validCourse);
  course.sources = [{
    id: 'unsafe',
    title: 'Unsafe source',
    author: 'Test author',
    publishedAt: '2026-08-01',
    sourceType: 'Documentation',
    rule: 'Test rule.',
    url: 'javascript:alert(document.cookie)',
    accessedAt: '2026-08-30',
    usedFor: 'Security test.',
  }];

  assert.deepEqual(validateCourse(course), {
    ok: false,
    errors: ['source Unsafe source URL must use http or https'],
  });
});

test('rejects a source URL that would disclose embedded credentials', () => {
  const course = structuredClone(validCourse);
  course.sources = [{
    id: 'private-source',
    title: 'Private source',
    author: 'Test author',
    publishedAt: '2026-08-01',
    sourceType: 'Documentation',
    rule: 'Test rule.',
    url: 'https://alice:plain-pass@example.com/private-source',
    accessedAt: '2026-08-30',
    usedFor: 'Security test.',
  }];

  assert.deepEqual(validateCourse(course), {
    ok: false,
    errors: ['source Private source URL must not contain credentials or sensitive query parameters'],
  });
});

test('rejects a source URL that would disclose an explicit secret query parameter', () => {
  const course = structuredClone(validCourse);
  course.sources = [{
    id: 'private-source',
    title: 'Private source',
    author: 'Test author',
    publishedAt: '2026-08-01',
    sourceType: 'Documentation',
    rule: 'Test rule.',
    url: 'https://example.com/private-source?apiKey=not-for-publication',
    accessedAt: '2026-08-30',
    usedFor: 'Security test.',
  }];

  assert.deepEqual(validateCourse(course), {
    ok: false,
    errors: ['source Private source URL must not contain credentials or sensitive query parameters'],
  });
});

test('rejects a source URL that would disclose a signed-link parameter', () => {
  const course = structuredClone(validCourse);
  course.sources = [{
    id: 'private-source',
    title: 'Private source',
    author: 'Test author',
    publishedAt: '2026-08-01',
    sourceType: 'Documentation',
    rule: 'Test rule.',
    url: 'https://example.com/private-source?X-Amz-Credential=private-credential&X-Amz-Signature=private-signature',
    accessedAt: '2026-08-30',
    usedFor: 'Security test.',
  }];

  assert.deepEqual(validateCourse(course), {
    ok: false,
    errors: ['source Private source URL must not contain credentials or sensitive query parameters'],
  });
});

test('requires source evidence date and narrow usage mapping', () => {
  const course = structuredClone(validCourse);
  course.sources = [{ id: 'source', title: 'Source', url: 'https://example.com/', accessedAt: '', usedFor: '' }];

  const result = validateCourse(course);
  assert.equal(result.ok, false);
  assert.ok(result.errors.includes('source Source accessed date is missing'));
  assert.ok(result.errors.includes('source Source usage mapping is missing'));
});

test('requires source author, publication date, type, and narrow rule', () => {
  const course = structuredClone(validCourse);
  course.sources = [{ id: 'source', title: 'Source', url: 'https://example.com/', accessedAt: '2026-08-30', usedFor: 'Security test.' }];
  const result = validateCourse(course);
  assert.equal(result.ok, false);
  assert.ok(result.errors.includes('source Source author is missing'));
  assert.ok(result.errors.includes('source Source published date is missing'));
  assert.ok(result.errors.includes('source Source type is missing'));
  assert.ok(result.errors.includes('source Source narrow rule is missing'));
});
