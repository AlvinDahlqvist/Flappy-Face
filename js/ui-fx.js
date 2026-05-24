// js/ui-fx.js — global UI effects: CRT scanlines, dither grain, confetti spawn,
// stamp reveal, element shake. Owns its overlay DOM nodes.

import { settings, isReducedMotion } from './settings.js';

const STATE = {
  crtNode: null,
  grainNode: null,
  installed: false,
};

function generateGrainDataUrl(size = 256) {
  const cnv = document.createElement('canvas');
  cnv.width = cnv.height = size;
  const ctx = cnv.getContext('2d');
  const img = ctx.createImageData(size, size);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = (Math.random() * 255) | 0;
    img.data[i]     = v;
    img.data[i + 1] = v;
    img.data[i + 2] = v;
    img.data[i + 3] = 64;  // low alpha; CSS opacity will further reduce
  }
  ctx.putImageData(img, 0, 0);
  return cnv.toDataURL('image/png');
}

function applyClassesFromSettings() {
  const reduced = isReducedMotion();
  document.body.classList.toggle('fx-scanlines', settings.get('scanlines') && !reduced);
  document.body.classList.toggle('fx-grain',     settings.get('grain') && !reduced);
  document.body.classList.toggle('fx-reduced',   reduced);
}

export function installUiFx() {
  if (STATE.installed) return;
  STATE.installed = true;

  // CRT
  STATE.crtNode = document.createElement('div');
  STATE.crtNode.className = 'crt-overlay';
  document.body.appendChild(STATE.crtNode);

  // Grain
  STATE.grainNode = document.createElement('div');
  STATE.grainNode.className = 'grain-overlay';
  STATE.grainNode.style.backgroundImage = `url("${generateGrainDataUrl(256)}")`;
  STATE.grainNode.style.backgroundSize = '256px 256px';
  document.body.appendChild(STATE.grainNode);

  // Initial state + subscribe
  applyClassesFromSettings();
  settings.subscribe('scanlines', applyClassesFromSettings);
  settings.subscribe('grain',     applyClassesFromSettings);
  settings.subscribe('reducedMotion', applyClassesFromSettings);

  // React to system pref changes (auto mode)
  matchMedia('(prefers-reduced-motion: reduce)')
    .addEventListener('change', applyClassesFromSettings);
}

// One-shot shake — adds a CSS keyframe class for `ms` then removes it.
export function shakeElement(el, ms = 350) {
  if (!el) return;
  if (isReducedMotion()) return;
  el.classList.remove('fx-shake');
  void el.offsetWidth; // restart animation
  el.classList.add('fx-shake');
  setTimeout(() => el.classList.remove('fx-shake'), ms);
}

// Scale-bounce reveal on an element (used by letter-grade stamp).
// Returns a Promise resolved when the animation completes.
export function stampReveal(el, { duration = 600 } = {}) {
  if (!el) return Promise.resolve();
  if (isReducedMotion()) {
    el.style.transform = 'scale(1)';
    el.style.opacity = '1';
    return Promise.resolve();
  }
  return new Promise(resolve => {
    el.style.transformOrigin = 'center';
    el.style.transform = 'scale(2.2)';
    el.style.opacity = '0';
    el.style.transition = `transform ${duration}ms cubic-bezier(.2,.9,.3,1.3), opacity ${duration / 3}ms ease`;
    requestAnimationFrame(() => {
      el.style.transform = 'scale(1)';
      el.style.opacity = '1';
      setTimeout(() => {
        el.style.transition = '';
        resolve();
      }, duration);
    });
  });
}

// Spawn confetti from a DOM rect using the existing gameplay ParticleSystem.
// Caller passes a ParticleSystem instance + the (already-attached) canvas the system renders to.
export function spawnConfettiAt(ps, rect, amount = 36) {
  if (!ps || !rect) return;
  if (isReducedMotion()) return;
  // ps.spawnConfetti exists via effects.js's spawnConfetti(ps, x, y, amount)
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;
  // import dynamically to avoid a hard circular dep at module load
  import('./effects.js').then(({ spawnConfetti }) => {
    spawnConfetti(ps, cx, cy, amount);
  });
}
