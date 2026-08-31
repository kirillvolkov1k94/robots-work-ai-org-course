function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function isServiceRoleKey(value) {
  if (/service[-_ ]?role/ui.test(value)) return true;
  const payload = value.split('.')[1];
  if (!payload || typeof globalThis.atob !== 'function') return false;
  try {
    const decoded = globalThis.atob(payload.replace(/-/gu, '+').replace(/_/gu, '/'));
    return JSON.parse(decoded).role === 'service_role';
  } catch {
    return false;
  }
}

function hasSafePublicConfig(config) {
  if (!config || typeof config !== 'object' || Array.isArray(config)) return false;
  const keys = Object.keys(config);
  const keyName = Object.hasOwn(config, 'publishableKey') ? 'publishableKey' : 'anonKey';
  const expected = new Set(['url', keyName, 'redirectTo']);
  if (keys.length !== expected.size || keys.some((key) => !expected.has(key))) return false;
  if (Object.hasOwn(config, 'publishableKey') && Object.hasOwn(config, 'anonKey')) return false;
  if (!isNonEmptyString(config.url) || !isNonEmptyString(config[keyName]) || !isNonEmptyString(config.redirectTo)) return false;
  if (isServiceRoleKey(config[keyName])) return false;
  try {
    const url = new URL(config.url);
    const redirectTo = new URL(config.redirectTo);
    return ['https:', 'http:'].includes(url.protocol) && ['https:', 'http:'].includes(redirectTo.protocol);
  } catch {
    return false;
  }
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
    if (result?.error) throw providerFailure();
    return result?.data?.user ?? null;
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
    if (result?.error) throw providerFailure();
    return result?.data ?? null;
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
    if (result?.error) throw providerFailure();
    return result?.data?.progress ?? null;
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
    if (result?.error) throw providerFailure();
    return result?.data?.progress ?? progress;
  }

  async function signOut() {
    let result;
    try {
      result = await getClient().auth.signOut();
    } catch {
      throw providerFailure();
    }
    if (result?.error) throw providerFailure();
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
    if (result?.error) throw providerFailure();
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
