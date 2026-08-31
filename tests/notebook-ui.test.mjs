import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('has an accessible role route map and named cloud-progress controls', async () => {
  const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
  const app = await readFile(new URL('../assets/app.js', import.meta.url), 'utf8');
  assert.match(html, /aria-label="Карта ролей агентов"/);
  assert.match(html, /rel="icon" href="assets\/icons\/course-icon\.svg"/);
  assert.match(app, /id:\s*'progress-email'/);
});

test('keeps notebook tokens, safe areas, touch targets, focus, and reduced motion', async () => {
  const css = await readFile(new URL('../assets/styles.css', import.meta.url), 'utf8');
  for (const token of ['#F7F8F4', '#12313D', '#33454B', '#C9D7D2', '#D85B2A', '#167A72']) {
    assert.match(css, new RegExp(token, 'i'));
  }
  assert.match(css, /env\(safe-area-inset-top\)/);
  assert.match(css, /min-height:\s*44px/);
  assert.match(css, /:focus-visible/);
  assert.match(css, /prefers-reduced-motion/);
  assert.match(css, /overflow-x:\s*hidden/);
});

test('names the standalone course application and its real icon assets', async () => {
  const manifest = JSON.parse(await readFile(new URL('../manifest.webmanifest', import.meta.url), 'utf8'));
  assert.equal(manifest.name, 'Роботы работают');
  assert.equal(manifest.short_name, 'Роботы');
  assert.equal(manifest.display, 'standalone');
  assert.equal(manifest.background_color, '#F7F8F4');
  assert.equal(manifest.theme_color, '#12313D');
  assert.ok(manifest.icons.some((icon) => icon.src === 'assets/icons/course-icon-180.png' && icon.sizes === '180x180'));
  assert.ok(manifest.icons.some((icon) => icon.src === 'assets/icons/course-icon-512.png' && icon.sizes === '512x512'));
});
