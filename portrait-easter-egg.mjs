const EASE_OUT = 'cubic-bezier(0.23, 1, 0.32, 1)';
const EASE_IN_OUT = 'cubic-bezier(0.77, 0, 0.175, 1)';
export const PORTRAIT_CLICK_WINDOW_MS = 1500;
export const PORTRAIT_LAUNCH_CLICKS = 6;
export const PORTRAIT_PARTICLE_LIMIT = 32;

/** Only a short burst counts. A few clicks spread across a visit never launch. */
export function recordPortraitClick(previous, now, windowMs = PORTRAIT_CLICK_WINDOW_MS, threshold = PORTRAIT_LAUNCH_CLICKS) {
  if (!Number.isFinite(now) || !Number.isFinite(windowMs) || windowMs < 0 || !Number.isInteger(threshold) || threshold < 1) {
    throw new TypeError('A click needs a finite time, a positive window, and a whole click threshold.');
  }
  const clicks = previous.filter(time => Number.isFinite(time) && now >= time && now - time <= windowMs);
  clicks.push(now);
  return { clicks: clicks.slice(-threshold), launch: clicks.length >= threshold };
}

/** The flight lives in a clipped overlay, never in the page's scrollable width. */
export function portraitLaunchVector(rect, viewportWidth) {
  const width = Number.isFinite(viewportWidth) && viewportWidth > 0 ? viewportWidth : 320;
  const top = Number.isFinite(rect.top) ? rect.top : 0;
  const height = Number.isFinite(rect.height) && rect.height > 0 ? rect.height : 150;
  return { x: Math.min(240, Math.max(90, width * 0.18)), y: -Math.max(height + 180, top + height + 180) };
}

const BOOSTERS = `<svg class="portrait-boosters" viewBox="0 0 144 142" aria-hidden="true" focusable="false">
  <g class="portrait-booster-body" fill="var(--bg, #111110)" stroke="var(--text, #ecece6)" stroke-width="1.5" stroke-linejoin="round">
    <path d="M24 18 18 8 12 18V88H24ZM120 18 126 8 132 18V88H120Z"/>
    <path d="M12 72 5 84V94L18 88 31 94V84L24 72M120 72 113 84V94L126 88 139 94V84L132 72"/>
    <path d="M24 33H43M101 33H120M24 62H43M101 62H120" fill="none" stroke="var(--accent, #a0c79a)"/>
    <path d="M12 83H24M120 83H132" fill="none"/>
  </g>
  <g class="portrait-booster-flame" fill="none" stroke="var(--accent, #a0c79a)" stroke-width="1.5" stroke-linejoin="round">
    <path d="m13 94 5 39 5-39M123 94l3 39 5-39"/>
    <path d="m16 96 2 21 2-21M125 96l1 21 3-21" stroke="var(--text, #ecece6)"/>
  </g>
</svg>`;

export function createPortraitEasterEgg({
  button, craft, status, resetButton, frame = button?.closest('.portrait-frame'),
  document: doc = globalThis.document, window: win = globalThis.window,
  now = () => globalThis.performance?.now() ?? Date.now(),
  random = Math.random,
  schedule = (callback, delay) => globalThis.setTimeout(callback, delay),
  unschedule = id => globalThis.clearTimeout(id),
} = {}) {
  if (!button || !craft || !status || !resetButton || !frame || !doc || !win) return null;
  const media = win.matchMedia?.('(prefers-reduced-motion: reduce)');
  const originalLabel = button.getAttribute('aria-label') || 'Spin my portrait';
  const originalTabIndex = button.tabIndex;
  const animations = new Set();
  const particles = new Set();
  const timers = new Set();
  let clicks = [];
  let phase = 'idle';
  let overlay = null;
  let flight = null;
  let spin = null;
  let disposed = false;

  function setPhase(value) {
    phase = value;
    frame.dataset.portraitState = value;
  }

  function ensureOverlay() {
    if (!overlay) {
      overlay = doc.createElement('div');
      overlay.className = 'portrait-effects';
      overlay.setAttribute('aria-hidden', 'true');
      doc.body.append(overlay);
    }
    return overlay;
  }

  function removeEmptyOverlay() {
    if (!particles.size && !flight && overlay) {
      overlay.remove();
      overlay = null;
    }
  }

  function cancel(animation) {
    if (!animation) return;
    animation.onfinish = null;
    animation.oncancel = null;
    animation.cancel();
    animations.delete(animation);
  }

  function play(element, keyframes, options, finish = () => {}) {
    if (typeof element.animate !== 'function') {
      finish();
      return null;
    }
    const animation = element.animate(keyframes, options);
    animations.add(animation);
    animation.onfinish = () => {
      animations.delete(animation);
      animation.onfinish = null;
      finish();
      animation.cancel();
    };
    return animation;
  }

  function later(callback, delay) {
    const id = schedule(() => {
      timers.delete(id);
      if (!disposed) callback();
    }, delay);
    timers.add(id);
  }

  function clearEffects() {
    for (const id of timers) unschedule(id);
    timers.clear();
    for (const animation of [...animations]) cancel(animation);
    spin = null;
    for (const particle of particles) particle.remove();
    particles.clear();
    flight?.remove();
    flight = null;
    overlay?.remove();
    overlay = null;
  }

  function spark(rect) {
    const layer = ensureOverlay();
    for (let index = 0; index < 8 && particles.size < PORTRAIT_PARTICLE_LIMIT; index += 1) {
      const particle = doc.createElement('span');
      particle.className = `portrait-spark${index % 3 === 0 ? ' portrait-spark-bone' : ''}`;
      particle.style.left = `${rect.left + rect.width / 2}px`;
      particle.style.top = `${rect.top + rect.height / 2}px`;
      layer.append(particle);
      particles.add(particle);
      const angle = (index / 8) * Math.PI * 2 + random() * 0.35;
      const distance = 45 + random() * 40;
      play(particle, [
        { transform: 'translate(0, 0) rotate(0deg)', opacity: 0.9 },
        { transform: `translate(${Math.cos(angle) * distance}px, ${Math.sin(angle) * distance}px) rotate(120deg)`, opacity: 0 },
      ], { duration: 500, easing: EASE_OUT }, () => {
        particle.remove();
        particles.delete(particle);
        removeEmptyOverlay();
      });
    }
    removeEmptyOverlay();
  }

  function spinOnce(gentle) {
    // Retarget from the currently displayed transform instead of snapping to zero.
    const current = win.getComputedStyle?.(craft).transform || 'none';
    cancel(spin);
    if (gentle) {
      spin = play(craft, [{ opacity: 0.7 }, { opacity: 1 }], { duration: 160, easing: EASE_OUT });
    } else {
      spin = play(craft, [
        { transform: current },
        { transform: 'rotate(360deg)' },
      ], { duration: 500, easing: EASE_OUT });
      spark(button.getBoundingClientRect());
    }
  }

  function finishLaunch() {
    if (disposed || (phase !== 'arming' && phase !== 'launching')) return;
    clearEffects();
    setPhase('away');
    status.textContent = 'now look what youve done';
    resetButton.hidden = false;
    // Keep keyboard focus on a real visible control, not the offscreen photo.
    if (doc.activeElement === button) resetButton.focus({ preventScroll: true });
    button.style.visibility = 'hidden';
    button.tabIndex = -1;
    button.setAttribute('aria-hidden', 'true');
    button.removeAttribute('aria-busy');
  }

  function launch(gentle) {
    clearEffects();
    setPhase('arming');
    clicks = [];
    button.setAttribute('aria-busy', 'true');
    resetButton.hidden = false;
    if (gentle || typeof craft.animate !== 'function') {
      play(craft, [{ opacity: 1 }, { opacity: 0 }], { duration: 160, easing: EASE_OUT }, finishLaunch);
      return;
    }
    const rect = button.getBoundingClientRect();
    flight = doc.createElement('span');
    flight.className = 'portrait-flight';
    flight.style.left = `${rect.left}px`;
    flight.style.top = `${rect.top}px`;
    flight.style.width = `${rect.width}px`;
    flight.style.height = `${rect.height}px`;
    const photo = craft.querySelector('img')?.cloneNode(true);
    if (photo) {
      photo.alt = '';
      photo.removeAttribute('id');
      flight.append(photo);
    }
    flight.insertAdjacentHTML('beforeend', BOOSTERS);
    ensureOverlay().append(flight);
    craft.style.opacity = '0';
    const rig = flight.querySelector('.portrait-boosters');
    if (rig) play(rig, [
      { transform: 'scaleY(0.9)', opacity: 0 },
      { transform: 'scaleY(1)', opacity: 1 },
    ], { duration: 250, easing: EASE_OUT });
    later(() => {
      if (phase !== 'arming' || !flight) return;
      setPhase('launching');
      const vector = portraitLaunchVector(rect, win.innerWidth);
      const flame = flight.querySelector('.portrait-booster-flame');
      if (flame) play(flame, [
        { transform: 'scaleY(0.92)', opacity: 0.7 },
        { transform: 'scaleY(1)', opacity: 1 },
      ], { duration: 140, iterations: 5, direction: 'alternate', easing: 'linear' });
      play(flight, [
        { transform: 'translate(0, 0) rotate(0deg)', opacity: 1, offset: 0 },
        { transform: 'translate(-4px, -12px) rotate(-5deg)', opacity: 1, offset: 0.2 },
        { transform: `translate(${vector.x}px, ${vector.y}px) rotate(14deg)`, opacity: 0, offset: 1 },
      ], { duration: 900, easing: EASE_IN_OUT }, finishLaunch);
    }, 250);
  }

  function click({ keyboard = false } = {}) {
    if (disposed || phase !== 'idle') return;
    const result = recordPortraitClick(clicks, now());
    clicks = result.clicks;
    const gentle = keyboard || Boolean(media?.matches);
    if (result.launch) launch(gentle);
    else spinOnce(gentle);
  }

  function restore({ focus = doc.activeElement === resetButton } = {}) {
    if (disposed) return;
    clearEffects();
    clicks = [];
    craft.style.opacity = '';
    craft.style.transform = '';
    button.style.visibility = '';
    button.tabIndex = originalTabIndex;
    button.setAttribute('aria-label', originalLabel);
    button.removeAttribute('aria-hidden');
    button.removeAttribute('aria-busy');
    resetButton.hidden = true;
    status.textContent = '';
    setPhase('idle');
    if (focus) button.focus({ preventScroll: true });
  }

  const onClick = event => click({ keyboard: event.detail === 0 });
  const onRestore = () => restore();
  const onHidden = () => {
    if (!doc.hidden) return;
    if (phase === 'arming' || phase === 'launching') finishLaunch();
    else clearEffects();
  };
  const onMotionChange = () => {
    if (!media?.matches) return;
    if (phase === 'arming' || phase === 'launching') finishLaunch();
    else clearEffects();
  };

  button.addEventListener('click', onClick);
  resetButton.addEventListener('click', onRestore);
  doc.addEventListener('visibilitychange', onHidden);
  media?.addEventListener?.('change', onMotionChange);
  setPhase('idle');

  return {
    click, restore,
    get state() { return { phase, clicks: clicks.length, particles: particles.size, animations: animations.size, timers: timers.size }; },
    destroy() {
      if (disposed) return;
      restore({ focus: false });
      disposed = true;
      button.removeEventListener('click', onClick);
      resetButton.removeEventListener('click', onRestore);
      doc.removeEventListener('visibilitychange', onHidden);
      media?.removeEventListener?.('change', onMotionChange);
    },
  };
}

if (typeof document !== 'undefined') {
  const button = document.querySelector('#portrait-button');
  if (button && !button.dataset.portraitReady) {
    const controller = createPortraitEasterEgg({
      button,
      craft: button.querySelector('.portrait-craft'),
      status: document.querySelector('#portrait-status'),
      resetButton: document.querySelector('#portrait-reset'),
    });
    if (controller) button.dataset.portraitReady = 'true';
  }
}
