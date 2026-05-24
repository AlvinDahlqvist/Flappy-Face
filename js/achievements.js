import { loadStats, saveStats, loadUnlocked, saveUnlocked } from './storage.js';
import { BIRDS } from './birds.js';

let recentUnlocks = [];

// Listeners get { birds: [...newlyUnlockedBird] } when something unlocks
const listeners = new Set();
export function onUnlock(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function notify(birds) {
  if (!birds.length) return;
  recentUnlocks.push(...birds);
  for (const fn of listeners) {
    try { fn(birds); } catch (e) { console.error(e); }
  }
}

export function consumeRecentUnlocks() {
  const list = recentUnlocks.slice();
  recentUnlocks = [];
  return list;
}

function meetsCondition(unlock, stats) {
  switch (unlock.type) {
    case 'default': return true;
    case 'score': return (stats.bestRunScore || 0) >= unlock.value;
    case 'deaths': return (stats.deaths || 0) >= unlock.value;
    case 'maps': return (stats.customCompletes || 0) >= unlock.value;
    case 'easter': return (stats[unlock.statKey] || 0) >= unlock.value;
    case 'coins': return (stats.totalCoins || 0) >= unlock.value;
    case 'nearMisses': return (stats.maxNearMissesInRun || 0) >= unlock.value;
    default: return false;
  }
}

function checkUnlocks(stats) {
  const unlocked = new Set(loadUnlocked());
  const newly = [];
  for (const bird of Object.values(BIRDS)) {
    if (unlocked.has(bird.id)) continue;
    if (meetsCondition(bird.unlock, stats)) {
      unlocked.add(bird.id);
      newly.push(bird);
    }
  }
  if (newly.length) {
    saveUnlocked([...unlocked]);
    notify(newly);
  }
  return newly;
}

// ============ RECORDERS ============

export function recordGameStart() {
  const s = loadStats();
  s.gamesPlayed = (s.gamesPlayed || 0) + 1;
  saveStats(s);
  return checkUnlocks(s);
}

export function recordDeath() {
  const s = loadStats();
  s.deaths = (s.deaths || 0) + 1;
  saveStats(s);
  return checkUnlocks(s);
}

export function recordScore(score) {
  const s = loadStats();
  s.bestRunScore = Math.max(s.bestRunScore || 0, score);
  saveStats(s);
  return checkUnlocks(s);
}

export function recordCustomComplete() {
  const s = loadStats();
  s.customCompletes = (s.customCompletes || 0) + 1;
  saveStats(s);
  return checkUnlocks(s);
}

export function recordTitleClick() {
  const s = loadStats();
  s.titleClicks = (s.titleClicks || 0) + 1;
  saveStats(s);
  return checkUnlocks(s);
}

export function recordCombo(combo) {
  const s = loadStats();
  s.bestCombo = Math.max(s.bestCombo || 0, combo);
  saveStats(s);
  return checkUnlocks(s);
}

export function recordCoins(collectedThisRun) {
  const s = loadStats();
  s.totalCoins = (s.totalCoins || 0) + collectedThisRun;
  saveStats(s);
  return checkUnlocks(s);
}

export function recordNearMisses(nearMissesThisRun) {
  const s = loadStats();
  s.maxNearMissesInRun = Math.max(s.maxNearMissesInRun || 0, nearMissesThisRun);
  saveStats(s);
  return checkUnlocks(s);
}

export function isUnlocked(birdId) {
  return loadUnlocked().includes(birdId);
}

// Returns { current, target, ratio } for any unlock spec, or null for 'default'.
export function getProgress(unlock, stats = loadStats()) {
  let current = 0;
  let target = 0;
  switch (unlock.type) {
    case 'default':
      return null;
    case 'score':
      current = stats.bestRunScore || 0; target = unlock.value; break;
    case 'deaths':
      current = stats.deaths || 0; target = unlock.value; break;
    case 'maps':
      current = stats.customCompletes || 0; target = unlock.value; break;
    case 'easter':
      current = stats[unlock.statKey] || 0; target = unlock.value; break;
    case 'coins':
      current = stats.totalCoins || 0; target = unlock.value; break;
    case 'nearMisses':
      current = stats.maxNearMissesInRun || 0; target = unlock.value; break;
    default:
      return null;
  }
  return {
    current: Math.min(current, target),
    target,
    ratio: Math.min(1, current / target),
  };
}

// Ensure default birds are unlocked once. Safe to call anytime.
export function bootstrapUnlocks() {
  const stats = loadStats();
  checkUnlocks(stats); // unlocks default + anything already satisfied
}
