import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';

const root = fileURLToPath(new URL('../', import.meta.url));
const projects = path.join(root, 'projects');
for (const entry of await readdir(projects, { withFileTypes: true })) {
  const page = path.join(projects, entry.name, 'index.html');
  if (!entry.isDirectory() || !existsSync(page)) continue;
  const html = await readFile(page, 'utf8');
  const markup = html.replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, '').replace(/<!--[\s\S]*?-->/g, '');
  const text = markup.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ');

  test(`${entry.name}: readable page copy and unique element IDs`, () => {
    assert.match(markup, /<h1\b[^>]*>[^<]+<\/h1>/i);
    assert.doesNotMatch(text, /Public deliverable|Privacy boundary|decision-grade|operator surface|proof-first|portfolio pitch/i);
    const ids = [...markup.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]);
    assert.equal(new Set(ids).size, ids.length, 'Element IDs must remain unique');
  });

  test(`${entry.name}: local styles, scripts, and links still resolve`, () => {
    for (const [, attribute] of html.matchAll(/\b(?:href|src)="([^"]+)"/g)) {
      if (/^(?:[a-z][\w+.-]*:|\/\/|#)/i.test(attribute)) continue;
      const localPath = attribute.split(/[?#]/)[0];
      if (!localPath || localPath.includes('${')) continue;
      const target = localPath.startsWith('/')
        ? path.resolve(root, `.${localPath}`)
        : path.resolve(path.dirname(page), decodeURIComponent(localPath));
      assert.ok(existsSync(target), `Missing local link: ${entry.name}/${attribute}`);
    }
  });
}
