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
  return JSON.stringify(left) === JSON.stringify(right);
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

  async function saveCurrent({ throwOnError }) {
    if (!gateway || typeof gateway.saveProgress !== 'function') {
      emit('retry', 'Cloud progress is unavailable');
      if (throwOnError) throw new Error('Cloud progress is unavailable');
      return null;
    }
    emit('saving');
    try {
      await gateway.saveProgress(courseId, load());
      emit('saved');
      return load();
    } catch (error) {
      emit('retry', 'Cloud progress could not be saved');
      if (throwOnError) throw error;
      return null;
    }
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
      const merged = mergeProgress(courseId, state.progress, remote);
      if (!sameProgress(merged, state.progress) && typeof localStore.importJson === 'function') {
        const result = localStore.importJson(JSON.stringify(merged));
        if (result?.ok) {
          state = { ...state, progress: localStore.load() };
          emit('local');
        }
      }
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
    await saveCurrent({ throwOnError: false });
    return load();
  }

  async function retry() {
    return saveCurrent({ throwOnError: true });
  }

  async function requestMagicLink(email) {
    if (!gateway || typeof gateway.requestMagicLink !== 'function') {
      emit('retry', 'Cloud progress is unavailable');
      throw new Error('Cloud progress is unavailable');
    }
    try {
      const result = await gateway.requestMagicLink(email);
      emit('link-sent');
      return result;
    } catch (error) {
      emit('retry', 'Magic link could not be sent');
      throw error;
    }
  }

  return { load, getState, restore, recordCompletion, retry, requestMagicLink };
}
