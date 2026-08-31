import assert from 'node:assert/strict';
import test from 'node:test';

import { createSupabaseGateway } from '../assets/supabase-gateway.js';

const config = {
  url: 'https://example.supabase.co',
  publishableKey: 'public-key',
  redirectTo: 'https://course.example.test/',
};

function createClient({ user = { id: 'user-1' }, progress = null, error = null } = {}) {
  const filters = [];
  const calls = [];
  const table = {
    select() { calls.push('select'); return this; },
    upsert(payload, options) { calls.push({ upsert: payload, options }); return this; },
    delete() { calls.push('delete'); return this; },
    eq(key, value) { filters.push([key, value]); return this; },
    maybeSingle: async () => ({ data: progress, error }),
    single: async () => ({ data: progress, error }),
  };
  const client = {
    auth: {
      async getUser() { return { data: { user }, error }; },
      async signInWithOtp(options) { calls.push({ otp: options }); return { data: {}, error }; },
      async signOut() { calls.push('signOut'); return { error }; },
    },
    from(name) { calls.push({ from: name }); return table; },
  };
  return { client, calls, filters };
}

test('fails closed when public cloud configuration is disabled or contains a service role key', async () => {
  const disabled = createSupabaseGateway({ config: { url: '', publishableKey: '', redirectTo: '' }, clientFactory: () => { throw new Error('must not create'); } });
  const unsafe = createSupabaseGateway({ config: { ...config, serviceRoleKey: 'secret' }, clientFactory: () => { throw new Error('must not create'); } });
  const mislabeledServiceRole = createSupabaseGateway({ config: {
    url: config.url,
    anonKey: 'service-role-key',
    redirectTo: config.redirectTo,
  }, clientFactory: () => { throw new Error('must not create'); } });

  assert.equal(disabled.isConfigured, false);
  assert.equal(unsafe.isConfigured, false);
  assert.equal(mislabeledServiceRole.isConfigured, false);
  await assert.rejects(disabled.getCurrentUser(), /not configured/);
  await assert.rejects(unsafe.requestMagicLink('owner@example.test'), /not configured/);
  await assert.rejects(mislabeledServiceRole.getCurrentUser(), /not configured/);
});

test('sends magic links using only the configured redirect URL', async () => {
  const { client, calls } = createClient();
  const gateway = createSupabaseGateway({ config, clientFactory: () => client });

  await gateway.requestMagicLink('owner@example.test');

  assert.deepEqual(calls.find((call) => call.otp), {
    otp: { email: 'owner@example.test', options: { emailRedirectTo: config.redirectTo } },
  });
});

test('scopes progress reads and upserts to the authenticated user and course', async () => {
  const { client, calls, filters } = createClient({ progress: { progress: { version: 1 } } });
  const gateway = createSupabaseGateway({ config, clientFactory: () => client });

  assert.deepEqual(await gateway.loadProgress('robots-work'), { version: 1 });
  await gateway.saveProgress('robots-work', { version: 1, courseId: 'robots-work', updatedAt: 0, completed: {} });

  assert.deepEqual(filters, [
    ['course_id', 'robots-work'], ['user_id', 'user-1'],
  ]);
  assert.deepEqual(calls.find((call) => call.upsert), {
    upsert: {
      course_id: 'robots-work',
      user_id: 'user-1',
      progress: { version: 1, courseId: 'robots-work', updatedAt: 0, completed: {} },
    },
    options: { onConflict: 'course_id,user_id' },
  });
});

test('fails safely for unauthenticated users and provider errors without exposing details', async () => {
  const anonymous = createSupabaseGateway({ config, clientFactory: () => createClient({ user: null }).client });
  const failing = createSupabaseGateway({ config, clientFactory: () => createClient({ error: { message: 'token=do-not-expose' } }).client });

  await assert.rejects(anonymous.saveProgress('robots-work', {}), /Sign in/);
  await assert.rejects(failing.getCurrentUser(), (error) => !error.message.includes('token=do-not-expose'));
});

test('schema protects every course_progress operation with user-owned RLS policies', async () => {
  const schema = await (await import('node:fs/promises')).readFile(new URL('../supabase/schema.sql', import.meta.url), 'utf8');

  assert.match(schema, /PRIMARY KEY\s*\(course_id,\s*user_id\)/i);
  assert.match(schema, /REFERENCES\s+auth\.users\s*\(id\)\s+ON DELETE CASCADE/i);
  assert.match(schema, /ENABLE ROW LEVEL SECURITY/i);
  for (const command of ['SELECT', 'INSERT', 'UPDATE', 'DELETE']) {
    assert.match(schema, new RegExp(`FOR\\s+${command}\\b[\\s\\S]{0,260}auth\\.uid\\(\\)\\s*=\\s*user_id`, 'i'));
  }
  assert.match(schema, /FOR\s+INSERT[\s\S]{0,260}WITH CHECK\s*\(\s*auth\.uid\(\)\s*=\s*user_id\s*\)/i);
  assert.match(schema, /FOR\s+UPDATE[\s\S]{0,260}WITH CHECK\s*\(\s*auth\.uid\(\)\s*=\s*user_id\s*\)/i);
});
