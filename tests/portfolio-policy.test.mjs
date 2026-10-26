import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

const policyPaths = [
  'PROJECT_TRUTHS.md',
  'docs/portfolio-originality-rubric.md',
  'docs/portfolio-automation-message-update.md',
];
const policies = await Promise.all(policyPaths.map(async name => ({
  name,
  text: await readFile(new URL(`../${name}`, import.meta.url), 'utf8'),
})));

test('all canonical policies preserve the latest approved plain voice', () => {
  for (const { name, text } of policies) {
    assert.match(text, /latest approved copy/i, name);
    assert.match(text, /plain, professional voice/i, name);
    assert.match(text, /Do not use em dashes/i, name);
    assert.match(text, /Do not invent personal stories, usage, or results/i, name);
    assert.doesNotMatch(text, /\u2014/, `${name}: policy text must follow its punctuation rule`);
  }
});

test('all canonical policies retire the four projects and their cosmetic replacements', () => {
  for (const { name, text } of policies) {
    for (const slug of ['rollback-call', 'incident-handoff-builder', 'lease-decision-guide', 'csv-column-profiler']) {
      assert.ok(text.includes(slug), `${name}: retirement rule missing ${slug}`);
    }
    assert.match(text, /Renamed or reskinned stand-ins[^.]+banned/i, name);
  }
});

test('the maintained prompt includes a pre-publication voice and retirement review', () => {
  const { text } = policies.find(policy => policy.name.endsWith('portfolio-automation-message-update.md'));
  const prompt = text.split('## Recommended update')[1].split('## Short version')[0];
  assert.match(prompt, /Before publishing, review every changed piece of visible copy/i);
  assert.match(prompt, /Older prompts and memory must not reintroduce rejected wording or projects/i);
  assert.match(prompt, /Do not restore "Deliverable" or "Public deliverable" labels/i);
});

test('the maintained prompt keeps desktop-only execution and safe main publishing', () => {
  const { text } = policies.find(policy => policy.name.endsWith('portfolio-automation-message-update.md'));
  assert.match(text, /Execution host is desktop `ABHIONEMILLION` only/);
  assert.match(text, /keep duplicate laptop jobs paused/i);
  assert.match(text, /homepage checkout is on the detected default branch \(`main`\)/);
  assert.match(text, /never create or push `codex\/\*` branches/i);
});
