import assert from 'node:assert/strict';
import test from 'node:test';

import { bootCourseApp, importSuccessMessage } from '../assets/app.js';
import { sampleCourse } from '../content/course-data.js';

class FakeElement {
  constructor(tagName) {
    this.tagName = tagName;
    this.attributes = new Map();
    this.children = [];
    this.listeners = new Map();
    this.className = '';
    this.textContent = '';
    this.files = [];
  }

  setAttribute(name, value) {
    this.attributes.set(name, String(value));
  }

  append(...children) {
    this.children.push(...children.flatMap((child) => child.tagName === '#fragment' ? child.children : [child]));
  }

  replaceChildren(...children) {
    this.children = [];
    this.append(...children);
  }

  addEventListener(type, listener) {
    this.listeners.set(type, listener);
  }

  querySelector(selector) {
    const matches = (element) => selector.startsWith('.')
      ? element.className.split(/\s+/).includes(selector.slice(1))
      : selector.startsWith('#')
        ? element.attributes.get('id') === selector.slice(1)
        : element.tagName === selector;
    const visit = (element) => {
      if (matches(element)) return element;
      for (const child of element.children) {
        const found = visit(child);
        if (found) return found;
      }
      return null;
    };
    return visit(this);
  }
}

function fakeDocument() {
  const root = new FakeElement('main');
  root.setAttribute('id', 'app');
  const document = {
    documentElement: { lang: 'ru' },
    createElement: (tagName) => new FakeElement(tagName),
    createDocumentFragment: () => new FakeElement('#fragment'),
    querySelector: (selector) => selector === '#app' ? root : root.querySelector(selector),
  };
  return { document, root };
}

function findInput(element) {
  if (element.tagName === 'input') return element;
  for (const child of element.children) {
    const input = findInput(child);
    if (input) return input;
  }
  return null;
}

function findAll(element, predicate, found = []) {
  if (predicate(element)) found.push(element);
  for (const child of element.children) findAll(child, predicate, found);
  return found;
}

function textOf(element) {
  return `${element.textContent} ${element.children.map(textOf).join(' ')}`.trim();
}

function emptyProgressStore() {
  return { load: () => ({ completed: {} }), importJson: () => ({ ok: true }) };
}

test('announces successful progress import after the dashboard rerenders', async () => {
  const { document, root } = fakeDocument();
  const progressStore = {
    load: () => ({ completed: {} }),
    recordCompletion: () => ({ completed: {} }),
    importJson: () => ({ ok: true }),
  };
  const window = { localStorage: {}, document, URL: {} };
  bootCourseApp({ document, window, course: sampleCourse, progressStore });

  const input = findInput(root);
  input.files = [{ text: async () => '{"valid":true}' }];
  await input.listeners.get('change')({});

  const status = root.querySelector('.status-message');
  assert.equal(document.documentElement.lang, 'ru');
  assert.equal(status.attributes.get('aria-live'), 'polite');
  assert.equal(status.textContent, importSuccessMessage());
});

test('shows a labelled magic-link action to a signed-out reader and reports its result safely', async () => {
  const { document, root } = fakeDocument();
  let requestedEmail = '';
  const runtime = {
    ready: Promise.resolve(),
    getSnapshot: () => ({ configured: true, account: null, state: { status: 'local' } }),
    async requestMagicLink(email) { requestedEmail = email; },
  };
  const window = { localStorage: {}, document, URL: {} };
  const app = bootCourseApp({ document, window, course: sampleCourse, progressStore: emptyProgressStore(), progressRuntime: runtime });
  await app.ready;

  const input = findAll(root, (element) => element.tagName === 'input' && element.attributes.get('id') === 'progress-email')[0];
  const label = findAll(root, (element) => element.tagName === 'label' && element.attributes.get('for') === 'progress-email')[0];
  const form = findAll(root, (element) => element.tagName === 'form')[0];
  assert.equal(label.textContent, 'Email для сохранения прогресса');
  assert.equal(input.attributes.get('type'), 'email');
  assert.equal(input.attributes.get('autocomplete'), 'email');
  assert.equal(input.attributes.get('required'), '');
  assert.match(textOf(root), /Отправить ссылку для входа/);

  input.value = 'owner@example.test';
  await form.listeners.get('submit')({ preventDefault() {} });
  assert.equal(requestedEmail, 'owner@example.test');
  assert.match(root.querySelector('.status-message').textContent, /Проверьте почту/i);
});

test('keeps a failed magic-link request retryable without exposing provider details', async () => {
  const { document, root } = fakeDocument();
  const runtime = {
    ready: Promise.resolve(),
    getSnapshot: () => ({ configured: true, account: null, state: { status: 'local' } }),
    async requestMagicLink() { throw new Error('token=do-not-expose'); },
  };
  const app = bootCourseApp({ document, window: { localStorage: {}, document, URL: {} }, course: sampleCourse, progressStore: emptyProgressStore(), progressRuntime: runtime });
  await app.ready;

  const form = findAll(root, (element) => element.tagName === 'form')[0];
  await form.listeners.get('submit')({ preventDefault() {} });
  const message = root.querySelector('.status-message').textContent;
  assert.match(message, /попробуйте ещё раз/i);
  assert.doesNotMatch(message, /token=/i);
});

test('shows signed-in save actions, retry and local-only sign-out', async () => {
  const { document, root } = fakeDocument();
  let signedOut = 0;
  const runtime = {
    ready: Promise.resolve(),
    getSnapshot: () => ({ configured: true, account: { id: 'user-1', email: 'owner@example.test' }, state: { status: 'retry' } }),
    async retry() { throw new Error('offline'); },
    async signOut() { signedOut += 1; },
  };
  const app = bootCourseApp({ document, window: { localStorage: {}, document, URL: {} }, course: sampleCourse, progressStore: emptyProgressStore(), progressRuntime: runtime });
  await app.ready;

  assert.match(textOf(root), /owner@example\.test/);
  assert.match(textOf(root), /Сохранить сейчас/);
  assert.match(textOf(root), /Повторить сохранение/);
  const signOut = findAll(root, (element) => element.tagName === 'button' && element.textContent === 'Выйти на этом устройстве')[0];
  await signOut.listeners.get('click')({});
  assert.equal(signedOut, 1);
});

test('keeps the dashboard local-only when cloud setup is absent', async () => {
  const { document, root } = fakeDocument();
  const runtime = {
    ready: Promise.resolve(),
    getSnapshot: () => ({ configured: false, account: null, state: { status: 'local' } }),
  };
  const window = { localStorage: {}, document, URL: {} };
  const app = bootCourseApp({ document, window, course: sampleCourse, progressStore: emptyProgressStore(), progressRuntime: runtime });
  await app.ready;

  assert.equal(findAll(root, (element) => element.attributes.get('id') === 'progress-email').length, 0);
  assert.match(textOf(root), /Облачное сохранение не настроено/i);
  assert.match(textOf(root), /Экспортировать прогресс/);
});
