import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { test } from 'node:test';

const root = new URL('../', import.meta.url);

test('RescueMEsh is linked as a real hardware prototype, not a deployed emergency service', async () => {
  const home = await readFile(new URL('index.html', root), 'utf8');
  const card = home.match(/<article id="project-rescuemesh"[\s\S]*?<\/article>/)?.[0];
  assert.ok(card, 'RescueMEsh must have a single discoverable homepage entry');
  assert.match(card, /<h3>RescueMEsh<\/h3>/);
  assert.match(card, /prototype/i);
  assert.match(card, /href="projects\/rescuemesh\/"/);
  assert.match(card, /https:\/\/github.com\/abhikhur27\/emergencymesh/);
});

test('project page uses only the three approved hardware photographs and honest scope', async () => {
  const page = await readFile(new URL('projects/rescuemesh/index.html', root), 'utf8');
  assert.match(page, /<h1>RescueMEsh<\/h1>/);
  assert.match(page, /simulated locations and dispatch resources/);
  assert.match(page, /not a connection to real emergency services/);
  assert.match(page, /Alex Huang, Dersh Bhakta, and Yash Chavan/);
  assert.doesNotMatch(page, /\u2014|85%|Best Use|MongoDB Atlas|google\.com\/album|usercontent\.google/);
  const images = [...page.matchAll(/<img\b[^>]*>/g)].map(match => match[0]);
  assert.equal(images.length, 3);
  for (const image of images) assert.match(image, /alt="[^"\n]{25,}"/);
  const names = (await readdir(new URL('projects/rescuemesh/media/', root))).sort();
  assert.deepEqual(names, ['demo-setup.jpg', 'enclosure.jpg', 'handheld.jpg']);
  for (const name of names) {
    const bytes = await readFile(new URL(`projects/rescuemesh/media/${name}`, root));
    assert.equal(bytes[0], 0xff);
    assert.equal(bytes[1], 0xd8);
    assert.ok(bytes.length > 10000 && bytes.length < 3_000_000);
  }
});

test('published RescueMEsh original joins the writing feed once, newest first', async () => {
  const registry = JSON.parse(await readFile(new URL('content/linkedin-posts.json', root), 'utf8'));
  const feed = JSON.parse(await readFile(new URL('data/writing.json', root), 'utf8'));
  const url = 'https://www.linkedin.com/feed/update/urn:li:activity:7526012930224574464/';
  assert.equal(registry.urls.filter(value => value === url).length, 1);
  const originals = feed.posts.filter(post => post.url === url);
  assert.equal(originals.length, 1);
  assert.equal(originals[0].source, 'linkedin');
  assert.match(originals[0].body, /^RescueMEsh won at HackUTD!/);
  assert.doesNotMatch(originals[0].body, /github\.com|won a prize|Best Use/);
  assert.equal(feed.posts[0].url, url);
  assert.equal(feed.posts.filter(post => /RescueMEsh/i.test(post.title + post.body)).length, 1);
});
