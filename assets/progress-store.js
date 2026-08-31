import { parseStrictJson } from './strict-json.js';

const VERSION = 1;
const TOP_LEVEL_KEYS = new Set(['version', 'courseId', 'updatedAt', 'completed']);
const COMPLETION_KEYS = new Set(['score', 'completedAt']);

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value) && Object.getPrototypeOf(value) === Object.prototype;
}

function hasOnlyKeys(value, allowed) {
  return Object.keys(value).every((key) => allowed.has(key));
}

function isTimestamp(value) {
  return Number.isSafeInteger(value) && value >= 0;
}

function emptyProgress(courseId) {
  return { version: VERSION, courseId, updatedAt: 0, completed: {} };
}

function validateProgress(value, courseId) {
  if (!isPlainObject(value) || !hasOnlyKeys(value, TOP_LEVEL_KEYS)) return false;
  if (value.version !== VERSION || value.courseId !== courseId || !isTimestamp(value.updatedAt)) return false;
  if (!isPlainObject(value.completed)) return false;

  return Object.entries(value.completed).every(([lessonId, completion]) => (
    lessonId.trim().length > 0
    && isPlainObject(completion)
    && hasOnlyKeys(completion, COMPLETION_KEYS)
    && Number.isFinite(completion.score)
    && completion.score >= 0
    && completion.score <= 100
    && isTimestamp(completion.completedAt)
  ));
}

function storageKeys(courseId) {
  const prefix = `universal-learning-system.${courseId}`;
  return { current: `${prefix}.current`, previous: `${prefix}.previous` };
}

function parseStoredProgress(text, courseId) {
  if (text === null) return null;
  try {
    const value = parseStrictJson(text);
    return validateProgress(value, courseId) ? value : null;
  } catch {
    return null;
  }
}

export function createProgressStore(storage, courseId) {
  if (!storage || typeof storage.getItem !== 'function' || typeof storage.setItem !== 'function') {
    throw new TypeError('storage must implement getItem and setItem');
  }
  if (typeof courseId !== 'string' || courseId.trim().length === 0) {
    throw new TypeError('courseId must be a non-empty string');
  }

  const keys = storageKeys(courseId);

  function load() {
    return parseStoredProgress(storage.getItem(keys.current), courseId)
      ?? parseStoredProgress(storage.getItem(keys.previous), courseId)
      ?? emptyProgress(courseId);
  }

  function persist(next, previous) {
    storage.setItem(keys.previous, JSON.stringify(previous));
    storage.setItem(keys.current, JSON.stringify(next));
  }

  function recordCompletion(lessonId, score) {
    if (typeof lessonId !== 'string' || lessonId.trim().length === 0) {
      throw new TypeError('lessonId must be a non-empty string');
    }
    if (!Number.isFinite(score) || score < 0 || score > 100) {
      throw new RangeError('score must be between 0 and 100');
    }

    const previous = load();
    const completedAt = Math.max(Date.now(), previous.updatedAt + 1);
    const next = {
      version: VERSION,
      courseId,
      updatedAt: completedAt,
      completed: {
        ...previous.completed,
        [lessonId]: { score, completedAt },
      },
    };
    persist(next, previous);
    return next;
  }

  function exportJson() {
    return JSON.stringify(load());
  }

  function importJson(text) {
    let candidate;
    try {
      candidate = parseStrictJson(text);
    } catch {
      return { ok: false, reason: 'invalid-json' };
    }
    if (!validateProgress(candidate, courseId)) return { ok: false, reason: 'invalid-progress' };

    const previous = load();
    const next = {
      ...candidate,
      updatedAt: Math.max(candidate.updatedAt, previous.updatedAt + 1),
    };
    persist(next, previous);
    return { ok: true };
  }

  return { load, recordCompletion, exportJson, importJson };
}
