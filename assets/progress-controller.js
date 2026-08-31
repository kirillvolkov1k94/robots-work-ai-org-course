import { createEmptyProgress, isValidProgress, mergeProgress } from './progress-record.js';

function copyProgress(progress) {
  return {
    ...progress,
    completed: Object.fromEntries(
      Object.entries(progress.completed).map(([lessonId, completion]) => [lessonId, { ...completion }]),
    ),
  };
}

function sameProgress(left, right) {
  if (!left || !right || left.version !== right.version || left.courseId !== right.courseId || left.updatedAt !== right.updatedAt) return false;
  if (!left.completed || !right.completed) return false;
  const leftLessonIds = Object.keys(left.completed);
  const rightLessonIds = Object.keys(right.completed);
  if (leftLessonIds.length !== rightLessonIds.length) return false;
  return leftLessonIds.every((lessonId) => {
    if (!Object.hasOwn(right.completed, lessonId)) return false;
    const leftCompletion = left.completed[lessonId];
    const rightCompletion = right.completed[lessonId];
    return leftCompletion?.score === rightCompletion?.score
      && leftCompletion?.completedAt === rightCompletion?.completedAt;
  });
}

function isMagicLinkConfirmation(value) {
  return Boolean(value)
    && typeof value === 'object'
    && !Array.isArray(value)
    && Object.getPrototypeOf(value) === Object.prototype
    && Object.hasOwn(value, 'user')
    && Object.hasOwn(value, 'session')
    && value.user === null
    && value.session === null;
}

export function createProgressController({ localStore, gateway, courseId, onStateChange = () => {} }) {
  if (!localStore || typeof localStore.load !== 'function' || typeof localStore.recordCompletion !== 'function') {
    throw new TypeError('localStore must implement load and recordCompletion');
  }
  if (typeof courseId !== 'string' || courseId.trim().length === 0) {
    throw new TypeError('courseId must be a non-empty string');
  }
  if (typeof onStateChange !== 'function') throw new TypeError('onStateChange must be a function');

  const initialLocal = localStore.load();
  let state = {
    progress: isValidProgress(initialLocal, courseId) ? initialLocal : createEmptyProgress(courseId),
    status: 'local',
    error: null,
  };
  let saveQueue = Promise.resolve();
  let latestSaveRequest = 0;

  function emit(status, error = null) {
    state = { progress: copyProgress(state.progress), status, error };
    onStateChange({ progress: copyProgress(state.progress), status: state.status, error: state.error });
  }

  function load() {
    return copyProgress(state.progress);
  }

  function getState() {
    return { progress: load(), status: state.status, error: state.error };
  }

  function queueCurrentSave({ throwOnError }) {
    if (!gateway || typeof gateway.saveProgress !== 'function') {
      if (throwOnError) {
        emit('retry', 'Cloud progress is unavailable');
        throw new Error('Cloud progress is unavailable');
      }
      return Promise.resolve(null);
    }
    const request = ++latestSaveRequest;
    const operation = async () => {
      emit('saving');
      try {
        const snapshot = load();
        const saved = await gateway.saveProgress(courseId, snapshot);
        if (!isValidProgress(saved, courseId)) throw new Error('Cloud progress returned malformed response');
        if (!sameProgress(saved, snapshot)) throw new Error('Cloud progress confirmation did not match queued snapshot');
        if (request === latestSaveRequest) emit('saved');
        return saved;
      } catch (error) {
        emit('retry', 'Cloud progress could not be saved');
        throw error;
      }
    };
    const task = saveQueue.then(operation, operation);
    saveQueue = task.catch(() => undefined);
    return throwOnError ? task : task.catch(() => null);
  }

  async function restore() {
    const local = localStore.load();
    state = {
      progress: isValidProgress(local, courseId) ? local : createEmptyProgress(courseId),
      status: 'local',
      error: null,
    };
    emit('local');

    if (!gateway || typeof gateway.loadProgress !== 'function') return load();
    try {
      const remote = await gateway.loadProgress(courseId);
      if (remote !== null && !isValidProgress(remote, courseId)) return load();

      const merged = mergeProgress(courseId, state.progress, remote);
      if (!sameProgress(merged, state.progress)) {
        if (typeof localStore.importJson !== 'function') return load();
        const result = localStore.importJson(JSON.stringify(merged));
        if (!result?.ok) return load();
        state = { ...state, progress: localStore.load() };
        emit('local');
      }
      const shouldUpload = remote === null
        ? Object.keys(state.progress.completed).length > 0
        : !sameProgress(state.progress, remote);
      if (shouldUpload) await queueCurrentSave({ throwOnError: false });
    } catch {
      // Local progress is intentionally still usable when cloud restoration fails.
    }
    return load();
  }

  async function recordCompletion(lessonId, score) {
    const next = localStore.recordCompletion(lessonId, score);
    state = {
      progress: isValidProgress(next, courseId) ? next : state.progress,
      status: 'local',
      error: null,
    };
    emit('local');
    await queueCurrentSave({ throwOnError: false });
    return load();
  }

  async function importProgress(text) {
    if (typeof localStore.importJson !== 'function') throw new TypeError('localStore must implement importJson');
    const result = localStore.importJson(text);
    if (!result?.ok) return result;
    const imported = localStore.load();
    state = {
      progress: isValidProgress(imported, courseId) ? imported : state.progress,
      status: 'local',
      error: null,
    };
    emit('local');
    await queueCurrentSave({ throwOnError: false });
    return result;
  }

  async function retry() {
    return queueCurrentSave({ throwOnError: true });
  }

  async function requestMagicLink(email) {
    if (!gateway || typeof gateway.requestMagicLink !== 'function') {
      emit('retry', 'Cloud progress is unavailable');
      throw new Error('Cloud progress is unavailable');
    }
    try {
      const result = await gateway.requestMagicLink(email);
      if (!isMagicLinkConfirmation(result)) throw new Error('Magic link returned malformed response');
      emit('link-sent');
      return result;
    } catch (error) {
      emit('retry', 'Magic link could not be sent');
      throw error;
    }
  }

  return { load, getState, restore, recordCompletion, importProgress, retry, requestMagicLink };
}
