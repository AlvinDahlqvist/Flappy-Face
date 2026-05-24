// js/settings.js — global UI settings store, persisted to localStorage.
//
// Use settings.get(key) / settings.set(key, value) / settings.subscribe(key, fn).
// Migrations from older keys run on first import.

const KEY = 'ff.settings';

export const DEFAULTS = Object.freeze({
  volume: 0.7,
  muted: false,
  haptics: true,
  scanlines: true,
  grain: true,
  reducedMotion: 'auto',   // 'auto' | true | false
  themeLock: 'auto',       // 'auto' | 'day' | 'dusk' | 'night'
});

let state = loadFromStorage();
const subscribers = new Map(); // key -> Set<fn>

function loadFromStorage() {
  let raw;
  try { raw = JSON.parse(localStorage.getItem(KEY) || '{}'); }
  catch { raw = {}; }
  const merged = { ...DEFAULTS, ...raw };
  // Migration: pull legacy ff.muted into settings.muted if present and not already set.
  const legacyMuted = localStorage.getItem('ff.muted');
  if (legacyMuted !== null && raw.muted === undefined) {
    merged.muted = legacyMuted === '1' || legacyMuted === 'true';
  }
  return merged;
}

function persist() {
  try { localStorage.setItem(KEY, JSON.stringify(state)); }
  catch (e) { console.warn('settings persist failed', e); }
}

function notify(key) {
  const set = subscribers.get(key);
  if (!set) return;
  for (const fn of set) {
    try { fn(state[key]); } catch (e) { console.warn('settings subscriber threw', e); }
  }
}

export const settings = {
  get(key) {
    if (!(key in DEFAULTS)) throw new Error(`Unknown setting: ${key}`);
    return state[key];
  },
  set(key, value) {
    if (!(key in DEFAULTS)) throw new Error(`Unknown setting: ${key}`);
    if (state[key] === value) return;
    state[key] = value;
    persist();
    notify(key);
  },
  subscribe(key, fn) {
    if (!(key in DEFAULTS)) throw new Error(`Unknown setting: ${key}`);
    let set = subscribers.get(key);
    if (!set) { set = new Set(); subscribers.set(key, set); }
    set.add(fn);
    return () => set.delete(fn);
  },
  all() { return { ...state }; },
  reset() {
    state = { ...DEFAULTS };
    persist();
    for (const key of Object.keys(DEFAULTS)) notify(key);
  },
};

// Helper: resolve "reducedMotion: 'auto'" against the system pref.
export function isReducedMotion() {
  const v = settings.get('reducedMotion');
  if (v === true) return true;
  if (v === false) return false;
  return matchMedia('(prefers-reduced-motion: reduce)').matches;
}
