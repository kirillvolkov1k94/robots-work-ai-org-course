import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('the shell gives screen-reader users a named main learning area', async () => {
  const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
  assert.match(html, /<main[^>]+id="app"[^>]+aria-label="Учебный курс"/);
  assert.match(html, /meta name="viewport"/);
  assert.match(html, /type="module" src="assets\/app\.js"/);
});

test('stylesheet reserves safe-area space and touch-sized controls', async () => {
  const css = await readFile(new URL('../assets/styles.css', import.meta.url), 'utf8');
  assert.match(css, /env\(safe-area-inset-bottom\)/);
  assert.match(css, /env\(safe-area-inset-left\)/);
  assert.match(css, /env\(safe-area-inset-right\)/);
  assert.match(css, /min-height:\s*44px/);
  assert.match(css, /:focus-visible/);
  assert.match(css, /\.file-button:focus-within/);
  assert.match(css, /@media \(prefers-color-scheme: dark\)/);
  assert.match(css, /\.button:active/);
});
