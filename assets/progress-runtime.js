import { cloudConfig as defaultCloudConfig } from './cloud-config.js';
import { createProgressController } from './progress-controller.js';
import { createProgressStore } from './progress-store.js';
import { createSupabaseGateway } from './supabase-gateway.js';

function browserClientFactory() {
  const clientFactory = globalThis.supabase?.createClient;
  return typeof clientFactory === 'function' ? clientFactory : undefined;
}

function safeAccount(user) {
  if (!user || typeof user !== 'object' || typeof user.id !== 'string' || user.id.trim().length === 0) return null;
  const account = { id: user.id };
  if (typeof user.email === 'string' && user.email.trim().length > 0) account.email = user.email;
  return account;
}

export function createProgressRuntime({
  window,
  courseId,
  progressStore,
  cloudConfig = defaultCloudConfig,
  clientFactory = browserClientFactory(),
  gatewayFactory = createSupabaseGateway,
  controllerFactory = createProgressController,
  onStateChange = () => {},
} = {}) {
  const store = progressStore ?? createProgressStore(window?.localStorage, courseId);
  const gateway = gatewayFactory({ config: cloudConfig, clientFactory });
  const configured = gateway?.isConfigured === true;
  let account = null;
  let controller;
  let reportedState;
  const listeners = new Set();

  function notify() {
    const snapshot = getSnapshot();
    onStateChange(snapshot);
    for (const listener of listeners) listener(snapshot);
  }

  function useController(nextGateway) {
    controller = controllerFactory({
      localStore: store,
      gateway: nextGateway,
      courseId,
      onStateChange: (state) => {
        reportedState = state;
        notify();
      },
    });
    reportedState = controller.getState();
  }

  function getSnapshot() {
    return {
      configured,
      account: account ? { ...account } : null,
      state: { ...(reportedState ?? controller.getState()) },
    };
  }

  async function refreshSession() {
    if (!configured) {
      account = null;
      useController(null);
      notify();
      return getSnapshot();
    }

    try {
      account = safeAccount(await gateway.getCurrentUser());
    } catch {
      account = null;
    }
    useController(account ? gateway : null);
    if (account) await controller.restore();
    notify();
    return getSnapshot();
  }

  async function requestMagicLink(email) {
    if (!configured) throw new Error('Cloud progress is not configured');
    try {
      const result = await gateway.requestMagicLink(email);
      reportedState = { ...controller.getState(), status: 'link-sent', error: null };
      notify();
      return result;
    } catch (error) {
      reportedState = { ...controller.getState(), status: 'retry', error: 'Cloud progress could not be saved' };
      notify();
      throw error;
    }
  }

  async function signOut() {
    if (!configured || !account) return getSnapshot();
    await gateway.signOut();
    account = null;
    useController(null);
    notify();
    return getSnapshot();
  }

  useController(null);
  const ready = refreshSession();

  return {
    store,
    ready,
    getSnapshot,
    refreshSession,
    requestMagicLink,
    recordCompletion: (lessonId, score) => controller.recordCompletion(lessonId, score),
    importProgress: (text) => controller.importProgress(text),
    retry: () => controller.retry(),
    signOut,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}
