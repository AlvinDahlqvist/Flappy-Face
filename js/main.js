import { Game } from './game.js';
import { Editor, saveCurrentLevel, exportLevel, importLevelFile } from './editor.js';
import { setPhotoFromFile } from './assets.js';
import { audio } from './effects.js';
import {
  loadPhotos, clearPhotos, loadHighscore,
  loadLevels, deleteLevel, savePhoto,
  loadSelectedBird, saveSelectedBird, loadUnlocked,
} from './storage.js';
import { BIRDS, PHOTO_BIRD_ID, unlockText, getBird, drawWing } from './birds.js';
import { onUnlock, bootstrapUnlocks, recordTitleClick, isUnlocked, getProgress } from './achievements.js';
import { loadStats } from './storage.js';

// Lazy-loaded animation lib. Falls back to CSS-only behaviour if CDN fails.
let anime = null;
try {
  const mod = await import('https://esm.sh/animejs@3.2.2');
  anime = mod.default;
} catch (e) {
  console.warn('anime.js failed to load — using CSS fallbacks', e);
}

const screens = {
  menu: document.getElementById('screen-menu'),
  play: document.getElementById('screen-play'),
  editor: document.getElementById('screen-editor'),
  levels: document.getElementById('screen-levels'),
  aviary: document.getElementById('screen-aviary'),
};

let currentGame = null;
let currentEditor = null;
let pendingLevel = null;
let tipTimer = null;

const TIPS = [
  'Pro tip: keep flapping.',
  'Upload your worst photo for best results.',
  'Pipes are temporary. Glory is forever.',
  "Gravity isn't a suggestion.",
  'Spacebar works too, you know.',
  'The bird does not care about your feelings.',
  'Build a map where every pipe is your boss.',
  'Take a photo of a pigeon. Become it.',
  'Hot tip: do not crash.',
  "You are now a bird's manager.",
];

const DEATH_MESSAGES = [
  'Splat.', 'Oof.', 'RIP.', 'Bonk.', 'Yikes.', 'Womp womp.',
  'F.', 'Skill issue.', 'Gravity won.', 'Plot twist: pipe.',
  'Tragic.', 'Pain.', 'Big sad.', "That'll do.", 'Crunch.',
];

function show(name) {
  for (const [k, el] of Object.entries(screens)) {
    el.classList.toggle('active', k === name);
  }
}

// ---------- AUDIO HOOKS ----------
function ensureAudio() {
  audio.ensureContext();
  if (audio.ctx?.state === 'suspended') audio.ctx.resume();
}

// Attach pointer / tap sound to every menu button.
function wireButtonSounds() {
  const playable = () => !audio.muted;
  document.querySelectorAll('button').forEach(btn => {
    btn.addEventListener('pointerenter', () => {
      if (playable()) audio.play('hover');
    });
    btn.addEventListener('pointerdown', () => {
      if (playable()) audio.play('tap');
    });
  });
}

// ---------- MENU ----------
function refreshMenu() {
  refreshStatsCard();
  const photos = loadPhotos();
  for (const slot of ['bird', 'pipe', 'bg']) {
    const thumb = document.getElementById(`thumb-${slot}`);
    if (photos[slot]) {
      thumb.style.backgroundImage = `url("${photos[slot]}")`;
      thumb.dataset.loaded = '1';
    } else {
      thumb.style.backgroundImage = '';
      delete thumb.dataset.loaded;
    }
  }
  startHeroBird();
}

function refreshStatsCard() {
  const stats = loadStats();
  const best = loadHighscore();
  rollNumber(document.getElementById('stat-best'), best);
  rollNumber(document.getElementById('stat-combo'), stats.bestCombo || 0);
  rollNumber(document.getElementById('stat-games'), stats.gamesPlayed || 0);
  rollNumber(document.getElementById('stat-deaths'), stats.deaths || 0);
}

// Tween a number element from its current value to target (uses anime if loaded).
function rollNumber(el, target) {
  const current = Number(el.textContent.replace(/[^0-9]/g, '') || 0);
  if (current === target) { el.textContent = target; return; }
  if (anime) {
    const obj = { v: current };
    anime({
      targets: obj,
      v: target,
      round: 1,
      duration: 800,
      easing: 'easeOutQuad',
      update: () => { el.textContent = obj.v; },
    });
  } else {
    el.textContent = target;
  }
}

function animateMenuIntro() {
  const chars = document.querySelectorAll('#menu-title .ch');
  if (anime) {
    anime.set(chars, { translateY: -60, opacity: 0, rotate: -20 });
    anime({
      targets: chars,
      translateY: 0,
      opacity: 1,
      rotate: 0,
      duration: 700,
      delay: anime.stagger(60),
      easing: 'easeOutElastic(1, 0.6)',
    });
    anime({
      targets: '#screen-menu .subtitle, #screen-menu .upload-grid, #screen-menu .menu-buttons, #screen-menu .highscore',
      translateY: [20, 0],
      opacity: [0, 1],
      duration: 600,
      delay: anime.stagger(80, { start: 400 }),
      easing: 'easeOutQuad',
    });
  } else {
    chars.forEach(c => { c.style.opacity = '1'; });
  }
}

function startTipRotator() {
  const tipEl = document.getElementById('tip');
  if (!tipEl) return;
  let i = Math.floor(Math.random() * TIPS.length);
  const cycle = () => {
    tipEl.classList.remove('shown');
    setTimeout(() => {
      tipEl.textContent = TIPS[i % TIPS.length];
      tipEl.classList.add('shown');
      i++;
    }, 400);
  };
  if (tipTimer) clearInterval(tipTimer);
  cycle();
  tipTimer = setInterval(cycle, 5500);
}

function stopTipRotator() {
  if (tipTimer) { clearInterval(tipTimer); tipTimer = null; }
}

function wireUploads() {
  for (const slot of ['bird', 'pipe', 'bg']) {
    const input = document.getElementById(`upload-${slot}`);
    input.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      try {
        await setPhotoFromFile(slot, file);
        // Uploading a face → auto-select it as your bird
        if (slot === 'bird') saveSelectedBird(PHOTO_BIRD_ID);
        refreshMenu();
        if (anime) {
          anime({
            targets: `#thumb-${slot}`,
            scale: [0.85, 1],
            duration: 500,
            easing: 'easeOutElastic(1, 0.5)',
          });
        }
        if (!audio.muted) audio.play('score');
      } catch (err) {
        console.error('upload failed', err);
        alert('Could not load that image.');
      } finally {
        input.value = '';
      }
    });
  }
  document.getElementById('btn-reset-photos').addEventListener('click', () => {
    if (!confirm('Wipe all uploaded photos?')) return;
    clearPhotos();
    // If we were using the photo bird, fall back to buddy
    if (loadSelectedBird() === PHOTO_BIRD_ID) saveSelectedBird('buddy');
    refreshMenu();
  });
}

function wireMenuNav() {
  document.querySelectorAll('[data-go]').forEach(btn => {
    btn.addEventListener('click', () => {
      const target = btn.dataset.go;
      if (target === 'play-random') startGame({ mode: 'random' });
      else if (target === 'editor') openEditor();
      else if (target === 'levels') openLevels();
      else if (target === 'aviary') openAviary();
    });
  });
}

// ---------- HERO BIRD (menu) ----------
let heroRafId = null;
let heroStartTime = 0;
let heroImageCache = null;

function stopHeroBird() {
  if (heroRafId) cancelAnimationFrame(heroRafId);
  heroRafId = null;
  heroImageCache = null;
}

async function startHeroBird() {
  stopHeroBird();
  const canvas = document.getElementById('hero-bird');
  if (!canvas) return;
  const dpr = window.devicePixelRatio || 1;
  canvas.width = 220 * dpr;
  canvas.height = 220 * dpr;
  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  const selectedId = loadSelectedBird();
  const photos = loadPhotos();
  let usePhoto = selectedId === PHOTO_BIRD_ID && photos.bird;
  let birdMeta = usePhoto ? null : getBird(selectedId);
  let photoImg = null;
  if (usePhoto) {
    photoImg = await loadImageFromUrl(photos.bird);
    if (!photoImg) { usePhoto = false; birdMeta = getBird('buddy'); }
  }
  heroImageCache = photoImg;

  heroStartTime = performance.now();
  const tick = (now) => {
    heroRafId = requestAnimationFrame(tick);
    const t = (now - heroStartTime) / 1000;
    const r = 56;
    ctx.clearRect(0, 0, 220, 220);
    ctx.save();
    // bob
    const bob = Math.sin(t * 2.3) * 6;
    ctx.translate(110, 100 + bob);
    // continuous wing flap cycle
    const flap = 0.5 + 0.5 * Math.sin(t * 5.5);
    // tilt slightly with bob velocity
    const tilt = Math.cos(t * 2.3) * 0.08;
    ctx.rotate(tilt);
    // wing first (behind body)
    const wingFill = birdMeta?.wingFill || '#fff8d6';
    const wingStroke = birdMeta?.wingStroke || '#c9a740';
    drawWing(ctx, r, flap, wingFill, wingStroke);
    // body
    if (usePhoto && photoImg) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.clip();
      const scale = Math.max((r * 2) / photoImg.width, (r * 2) / photoImg.height);
      const w = photoImg.width * scale, h = photoImg.height * scale;
      ctx.drawImage(photoImg, -w / 2, -h / 2, w, h);
      ctx.restore();
      ctx.strokeStyle = '#ffd166';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.stroke();
    } else if (birdMeta) {
      birdMeta.draw(ctx, r);
    }
    ctx.restore();
  };
  heroRafId = requestAnimationFrame(tick);
}

function loadImageFromUrl(url) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

function wireTitleEasterEgg() {
  const title = document.getElementById('menu-title');
  if (!title) return;
  title.addEventListener('click', () => {
    recordTitleClick();
    if (anime) {
      anime({
        targets: '#menu-title .ch',
        rotate: [-12, 0],
        scale: [1.2, 1],
        duration: 400,
        delay: anime.stagger(20),
        easing: 'easeOutElastic(1, 0.6)',
      });
    }
  });
}

// ---------- PLAY ----------
async function startGame(options) {
  ensureAudio();
  stopTipRotator();
  stopHeroBird();

  show('play');
  const canvas = document.getElementById('game-canvas');
  const overlayGameOver = document.getElementById('overlay-gameover');
  overlayGameOver.hidden = true;
  overlayGameOver.classList.remove('new-best');
  document.getElementById('overlay-pause').hidden = true;
  document.getElementById('overlay-tap').hidden = true;
  const comboEl = document.getElementById('combo');
  comboEl.hidden = true;
  comboEl.classList.remove('hot');

  if (currentGame) currentGame.stop();
  currentGame = new Game(canvas, {
    ...options,
    onScore: (s) => { document.getElementById('score').textContent = s; },
    onCombo: (c) => updateComboHud(c),
    onGameOver: ({ score, best, isNew }) => {
      document.getElementById('final-score').textContent = score;
      document.getElementById('final-best').textContent = best ?? loadHighscore();
      const msg = isNew
        ? 'NICE.'
        : DEATH_MESSAGES[Math.floor(Math.random() * DEATH_MESSAGES.length)];
      document.getElementById('gameover-message').textContent = msg;
      overlayGameOver.classList.toggle('new-best', !!isNew);
      overlayGameOver.hidden = false;
      // hide combo HUD on game end
      comboEl.hidden = true;
    },
  });
  await currentGame.start();
}

function updateComboHud(combo) {
  const comboEl = document.getElementById('combo');
  const numEl = document.getElementById('combo-num');
  if (combo < 2) {
    comboEl.hidden = true;
    comboEl.classList.remove('hot');
    return;
  }
  comboEl.hidden = false;
  numEl.textContent = combo;
  comboEl.classList.toggle('hot', combo >= 10);
  // retrigger the pulse animation
  comboEl.style.animation = 'none';
  void comboEl.offsetWidth;
  comboEl.style.animation = '';
}

function wirePlayHud() {
  document.getElementById('btn-quit').addEventListener('click', exitToMenu);
  document.getElementById('btn-back-from-gameover').addEventListener('click', exitToMenu);
  document.getElementById('btn-back-from-pause').addEventListener('click', exitToMenu);
  document.getElementById('btn-retry').addEventListener('click', () => {
    const ov = document.getElementById('overlay-gameover');
    ov.hidden = true;
    ov.classList.remove('new-best');
    document.getElementById('score').textContent = '0';
    currentGame?.retry();
  });
  document.getElementById('btn-pause').addEventListener('click', () => {
    if (!currentGame) return;
    currentGame.pause();
    document.getElementById('overlay-pause').hidden = false;
  });
  document.getElementById('btn-resume').addEventListener('click', () => {
    currentGame?.resume();
    document.getElementById('overlay-pause').hidden = true;
  });

  const muteBtn = document.getElementById('btn-mute');
  const refreshMuteBtn = () => {
    muteBtn.textContent = 'M';
    muteBtn.classList.toggle('muted', audio.muted);
    muteBtn.title = audio.muted ? 'Unmute' : 'Mute';
  };
  refreshMuteBtn();
  muteBtn.addEventListener('click', () => {
    audio.setMuted(!audio.muted);
    if (!audio.muted) ensureAudio();
    refreshMuteBtn();
  });
}

function exitToMenu() {
  if (currentGame) { currentGame.stop(); currentGame = null; }
  if (currentEditor) { currentEditor.stop(); currentEditor = null; }
  pendingLevel = null;
  refreshMenu();
  refreshLevelsList();
  show('menu');
  startTipRotator();
}

// ---------- EDITOR ----------
async function openEditor(initial) {
  stopTipRotator();
  stopHeroBird();
  show('editor');
  const canvas = document.getElementById('editor-canvas');
  if (currentEditor) currentEditor.stop();
  currentEditor = new Editor(canvas);
  await currentEditor.start(initial);
  document.getElementById('ed-gap').value = currentEditor.gap;
  setTool('add');
}

function setTool(t) {
  document.querySelectorAll('.tool-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.tool === t);
  });
  currentEditor?.setTool(t);
}

function wireEditor() {
  document.getElementById('ed-back').addEventListener('click', exitToMenu);
  document.querySelectorAll('.tool-btn').forEach(b => {
    b.addEventListener('click', () => setTool(b.dataset.tool));
  });
  document.getElementById('ed-gap').addEventListener('input', (e) => {
    currentEditor?.setGap(e.target.value);
  });
  document.getElementById('ed-test').addEventListener('click', () => {
    if (!currentEditor) return;
    if (currentEditor.obstacles.length === 0) {
      alert('Add at least one pipe first.');
      return;
    }
    const level = currentEditor.getLevel('__test__');
    pendingLevel = level;
    startGame({ mode: 'custom', level });
  });
  document.getElementById('ed-save').addEventListener('click', () => {
    if (!currentEditor) return;
    document.getElementById('save-modal').hidden = false;
    document.getElementById('save-name').value = '';
    document.getElementById('save-name').focus();
  });
  document.getElementById('ed-export').addEventListener('click', () => {
    if (!currentEditor) return;
    const level = currentEditor.getLevel(prompt('Name for the export file:', 'My map') || 'My map');
    exportLevel(level);
  });
  document.getElementById('ed-import-file').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const level = await importLevelFile(file);
      if (level.photos) {
        for (const slot of ['bird', 'pipe', 'bg']) {
          if (level.photos[slot]) savePhoto(slot, level.photos[slot]);
        }
      }
      await openEditor(level);
    } catch (err) {
      alert(`Could not import: ${err.message}`);
    } finally {
      e.target.value = '';
    }
  });
  document.getElementById('ed-clear').addEventListener('click', () => {
    if (!currentEditor) return;
    if (!confirm('Clear all pipes?')) return;
    currentEditor.clear();
  });

  document.getElementById('save-cancel').addEventListener('click', () => {
    document.getElementById('save-modal').hidden = true;
  });
  document.getElementById('save-confirm').addEventListener('click', () => {
    const name = document.getElementById('save-name').value.trim();
    if (!name) {
      alert('Please name it first.');
      return;
    }
    saveCurrentLevel(currentEditor, name);
    document.getElementById('save-modal').hidden = true;
  });
}

// ---------- LEVELS ----------
function openLevels() {
  stopTipRotator();
  stopHeroBird();
  refreshLevelsList();
  show('levels');
}

function refreshLevelsList() {
  const list = document.getElementById('levels-list');
  const empty = document.getElementById('levels-empty');
  const levels = loadLevels();
  list.innerHTML = '';
  if (levels.length === 0) {
    empty.hidden = false;
    return;
  }
  empty.hidden = true;
  for (const level of levels) {
    const li = document.createElement('li');
    li.className = 'level-item';
    li.innerHTML = `
      <div style="flex:1; min-width: 0">
        <div class="name"></div>
        <div class="meta">${level.obstacles.length} pipes · gap ${level.gap}</div>
      </div>
      <button class="btn small primary" data-action="play">Play</button>
      <button class="btn small" data-action="edit">Edit</button>
      <button class="btn small" data-action="export">Export</button>
      <button class="btn small ghost" data-action="delete">X</button>
    `;
    li.querySelector('.name').textContent = level.name;
    li.querySelector('[data-action="play"]').addEventListener('click', () => {
      startGame({ mode: 'custom', level });
    });
    li.querySelector('[data-action="edit"]').addEventListener('click', () => {
      openEditor(level);
    });
    li.querySelector('[data-action="export"]').addEventListener('click', () => {
      exportLevel(level);
    });
    li.querySelector('[data-action="delete"]').addEventListener('click', () => {
      if (!confirm(`Delete "${level.name}"?`)) return;
      deleteLevel(level.name);
      refreshLevelsList();
    });
    list.appendChild(li);
  }
}

function wireLevels() {
  document.getElementById('lv-back').addEventListener('click', exitToMenu);
}

// ---------- AVIARY ----------
function openAviary() {
  stopTipRotator();
  stopHeroBird();
  renderAviary();
  show('aviary');
}

function wireAviary() {
  document.getElementById('av-back').addEventListener('click', exitToMenu);
}

function renderAviary() {
  const grid = document.getElementById('aviary-grid');
  const progressEl = document.getElementById('aviary-progress');
  grid.innerHTML = '';
  const unlockedIds = new Set(loadUnlocked());
  const selectedId = loadSelectedBird();
  const photoUrl = loadPhotos().bird;

  const allEntries = [];
  // "Your Photo" only appears if photo uploaded
  if (photoUrl) {
    allEntries.push({
      id: PHOTO_BIRD_ID, name: 'YOUR FACE', desc: 'Your uploaded photo',
      isPhoto: true, photoUrl, unlocked: true,
    });
  }
  for (const bird of Object.values(BIRDS)) {
    allEntries.push({
      id: bird.id, name: bird.name, desc: bird.desc,
      bird, unlocked: unlockedIds.has(bird.id),
    });
  }

  for (const entry of allEntries) {
    const card = document.createElement('div');
    card.className = 'bird-card';
    if (!entry.unlocked) card.classList.add('locked');
    if (entry.id === selectedId) card.classList.add('selected');

    const tileCanvas = document.createElement('canvas');
    tileCanvas.width = 80 * (window.devicePixelRatio || 1);
    tileCanvas.height = 80 * (window.devicePixelRatio || 1);
    paintBirdTile(tileCanvas, entry);
    card.appendChild(tileCanvas);

    const name = document.createElement('div');
    name.className = 'bird-name';
    name.textContent = entry.name;
    card.appendChild(name);

    const cond = document.createElement('div');
    cond.className = 'bird-cond';
    cond.textContent = entry.unlocked ? entry.desc : (entry.bird ? unlockText(entry.bird.unlock) : '');
    card.appendChild(cond);

    // Progress bar for locked birds (skip "default" type, which has no progress)
    if (!entry.unlocked && entry.bird) {
      const progress = getProgress(entry.bird.unlock);
      if (progress) {
        const wrap = document.createElement('div');
        wrap.className = 'bird-progress';
        const bar = document.createElement('div');
        bar.className = 'bird-progress-bar';
        const fill = document.createElement('div');
        fill.className = 'bird-progress-fill';
        fill.style.width = '0%';
        fill.dataset.ratio = progress.ratio;
        bar.appendChild(fill);
        wrap.appendChild(bar);
        const label = document.createElement('div');
        label.className = 'bird-progress-label';
        label.textContent = `${progress.current}/${progress.target}`;
        wrap.appendChild(label);
        card.appendChild(wrap);
      }
    }

    if (!entry.unlocked) {
      const lock = document.createElement('div');
      lock.className = 'lock-icon';
      lock.textContent = '🔒';
      card.appendChild(lock);
    } else if (entry.id === selectedId) {
      const badge = document.createElement('div');
      badge.className = 'selected-badge';
      badge.textContent = 'PICKED';
      card.appendChild(badge);
    }

    if (entry.unlocked) {
      card.addEventListener('click', () => {
        saveSelectedBird(entry.id);
        renderAviary();
        audio.play('score');
      });
    }
    grid.appendChild(card);
  }

  const total = Object.keys(BIRDS).length;
  const unlockedCount = Object.values(BIRDS).filter(b => unlockedIds.has(b.id)).length;
  progressEl.textContent = `${unlockedCount}/${total}`;

  // Animate the progress bars filling
  const fills = document.querySelectorAll('.bird-progress-fill');
  if (anime && fills.length) {
    anime({
      targets: fills,
      width: (el) => (Number(el.dataset.ratio) * 100) + '%',
      duration: 800,
      delay: anime.stagger(50, { start: 150 }),
      easing: 'easeOutCubic',
    });
  } else {
    fills.forEach(el => { el.style.width = (Number(el.dataset.ratio) * 100) + '%'; });
  }
}

// Paint an 80x80 preview of a bird into a canvas with DPR scaling.
function paintBirdTile(canvas, entry) {
  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const size = 80;
  ctx.clearRect(0, 0, size, size);
  ctx.translate(size / 2, size / 2 + 4);
  const r = 26;
  if (entry.isPhoto) {
    // load and draw circular photo
    const img = new Image();
    img.onload = () => {
      ctx.save();
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.clip();
      const scale = Math.max((r * 2) / img.width, (r * 2) / img.height);
      const w = img.width * scale, h = img.height * scale;
      ctx.drawImage(img, -w / 2, -h / 2, w, h);
      ctx.restore();
      ctx.strokeStyle = '#ffd166';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.stroke();
    };
    img.src = entry.photoUrl;
  } else if (entry.bird) {
    entry.bird.draw(ctx, r);
  }
}

// ---------- UNLOCK TOAST ----------
let toastTimer = null;
function showUnlockToast(bird) {
  const toast = document.getElementById('unlock-toast');
  const canvas = document.getElementById('unlock-toast-canvas');
  const name = document.getElementById('unlock-toast-name');
  const dpr = window.devicePixelRatio || 1;
  canvas.width = 64 * dpr;
  canvas.height = 64 * dpr;
  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, 64, 64);
  ctx.translate(32, 32 + 3);
  bird.draw(ctx, 22);
  name.textContent = bird.name;
  toast.hidden = false;
  audio.play('cheer');
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { toast.hidden = true; }, 2800);
}

// ---------- INIT ----------
function init() {
  bootstrapUnlocks();
  wireUploads();
  wireMenuNav();
  wirePlayHud();
  wireEditor();
  wireLevels();
  wireAviary();
  wireButtonSounds();
  wireTitleEasterEgg();
  onUnlock((birds) => {
    // Toast newly-unlocked birds one at a time
    let delay = 0;
    for (const b of birds) {
      setTimeout(() => showUnlockToast(b), delay);
      delay += 3000;
    }
  });
  refreshMenu();
  show('menu');
  animateMenuIntro();
  startTipRotator();
}

init();
