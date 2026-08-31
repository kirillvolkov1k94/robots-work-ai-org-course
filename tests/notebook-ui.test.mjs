import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

function declarationBlock(css, selector) {
  const match = css.match(new RegExp(`${selector.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\$&')}\\s*\\{([^}]*)\\}`));
  assert.ok(match, `Missing CSS rule for ${selector}`);
  return match[1];
}

function tokenValue(css, name) {
  const match = css.match(new RegExp(`${name}:\\s*(#[0-9A-F]{6})`, 'i'));
  assert.ok(match, `Missing ${name} color token`);
  return match[1];
}

function relativeLuminance(hex) {
  const channels = [1, 3, 5].map((offset) => Number.parseInt(hex.slice(offset, offset + 2), 16) / 255);
  const linear = channels.map((channel) => (channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4));
  return (0.2126 * linear[0]) + (0.7152 * linear[1]) + (0.0722 * linear[2]);
}

function contrastRatio(foreground, background) {
  const [lighter, darker] = [relativeLuminance(foreground), relativeLuminance(background)].sort((a, b) => b - a);
  return (lighter + 0.05) / (darker + 0.05);
}

async function pngDimensions(path) {
  const png = await readFile(new URL(path, import.meta.url));
  assert.deepEqual([...png.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10], `${path} must be a PNG`);
  assert.equal(png.toString('ascii', 12, 16), 'IHDR', `${path} must include IHDR`);
  return { width: png.readUInt32BE(16), height: png.readUInt32BE(20) };
}

test('has an accessible role route map and named cloud-progress controls', async () => {
  const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
  const app = await readFile(new URL('../assets/app.js', import.meta.url), 'utf8');
  const routeMap = html.match(/<svg class="course-mark__map"[\s\S]*?<\/svg>/)?.[0];
  assert.ok(routeMap, 'The route map must remain in the no-JavaScript shell');
  assert.match(routeMap, /role="img"/);
  assert.match(routeMap, /aria-label="Карта ролей агентов"/);
  const robotNodes = [...routeMap.matchAll(/<rect\b[^>]*\bx="([^"]+)"[^>]*>/g)];
  assert.equal(robotNodes.length, 4, 'The route map must show one coordinator and three specialists');
  assert.equal(new Set(robotNodes.map((node) => node[1])).size, 4, 'The four route-map robots must be distinct nodes');
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

test('keeps small eyebrow text at a readable contrast against notebook paper', async () => {
  const css = await readFile(new URL('../assets/styles.css', import.meta.url), 'utf8');
  const eyebrow = declarationBlock(css, '.eyebrow');
  assert.match(eyebrow, /color:\s*var\(--ink\)/);
  const ratio = contrastRatio(tokenValue(css, '--ink'), tokenValue(css, '--paper'));
  assert.ok(ratio >= 4.5, `Expected eyebrow contrast of at least 4.5:1, got ${ratio.toFixed(2)}:1`);
});

test('makes dashboard lesson and header links their own 44px touch targets', async () => {
  const css = await readFile(new URL('../assets/styles.css', import.meta.url), 'utf8');
  const lessonAnchor = declarationBlock(css, '.lesson-item > a');
  const headerAnchor = declarationBlock(css, '.site-header a');
  for (const [name, rule] of [['lesson', lessonAnchor], ['header', headerAnchor]]) {
    assert.match(rule, /display:\s*(?:flex|inline-flex|block)/, `${name} link needs an interactive display box`);
    assert.match(rule, /min-height:\s*44px/, `${name} link needs its own 44px target`);
  }
  assert.match(lessonAnchor, /width:\s*100%/, 'The lesson anchor must fill the clickable lesson cell');
  assert.doesNotMatch(declarationBlock(css, '.lesson-item'), /padding:/, 'The list item cannot hide padding outside the lesson link target');
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

test('ships decoded 180px and 512px icon outputs, not only the source image', async () => {
  assert.deepEqual(await pngDimensions('../assets/icons/course-icon-180.png'), { width: 180, height: 180 });
  assert.deepEqual(await pngDimensions('../assets/icons/course-icon-512.png'), { width: 512, height: 512 });
});
