import { readFile, readdir, stat } from 'node:fs/promises';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

function localRoot(root) {
  return root instanceof URL ? fileURLToPath(root) : resolve(root);
}

async function htmlFiles(root, current = root) {
  const files = [];
  for (const entry of await readdir(current, { withFileTypes: true })) {
    const absolute = join(current, entry.name);
    if (entry.isDirectory()) files.push(...await htmlFiles(root, absolute));
    else if (entry.isFile() && entry.name.endsWith('.html')) files.push(absolute);
  }
  return files;
}

function isExternalOrFragment(href) {
  return href.startsWith('#') || /^[a-z][a-z0-9+.-]*:/i.test(href) || href.startsWith('//');
}

async function existsAsFileOrDirectoryIndex(path) {
  try {
    const information = await stat(path);
    if (information.isFile()) return path;
    if (information.isDirectory()) {
      const indexPath = join(path, 'index.html');
      return (await stat(indexPath)).isFile() ? indexPath : null;
    }
  } catch {
    return null;
  }
  return null;
}

function hrefs(html) {
  return [...html.matchAll(/\bhref\s*=\s*(["'])(.*?)\1/gi)].map((match) => match[2]);
}

export async function checkInternalLinks(root) {
  const rootPath = localRoot(root);
  const broken = [];
  for (const file of await htmlFiles(rootPath)) {
    for (const href of hrefs(await readFile(file, 'utf8'))) {
      if (isExternalOrFragment(href)) continue;
      const pathname = href.split(/[?#]/, 1)[0];
      if (!pathname) continue;
      const target = join(dirname(file), pathname);
      if (!await existsAsFileOrDirectoryIndex(target)) {
        broken.push({
          from: relative(rootPath, file),
          href,
          target: relative(rootPath, target),
        });
      }
    }
  }
  return broken;
}

const currentFile = fileURLToPath(import.meta.url);
if (process.argv[1] && resolve(process.argv[1]) === currentFile) {
  const root = resolve(process.argv[2] ?? dirname(dirname(currentFile)));
  const broken = await checkInternalLinks(root);
  if (broken.length === 0) {
    console.log('Internal link check passed.');
  } else {
    console.error(JSON.stringify(broken, null, 2));
    process.exitCode = 1;
  }
}
