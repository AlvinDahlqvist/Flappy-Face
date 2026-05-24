const KEY_PHOTOS = 'ff.photos';
const KEY_LEVELS = 'ff.levels';
const KEY_HIGHSCORE = 'ff.highscore';
const KEY_STATS = 'ff.stats';
const KEY_UNLOCKED = 'ff.unlocked';
const KEY_SELECTED_BIRD = 'ff.selectedBird';

function readJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function writeJSON(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (e) {
    console.warn('storage write failed', key, e);
    return false;
  }
}

export function loadPhotos() {
  return readJSON(KEY_PHOTOS, { bird: null, pipe: null, bg: null });
}

export function savePhoto(slot, dataUrl) {
  const photos = loadPhotos();
  photos[slot] = dataUrl;
  return writeJSON(KEY_PHOTOS, photos);
}

export function clearPhotos() {
  localStorage.removeItem(KEY_PHOTOS);
}

export function loadLevels() {
  let raw;
  try { raw = JSON.parse(localStorage.getItem('ff.levels') || '[]'); }
  catch { raw = []; }
  return raw.map(l => ({
    lastPlayedAt: l.lastPlayedAt ?? null,
    bestScore:    l.bestScore    ?? 0,
    playCount:    l.playCount    ?? 0,
    ...l,   // existing fields override defaults if present (preserves saved data)
  }));
}

export function recordLevelPlay(name, finalScore) {
  const all = loadLevels();
  const idx = all.findIndex(l => l.name === name);
  if (idx === -1) return;
  all[idx].lastPlayedAt = Date.now();
  all[idx].playCount = (all[idx].playCount || 0) + 1;
  if ((finalScore ?? 0) > (all[idx].bestScore || 0)) {
    all[idx].bestScore = finalScore;
  }
  try { localStorage.setItem('ff.levels', JSON.stringify(all)); } catch {}
}

export function saveLevel(level) {
  const levels = loadLevels();
  const idx = levels.findIndex(l => l.name === level.name);
  if (idx >= 0) levels[idx] = level;
  else levels.push(level);
  return writeJSON(KEY_LEVELS, levels);
}

export function deleteLevel(name) {
  const levels = loadLevels().filter(l => l.name !== name);
  writeJSON(KEY_LEVELS, levels);
}

export function loadHighscore() {
  return Number(localStorage.getItem(KEY_HIGHSCORE) || 0);
}

export function saveHighscore(score) {
  const previous = loadHighscore();
  const isNew = score > previous;
  if (isNew) localStorage.setItem(KEY_HIGHSCORE, String(score));
  return { isNew, previous, best: isNew ? score : previous };
}

// ============ STATS / ACHIEVEMENTS ============

export function loadStats() {
  return readJSON(KEY_STATS, {
    gamesPlayed: 0,
    deaths: 0,
    customCompletes: 0,
    bestRunScore: 0,
    titleClicks: 0,
  });
}

export function saveStats(stats) {
  return writeJSON(KEY_STATS, stats);
}

export function loadUnlocked() {
  return readJSON(KEY_UNLOCKED, ['buddy']);
}

export function saveUnlocked(arr) {
  return writeJSON(KEY_UNLOCKED, arr);
}

export function loadSelectedBird() {
  return localStorage.getItem(KEY_SELECTED_BIRD) || 'buddy';
}

export function saveSelectedBird(id) {
  localStorage.setItem(KEY_SELECTED_BIRD, id);
}
