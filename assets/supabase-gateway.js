import { isValidProgress } from './progress-record.js';

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function isPlainObject(value) {
  return Boolean(value)
    && typeof value === 'object'
    && !Array.isArray(value)
    && Object.getPrototypeOf(value) === Object.prototype;
}

function decodeJwtPayload(value) {
  const parts = value.split('.');
  const payload = parts[1];
  if (parts.length !== 3 || parts.some((part) => part.length === 0) || !payload || typeof globalThis.atob !== 'function') return null;
  try {
    const decoded = globalThis.atob(payload.replace(/-/gu, '+').replace(/_/gu, '/'));
    return JSON.parse(decoded);
  } catch {
    return null;
  }
}

function isPublicClientKey(keyName, value) {
  if (keyName === 'publishableKey') return /^sb_publishable_[A-Za-z0-9_-]+$/u.test(value);
  const payload = decodeJwtPayload(value);
  return isPlainObject(payload) && payload.role === 'anon';
}

function isHttpsOrLoopbackHttp(value) {
  try {
    const url = new URL(value);
    if (url.protocol === 'https:') return true;
    return url.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
  } catch {
    return false;
  }
}

function isSuccessfulEnvelope(value) {
  return isPlainObject(value)
    && Object.hasOwn(value, 'data')
    && Object.hasOwn(value, 'error')
    && value.error === null;
}

function isMagicLinkData(value) {
  return isPlainObject(value)
    && Object.hasOwn(value, 'user')
    && Object.hasOwn(value, 'session')
    && value.user === null
    && value.session === null;
}

function hasSafePublicConfig(config) {
  if (!config || typeof config !== 'object' || Array.isArray(config)) return false;
  const keys = Object.keys(config);
  const keyName = Object.hasOwn(config, 'publishableKey') ? 'publishableKey' : 'anonKey';
  const expected = new Set(['url', keyName, 'redirectTo']);
  if (keys.length !== expected.size || keys.some((key) => !expected.has(key))) return false;
  if (Object.hasOwn(config, 'publishableKey') && Object.hasOwn(config, 'anonKey')) return false;
  if (!isNonEmptyString(config.url) || !isNonEmptyString(config[keyName]) || !isNonEmptyString(config.redirectTo)) return false;
  return isPublicClientKey(keyName, config[keyName])
    && isHttpsOrLoopbackHttp(config.url)
    && isHttpsOrLoopbackHttp(config.redirectTo);
}

function providerFailure() {
  return new Error('Cloud progress provider request failed');
}

function requireCourseId(courseId) {
  if (!isNonEmptyString(courseId)) throw new TypeError('courseId must be a non-empty string');
}

export function createSupabaseGateway({ config, clientFactory }) {
  const configured = hasSafePublicConfig(config) && typeof clientFactory === 'function';
  let client;

  function getClient() {
    if (!configured) throw new Error('Cloud progress is not configured');
    if (!client) {
      const key = config.publishableKey ?? config.anonKey;
      try {
        client = clientFactory(config.url, key);
      } catch {
        throw providerFailure();
      }
    }
    if (!client || !client.auth || typeof client.from !== 'function') throw providerFailure();
    return client;
  }

  async function currentUser() {
    const activeClient = getClient();
    let result;
    try {
      result = await activeClient.auth.getUser();
    } catch {
      throw providerFailure();
    }
    if (!isSuccessfulEnvelope(result) || !isPlainObject(result.data) || !Object.hasOwn(result.data, 'user')) throw providerFailure();
    const user = result.data.user;
    if (user === null) return null;
    if (!isPlainObject(user) || !isNonEmptyString(user.id)) throw providerFailure();
    return user;
  }

  async function requireUser() {
    const user = await currentUser();
    if (!user || !isNonEmptyString(user.id)) throw new Error('Sign in is required for cloud progress');
    return user;
  }

  async function requestMagicLink(email) {
    if (!isNonEmptyString(email)) throw new TypeError('email must be a non-empty string');
    const activeClient = getClient();
    let result;
    try {
      result = await activeClient.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: config.redirectTo },
      });
    } catch {
      throw providerFailure();
    }
    if (!isSuccessfulEnvelope(result) || !isMagicLinkData(result.data)) throw providerFailure();
    return result.data;
  }

  async function loadProgress(courseId) {
    requireCourseId(courseId);
    const user = await requireUser();
    let result;
    try {
      result = await getClient()
        .from('course_progress')
        .select('progress, updated_at')
        .eq('course_id', courseId)
        .eq('user_id', user.id)
        .maybeSingle();
    } catch {
      throw providerFailure();
    }
    if (!isSuccessfulEnvelope(result)) throw providerFailure();
    if (result.data === null) return null;
    if (!isPlainObject(result.data) || !Object.hasOwn(result.data, 'progress')) throw providerFailure();
    if (!isValidProgress(result.data.progress, courseId)) throw providerFailure();
    return result.data.progress;
  }

  async function saveProgress(courseId, progress) {
    requireCourseId(courseId);
    const user = await requireUser();
    let result;
    try {
      result = await getClient()
        .from('course_progress')
        .upsert({ course_id: courseId, user_id: user.id, progress }, { onConflict: 'course_id,user_id' })
        .select('progress')
        .single();
    } catch {
      throw providerFailure();
    }
    if (!isSuccessfulEnvelope(result) || !isPlainObject(result.data) || !Object.hasOwn(result.data, 'progress')) throw providerFailure();
    if (!isValidProgress(result.data.progress, courseId)) throw providerFailure();
    return result.data.progress;
  }

  async function signOut() {
    let result;
    try {
      result = await getClient().auth.signOut();
    } catch {
      throw providerFailure();
    }
    if (!isSuccessfulEnvelope(result)) throw providerFailure();
  }

  async function deleteProgress(courseId) {
    requireCourseId(courseId);
    const user = await requireUser();
    let result;
    try {
      result = await getClient()
        .from('course_progress')
        .delete()
        .eq('course_id', courseId)
        .eq('user_id', user.id);
    } catch {
      throw providerFailure();
    }
    if (!isSuccessfulEnvelope(result)) throw providerFailure();
  }

  return {
    isConfigured: configured,
    requestMagicLink,
    getCurrentUser: currentUser,
    loadProgress,
    saveProgress,
    signOut,
    deleteProgress,
  };
}
