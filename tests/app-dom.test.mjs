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

test('announces successful progress import after the dashboard rerenders', async () => {
  const { document, root } = fakeDocument();
  const progressStore = {
    load: () => ({ completed: {} }),
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
