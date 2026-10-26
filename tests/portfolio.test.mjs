import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { visitorConfig } from '../visitor-config.mjs';

const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');

test('the four retired projects stay off the homepage', () => {
  for (const name of ['Rollback Call', 'Incident Handoff Builder', 'Lease Decision Guide', 'CSV Quality Checker']) {
    assert.equal(html.includes(name), false, `${name} must not be relisted`);
  }
});

test('browser project summary matches the actual remaining listings', () => {
  const section = html.split('<details id="browser-projects"')[1].split('</details>')[0];
  const count = [...section.matchAll(/class="project-card"/g)].length;
  assert.equal(count, 7);
  assert.ok(section.includes(`Open browser projects (${count})`));
});

test('Warframe is clearly identified as a game marketplace', () => {
  const description = html.split('<h3>Warframe Arbitrage Market Scanner</h3>')[1].split('</article>')[0];
  assert.match(description, /third-party player marketplace for the video game Warframe/);
});

test('visitor feature is accessible, public-key-only, and the personal content remains', () => {
  assert.match(html, /<button[^>]*id="visitor-mark-button"[^>]*aria-pressed="false"/);
  assert.match(html, /id="visitor-mark-status"[^>]*role="status"/);
  assert.match(html, /type="module" src="visitor-mark.mjs"/);
  assert.match(visitorConfig.publishableKey, /^sb_publishable_/);
  assert.ok(visitorConfig.endpoint.startsWith('https://'));
  assert.match(html, /src="preview-image.png"/);
  assert.match(html, /href="assets\/Abhimanyu_Khurana_Resume.pdf"/);
  assert.match(html, /rel="canonical" href="https:\/\/abhikhur.com\//);
});
