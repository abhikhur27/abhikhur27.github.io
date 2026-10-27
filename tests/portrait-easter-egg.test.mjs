import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createPortraitEasterEgg, recordPortraitClick, portraitLaunchVector, PORTRAIT_PARTICLE_LIMIT } from '../portrait-easter-egg.mjs';

test('six clicks inside the sliding 1500ms window launch', () => {
  let clicks = [];
  for (const now of [0, 100, 250, 500, 1000]) {
    const result = recordPortraitClick(clicks, now);
    assert.equal(result.launch, false);
    clicks = result.clicks;
  }
  assert.equal(recordPortraitClick(clicks, 1500).launch, true);
});

test('slow clicks do not accumulate and backwards clocks discard future clicks', () => {
  let clicks = [];
  for (let now = 0; now < 30000; now += 1600) {
    const result = recordPortraitClick(clicks, now);
    assert.equal(result.launch, false);
    clicks = result.clicks;
    assert.equal(clicks.length, 1);
  }
  assert.deepEqual(recordPortraitClick([100, 200], 50).clicks, [50]);
  assert.throws(() => recordPortraitClick([], Infinity), TypeError);
});

test('the launch vector clears the viewport from different scroll positions', () => {
  for (const top of [-200, 0, 450]) {
    const vector = portraitLaunchVector({ top, height: 150 }, 390);
    assert.ok(top + 150 + vector.y < 0);
    assert.ok(vector.x >= 90 && vector.x <= 240);
  }
  assert.ok(Number.isFinite(portraitLaunchVector({}, 0).y));
});

function fakeElement(document, tag = 'span') {
  const element = {
    tag, document, style: {}, dataset: {}, attributes: {}, children: [], listeners: new Map(), hidden: false, textContent: '', tabIndex: 0,
    setAttribute(key, value) { this.attributes[key] = value; },
    getAttribute(key) { return this.attributes[key] ?? null; },
    removeAttribute(key) { delete this.attributes[key]; },
    append(child) { child.parent = this; this.children.push(child); },
    remove() { if (this.parent) this.parent.children = this.parent.children.filter(child => child !== this); },
    addEventListener(type, listener) { this.listeners.set(type, listener); },
    removeEventListener(type, listener) { if (this.listeners.get(type) === listener) this.listeners.delete(type); },
    focus() { document.activeElement = this; },
    getBoundingClientRect() { return { left: 240, top: 160, width: 112, height: 149 }; },
    querySelector(selector) { return this.children.find(child => selector === 'img' ? child.tag === 'img' : `.${child.className}` === selector) ?? null; },
    cloneNode() { return fakeElement(document, this.tag); },
    insertAdjacentHTML() {},
  };
  return element;
}

function setup({ reduced = true, animated = false } = {}) {
  const document = { hidden: false, listeners: new Map(), addEventListener(type, fn) { this.listeners.set(type, fn); }, removeEventListener(type) { this.listeners.delete(type); } };
  const allAnimations = [];
  function makeElement(tag) {
    const element = fakeElement(document, tag);
    if (animated) element.animate = () => {
      const animation = { canceled: false, cancel() { this.canceled = true; }, finish() { this.onfinish?.(); } };
      allAnimations.push(animation);
      return animation;
    };
    return element;
  }
  document.createElement = makeElement;
  document.body = makeElement('body');
  const media = { matches: reduced, addEventListener() {}, removeEventListener() {} };
  const window = { innerWidth: 390, matchMedia: () => media, getComputedStyle: () => ({ transform: 'none' }) };
  const button = makeElement('button'), craft = makeElement('span'), status = makeElement('p'), resetButton = makeElement('button'), frame = makeElement('div');
  button.setAttribute('aria-label', 'Spin my portrait');
  craft.append(makeElement('img'));
  resetButton.hidden = true;
  let time = 0;
  let timerId = 0;
  const scheduled = new Map();
  const controller = createPortraitEasterEgg({ button, craft, status, resetButton, frame, document, window, now: () => time,
    schedule(callback) { const id = ++timerId; scheduled.set(id, callback); return id; },
    unschedule(id) { scheduled.delete(id); },
  });
  return { controller, button, craft, status, resetButton, frame, document, allAnimations, scheduled,
    advance(ms) { time += ms; },
    finish() { for (const animation of [...allAnimations]) if (!animation.canceled) animation.finish(); },
    runTimer() { const entry = scheduled.entries().next().value; if (entry) { scheduled.delete(entry[0]); entry[1](); } },
  };
}

function burst(env, options) { for (let i = 0; i < 6; i += 1) { env.controller.click(options); env.advance(100); } }

test('reduced-motion launch fades, announces the joke, and restores without a new page', () => {
  const env = setup();
  env.button.focus();
  burst(env);
  assert.equal(env.controller.state.phase, 'away');
  assert.equal(env.status.textContent, 'now look what youve done');
  assert.equal(env.resetButton.hidden, false);
  assert.equal(env.document.activeElement, env.resetButton);
  assert.equal(env.document.body.children.length, 0);
  env.controller.restore();
  assert.equal(env.controller.state.phase, 'idle');
  assert.equal(env.document.activeElement, env.button);
  assert.equal(env.button.attributes['aria-hidden'], undefined);
  assert.equal(env.button.tabIndex, 0);
  assert.equal(env.resetButton.hidden, true);
  assert.equal(env.status.textContent, '');
});

test('keyboard burst uses the gentle counterpart even when motion is enabled', () => {
  const env = setup({ reduced: false, animated: true });
  burst(env, { keyboard: true });
  assert.equal(env.document.body.children.length, 0);
  env.finish();
  assert.equal(env.controller.state.phase, 'away');
  assert.equal(env.controller.state.animations, 0);
});

test('normal click particles are bounded and reset cancels an armed launch', () => {
  const env = setup({ reduced: false, animated: true });
  for (let i = 0; i < 5; i += 1) env.controller.click();
  assert.equal(env.controller.state.particles, PORTRAIT_PARTICLE_LIMIT);
  env.controller.click();
  assert.equal(env.controller.state.phase, 'arming');
  assert.equal(env.controller.state.particles, 0);
  assert.equal(env.controller.state.timers, 1);
  env.controller.restore();
  assert.deepEqual(env.controller.state, { phase: 'idle', clicks: 0, particles: 0, animations: 0, timers: 0 });
  assert.equal(env.scheduled.size, 0);
  assert.equal(env.document.body.children.length, 0);
  assert.ok(env.allAnimations.every(animation => animation.canceled));
});

test('the full launch cleans up the overlay, animation handles, and timer', () => {
  const env = setup({ reduced: false, animated: true });
  burst(env);
  env.runTimer();
  assert.equal(env.controller.state.phase, 'launching');
  env.finish();
  assert.deepEqual(env.controller.state, { phase: 'away', clicks: 0, particles: 0, animations: 0, timers: 0 });
  assert.equal(env.document.body.children.length, 0);
});

test('hidden tabs finish a pending flight and destroy removes event handlers', () => {
  const env = setup({ reduced: false, animated: true });
  burst(env);
  env.document.hidden = true;
  env.document.listeners.get('visibilitychange')();
  assert.equal(env.controller.state.phase, 'away');
  env.controller.destroy();
  assert.equal(env.button.listeners.size, 0);
  assert.equal(env.resetButton.listeners.size, 0);
  assert.equal(env.document.listeners.size, 0);
  assert.equal(env.document.body.children.length, 0);
  burst(env);
  assert.equal(env.controller.state.phase, 'idle');
});

test('missing DOM nodes leave the static photo alone', () => {
  assert.equal(createPortraitEasterEgg(), null);
});
