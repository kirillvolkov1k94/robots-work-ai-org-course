const VERSION = 1;
const TOP_LEVEL_KEYS = new Set(['version', 'courseId', 'updatedAt', 'completed']);
const COMPLETION_KEYS = new Set(['score', 'completedAt']);

function isPlainObject(value) {
  return Boolean(value)
    && typeof value === 'object'
    && !Array.isArray(value)
    && Object.getPrototypeOf(value) === Object.prototype;
}

function hasOnlyKeys(value, allowed) {
  return Object.keys(value).every((key) => allowed.has(key));
}

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function isTimestamp(value) {
  return Number.isSafeInteger(value) && value >= 0;
}

function copyCompletion(completion) {
  return { score: completion.score, completedAt: completion.completedAt };
}

function copyRecord(record) {
  return {
    version: VERSION,
    courseId: record.courseId,
    updatedAt: record.updatedAt,
    completed: Object.fromEntries(
      Object.entries(record.completed).map(([lessonId, completion]) => [lessonId, copyCompletion(completion)]),
    ),
  };
}

export function createEmptyProgress(courseId) {
  if (!isNonEmptyString(courseId)) throw new TypeError('courseId must be a non-empty string');
  return { version: VERSION, courseId, updatedAt: 0, completed: {} };
}

export function isValidProgress(value, courseId) {
  if (!isNonEmptyString(courseId)) return false;
  if (!isPlainObject(value) || !hasOnlyKeys(value, TOP_LEVEL_KEYS)) return false;
  if (value.version !== VERSION || value.courseId !== courseId || !isTimestamp(value.updatedAt)) return false;
  if (!isPlainObject(value.completed)) return false;

  return Object.entries(value.completed).every(([lessonId, completion]) => (
    isNonEmptyString(lessonId)
    && isPlainObject(completion)
    && hasOnlyKeys(completion, COMPLETION_KEYS)
    && Number.isFinite(completion.score)
    && completion.score >= 0
    && completion.score <= 100
    && isTimestamp(completion.completedAt)
  ));
}

export function mergeProgress(courseId, local, remote) {
  const localRecord = isValidProgress(local, courseId) ? local : createEmptyProgress(courseId);
  const remoteRecord = isValidProgress(remote, courseId) ? remote : null;
  if (!remoteRecord) return copyRecord(localRecord);

  const completed = { ...localRecord.completed };
  for (const [lessonId, remoteCompletion] of Object.entries(remoteRecord.completed)) {
    const localCompletion = localRecord.completed[lessonId];
    if (!localCompletion || remoteCompletion.completedAt > localCompletion.completedAt) {
      completed[lessonId] = copyCompletion(remoteCompletion);
    }
  }

  const completionTimes = Object.values(completed).map((completion) => completion.completedAt);
  return {
    version: VERSION,
    courseId,
    updatedAt: Math.max(localRecord.updatedAt, remoteRecord.updatedAt, 0, ...completionTimes),
    completed: Object.fromEntries(
      Object.entries(completed).map(([lessonId, completion]) => [lessonId, copyCompletion(completion)]),
    ),
  };
}
