import { Game } from './game.js';
import { Editor, saveCurrentLevel, exportLevel, importLevelFile } from './editor.js';
import { setPhotoFromFile } from './assets.js';
import { audio } from './effects.js';
import {
  loadPhotos, clearPhotos, loadHighscore,
  loadLevels, deleteLevel, savePhoto,
  loadSelectedBird, saveSelectedBird, loadUnlocked,
  recordLevelPlay,
} from './storage.js';
import { BIRDS, PHOTO_BIRD_ID, unlockText, getBird, drawWing } from './birds.js';
import { onUnlock, bootstrapUnlocks, recordTitleClick, isUnlocked, getProgress, consumeRecentUnlocks } from './achievements.js';
import { loadStats } from './storage.js';
import { settings } from './settings.js';
import { installUiFx, stampReveal, spawnConfettiAt } from './ui-fx.js';
import { gradeRun } from './grading.js';
import { transition } from './transitions.js';

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
  settings: document.getElementById('screen-settings'),
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
  return transition(async () => {
    for (const [k, el] of Object.entries(screens)) {
      el.classList.toggle('active', k === name);
    }
  });
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
  rollNumber(document.getElementById('stat-runs'), stats.gamesPlayed || 0);
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
  if (!anime) {
    chars.forEach(c => { c.style.opacity = '1'; });
    return;
  }
  anime.set(chars, { translateY: -60, opacity: 0, rotate: -20 });
  anime({
    targets: chars,
    translateY: 0,
    opacity: 1,
    rotate: 0,
    duration: 700,
    delay: anime.stagger(50),
    easing: 'easeOutElastic(1, 0.6)',
  });
  anime({
    targets: '#screen-menu .subtitle, #screen-menu .cat-tile, #screen-menu .customize-drawer, #screen-menu .stats-ribbon',
    translateY: [22, 0],
    opacity: [0, 1],
    duration: 600,
    delay: anime.stagger(80, { start: 380 }),
    easing: 'easeOutQuad',
  });
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

function wireCatTiles() {
  const tiles  = document.querySelectorAll('.cat-tile');
  const panel  = document.getElementById('cat-panel');
  const panels = panel.querySelectorAll('[data-panel]');
  let openCat = null;

  function setOpen(cat) {
    openCat = cat;
    tiles.forEach(t => t.classList.toggle('expanded', t.dataset.cat === cat));
    panels.forEach(p => p.classList.toggle('active', p.dataset.panel === cat));
    panel.hidden = !cat;
  }

  tiles.forEach(t => {
    t.addEventListener('click', () => {
      const cat = t.dataset.cat;
      if (cat === 'birds') {        // direct nav, no panel
        setOpen(null);
        openAviary();
        return;
      }
      setOpen(openCat === cat ? null : cat);
    });
  });

  // collapse panel when a sub-action is taken
  panel.addEventListener('click', (e) => {
    if (e.target.closest('[data-go], #upload-import')) setOpen(null);
  });
}

function wireCustomizeDrawer() {
  const drawer = document.getElementById('customize-drawer');
  const toggle = document.getElementById('customize-toggle');
  const body   = drawer.querySelector('.customize-body');
  const KEY    = 'ff.menu.customizeOpen';

  function setOpen(open) {
    drawer.toggleAttribute('data-open', open);
    body.hidden = !open;
    toggle.setAttribute('aria-expanded', String(open));
    try { localStorage.setItem(KEY, open ? '1' : '0'); } catch {}
  }
  toggle.addEventListener('click', () => setOpen(body.hidden));

  // Initial state from storage
  let open = false;
  try { open = localStorage.getItem(KEY) === '1'; } catch {}
  setOpen(open);
}

function wireMenuImport() {
  const input = document.getElementById('upload-import');
  if (!input) return;
  input.addEventListener('change', async (e) => {
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
  stopAviaryAnimations();
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
  stopAviaryAnimations();

  show('play');
  const canvas = document.getElementById('game-canvas');
  const overlayGameOver = document.getElementById('overlay-gameover');
  overlayGameOver.hidden = true;
  overlayGameOver.classList.remove('new-best');
  document.getElementById('overlay-pause').hidden = true;
  document.getElementById('overlay-tap').hidden = true;

  document.getElementById('hud-coins-num').textContent = '0';
  document.getElementById('hud-near-num').textContent = '0';
  document.querySelectorAll('.combo-seg').forEach(s => s.classList.remove('lit', 'lit-2', 'lit-3'));
  document.getElementById('combo-x').hidden = true;

  if (currentGame) currentGame.stop();
  currentGame = new Game(canvas, {
    ...options,
    themeOverride: settings.get('themeLock') !== 'auto' ? settings.get('themeLock') : null,
    onScore: (s) => { document.getElementById('score').textContent = s; },
    onCombo: (streak) => {
      const meter = document.getElementById('combo-meter');
      const segs = meter.querySelectorAll('.combo-seg');
      const x = document.getElementById('combo-x');
      segs.forEach((s, i) => {
        s.classList.remove('lit', 'lit-2', 'lit-3');
        if (i < Math.min(streak, 5)) {
          s.classList.add(streak >= 15 ? 'lit-3' : streak >= 10 ? 'lit-2' : 'lit');
        }
      });
      x.hidden = streak < 5;
      x.textContent = streak >= 5 ? `x${streak}` : '';
      if (streak === 0) {
        meter.classList.add('broken');
        setTimeout(() => meter.classList.remove('broken'), 400);
      }
      // Combo-driven score aura
      const score = document.getElementById('score');
      score.classList.remove('combo-aura-1', 'combo-aura-2', 'combo-aura-3');
      const tier = streak >= 15 ? 3 : streak >= 10 ? 2 : streak >= 5 ? 1 : 0;
      if (tier > 0) score.classList.add(`combo-aura-${tier}`);
    },
    onCoin: (total) => {
      const num = document.getElementById('hud-coins-num');
      num.textContent = total;
      const c = document.getElementById('hud-coins');
      c.classList.remove('flash'); void c.offsetWidth; c.classList.add('flash');
    },
    onNearMiss: (total) => {
      const num = document.getElementById('hud-near-num');
      num.textContent = total;
      const c = document.getElementById('hud-near');
      c.classList.remove('flash'); void c.offsetWidth; c.classList.add('flash');
    },
    onGameOver: (info) => {
      if (options.mode === 'custom' && options.level?.name && options.level.name !== '__test__') {
        recordLevelPlay(options.level.name, info.score);
      }
      const { score, best, isNew, coins = 0, nearMisses = 0, bestCombo = 0, flaps = 0, durationMs = 0 } = info;
      document.getElementById('final-score').textContent = score;
      document.getElementById('final-best').textContent = best ?? loadHighscore();
      const msg = isNew
        ? 'NICE.'
        : DEATH_MESSAGES[Math.floor(Math.random() * DEATH_MESSAGES.length)];
      document.getElementById('gameover-message').textContent = msg;

      // Compute grade
      const g = gradeRun({ score, coins, bestCombo, nearMisses, isNewBest: !!isNew });
      const stamp = document.getElementById('grade-stamp');
      stamp.textContent = g.grade;
      stamp.dataset.grade = g.grade;

      overlayGameOver.classList.toggle('new-best', !!isNew);
      overlayGameOver.hidden = false;

      // Animate grade stamp in, then confetti, then summary cascade
      stampReveal(stamp).then(() => {
        if (currentGame?.particles) {
          const rect = stamp.getBoundingClientRect();
          spawnConfettiAt(currentGame.particles, rect, 48);
        }
        animateRunSummary({ coins, nearMisses, bestCombo, flaps, durationMs });
        renderInlineUnlock();
      });
    },
  });
  await currentGame.start();
}

async function openShareModal() {
  const { buildShareCard, downloadShareCard, copyShareCard } = await import('./share-card.js');
  const modal = document.getElementById('share-modal');
  const preview = document.getElementById('share-preview');
  preview.removeAttribute('src');

  // Gather current run context
  const score = Number(document.getElementById('final-score').textContent) || 0;
  const best  = Number(document.getElementById('final-best').textContent) || 0;
  const grade = document.getElementById('grade-stamp').textContent;
  const selectedId = loadSelectedBird();
  const photos = loadPhotos();
  let bird = null, photoImg = null;
  if (selectedId === PHOTO_BIRD_ID && photos.bird) {
    photoImg = await loadImageFromUrl(photos.bird);
  } else {
    bird = getBird(selectedId);
  }
  const theme = currentGame?.theme || 'day';

  modal.hidden = false;
  preview.alt = 'Generating...';
  const card = await buildShareCard({ bird, photoImg, grade, score, best, theme });
  preview.src = card.dataUrl;

  document.getElementById('share-close').onclick = () => { modal.hidden = true; };
  document.getElementById('share-copy').onclick = async () => {
    const ok = await copyShareCard(card);
    document.getElementById('share-copy').textContent = ok ? 'Copied!' : 'Unavailable';
  };
  document.getElementById('share-download').onclick = () => {
    downloadShareCard(card, `flappy-face-${grade}-${score}.png`);
  };
}

function renderInlineUnlock() {
  const card = document.getElementById('unlock-inline');
  const recent = consumeRecentUnlocks();
  if (recent.length === 0) { card.hidden = true; return; }
  const bird = recent[0];   // show first; toast shows the rest as before
  const canvas = document.getElementById('unlock-inline-canvas');
  const dpr = window.devicePixelRatio || 1;
  canvas.width = 64 * dpr;
  canvas.height = 64 * dpr;
  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, 64, 64);
  ctx.translate(32, 35);
  bird.draw(ctx, 22);
  document.getElementById('unlock-inline-name').textContent = bird.name;
  card.hidden = false;

  // Equip button
  const equipBtn = document.getElementById('unlock-inline-equip');
  equipBtn.onclick = () => {
    saveSelectedBird(bird.id);
    equipBtn.textContent = 'EQUIPPED';
    equipBtn.disabled = true;
  };

  // Toast the remaining unlocks (they keep the toast behaviour)
  for (let i = 1; i < recent.length; i++) {
    setTimeout(() => showUnlockToast(recent[i]), (i - 1) * 3000);
  }
}

function animateRunSummary({ coins, nearMisses, bestCombo, flaps, durationMs }) {
  populateMenuGlyphs();   // safe re-run; ensures game-over icons render
  const targets = [
    { id: 'sum-coins',  v: coins },
    { id: 'sum-closes', v: nearMisses },
    { id: 'sum-streak', v: bestCombo },
    { id: 'sum-flaps',  v: flaps },
    { id: 'sum-time',   v: durationMs, isTime: true },
  ];
  // Reset to zero so the cascade reads fresh on each game over.
  for (const t of targets) {
    document.getElementById(t.id).textContent = t.isTime ? '0:00' : '0';
  }
  if (!anime) {
    for (const t of targets) {
      document.getElementById(t.id).textContent = formatStat(t);
    }
    return;
  }
  // Stagger each row's value from 0 → target.
  targets.forEach((t, i) => {
    const el = document.getElementById(t.id);
    const obj = { v: 0 };
    anime({
      targets: obj,
      v: t.v,
      duration: 700,
      delay: 200 + i * 90,
      easing: 'easeOutQuad',
      update: () => {
        if (t.isTime) el.textContent = formatTime(obj.v);
        else el.textContent = Math.round(obj.v);
      },
    });
  });
}

function formatStat(t) {
  if (t.isTime) return formatTime(t.v);
  return String(t.v);
}

function formatTime(ms) {
  const total = Math.max(0, Math.round(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
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

  document.getElementById('btn-share').addEventListener('click', openShareModal);
}

function exitToMenu() {
  if (currentGame) { currentGame.stop(); currentGame = null; }
  if (currentEditor?._miniRaf) cancelAnimationFrame(currentEditor._miniRaf);
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
  stopAviaryAnimations();
  show('editor');
  const canvas = document.getElementById('editor-canvas');
  if (currentEditor) currentEditor.stop();
  currentEditor = new Editor(canvas);
  await currentEditor.start(initial);
  document.getElementById('ed-gap').value = currentEditor.gap;
  setTool('add');

  const mini = document.getElementById('ed-mini');
  mini.addEventListener('click', (e) => {
    if (!currentEditor) return;
    const r = mini.getBoundingClientRect();
    const ratio = (e.clientX - r.left) / r.width;
    // Estimate total width: max obstacle X + a buffer
    const xs = currentEditor.obstacles.map(o => o.x);
    const maxX = xs.length ? Math.max(...xs) + 200 : 800;
    currentEditor.scrollX = ratio * maxX;
  });

  // Periodic mini-preview refresh while editor is open
  const renderMini = () => {
    if (!currentEditor) return;
    import('./level-thumbnail.js').then(({ renderLevelThumbnail, difficultyOf }) => {
      const fakeLevel = { obstacles: currentEditor.obstacles, gap: currentEditor.gap };
      renderLevelThumbnail(fakeLevel, mini);
      const metaEl = document.getElementById('ed-meta');
      if (metaEl) metaEl.textContent = `${currentEditor.obstacles.length} pipes · ${difficultyOf(fakeLevel)}`;
    });
    currentEditor._miniRaf = requestAnimationFrame(renderMini);
  };
  if (currentEditor._miniRaf) cancelAnimationFrame(currentEditor._miniRaf);
  currentEditor._miniRaf = requestAnimationFrame(renderMini);
}

function setTool(t) {
  document.querySelectorAll('.tool-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.tool === t);
  });
  currentEditor?.setTool(t);
}

function wireEditor() {
  document.getElementById('ed-back').addEventListener('click', exitToMenu);
  document.getElementById('ed-grid').addEventListener('click', () => {
    if (!currentEditor) return;
    currentEditor.showGrid = !currentEditor.showGrid;
    currentEditor.snapToGrid = currentEditor.showGrid;
  });
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

  document.getElementById('ed-undo').addEventListener('click', () => currentEditor?.undo());
  document.getElementById('ed-redo').addEventListener('click', () => currentEditor?.redo());

  window.addEventListener('keydown', (e) => {
    if (!currentEditor) return;
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
      e.preventDefault();
      if (e.shiftKey) currentEditor.redo();
      else currentEditor.undo();
    }
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
  stopAviaryAnimations();
  refreshLevelsList();
  show('levels');
}

let levelSort = 'newest';

function refreshLevelsList() {
  const list = document.getElementById('levels-list');
  const empty = document.getElementById('levels-empty');
  const levels = loadLevels();
  list.innerHTML = '';
  if (levels.length === 0) { empty.hidden = false; return; }
  empty.hidden = true;

  const sorted = [...levels].sort((a, b) => {
    if (levelSort === 'newest') return (b.lastPlayedAt || 0) - (a.lastPlayedAt || 0);
    if (levelSort === 'best')   return (b.bestScore || 0)   - (a.bestScore || 0);
    if (levelSort === 'hardest') {
      return (a.gap || 999) - (b.gap || 999) || (b.obstacles.length - a.obstacles.length);
    }
    return 0;
  });

  for (const level of sorted) {
    const li = document.createElement('li');
    li.className = 'level-item';
    const thumb = document.createElement('canvas');
    thumb.className = 'level-thumb';
    thumb.width = 64; thumb.height = 48;

    li.appendChild(thumb);
    const meta = document.createElement('div');
    meta.className = 'level-meta';
    const last = level.lastPlayedAt ? new Date(level.lastPlayedAt).toLocaleDateString() : 'Never played';
    meta.innerHTML = `
      <div class="name"></div>
      <div class="stats">${level.obstacles.length} pipes · gap ${level.gap} · <span class="diff"></span> · <span class="best">★ ${level.bestScore || 0}</span> · ${last}</div>
    `;
    meta.querySelector('.name').textContent = level.name;
    li.appendChild(meta);

    const actions = document.createElement('div');
    actions.className = 'level-actions';
    actions.innerHTML = `
      <button class="btn small primary" data-action="play">Play</button>
      <button class="btn small" data-action="edit">Edit</button>
      <button class="btn small" data-action="export">Export</button>
      <button class="btn small ghost" data-action="delete">X</button>
    `;
    li.appendChild(actions);
    list.appendChild(li);

    import('./level-thumbnail.js').then(({ renderLevelThumbnail, difficultyOf }) => {
      renderLevelThumbnail(level, thumb);
      meta.querySelector('.diff').textContent = difficultyOf(level);
    });

    actions.querySelector('[data-action="play"]').addEventListener('click', () => startGame({ mode: 'custom', level }));
    actions.querySelector('[data-action="edit"]').addEventListener('click', () => openEditor(level));
    actions.querySelector('[data-action="export"]').addEventListener('click', () => exportLevel(level));
    actions.querySelector('[data-action="delete"]').addEventListener('click', () => {
      if (!confirm(`Delete "${level.name}"?`)) return;
      deleteLevel(level.name);
      refreshLevelsList();
    });
  }
}

function wireSortChips() {
  document.querySelectorAll('.sort-chip').forEach(c => {
    c.addEventListener('click', () => {
      levelSort = c.dataset.sort;
      document.querySelectorAll('.sort-chip').forEach(o => o.classList.toggle('active', o === c));
      refreshLevelsList();
    });
  });
}

function wireLevels() {
  document.getElementById('lv-back').addEventListener('click', exitToMenu);
}

// ---------- AVIARY ----------
let aviaryRafId = null;
let aviaryStartTime = 0;
let aviaryTiles = []; // [{ ctx, entry, phase, photoImg }]

function openAviary() {
  stopTipRotator();
  stopHeroBird();
  stopAviaryAnimations();
  renderAviary();
  show('aviary');
}

function wireAviary() {
  document.getElementById('av-back').addEventListener('click', exitToMenu);
}

// ---------- SETTINGS ----------
function openSettings() {
  stopTipRotator();
  stopHeroBird();
  stopAviaryAnimations();
  show('settings');
  refreshSettingsControls();
}

function refreshSettingsControls() {
  document.getElementById('set-volume').value = settings.get('volume');
  for (const key of ['muted', 'haptics', 'scanlines', 'grain']) {
    const btn = document.querySelector(`.pix-toggle[data-key="${key}"]`);
    if (btn) btn.setAttribute('aria-pressed', String(!!settings.get(key)));
  }
  document.getElementById('set-reducedMotion').value = String(settings.get('reducedMotion'));
  document.getElementById('set-themeLock').value = settings.get('themeLock');
}

function wireSettings() {
  document.getElementById('settings-back').addEventListener('click', exitToMenu);
  document.getElementById('btn-settings').addEventListener('click', openSettings);

  document.getElementById('set-volume').addEventListener('input', (e) => {
    settings.set('volume', Number(e.target.value));
    if (audio.setGain) audio.setGain(Number(e.target.value));
  });

  document.querySelectorAll('.pix-toggle').forEach(btn => {
    btn.addEventListener('click', () => {
      const key = btn.dataset.key;
      const cur = settings.get(key);
      settings.set(key, !cur);
      btn.setAttribute('aria-pressed', String(!cur));
      if (key === 'muted') audio.setMuted(!cur);
    });
  });

  document.getElementById('set-reducedMotion').addEventListener('change', (e) => {
    const v = e.target.value;
    settings.set('reducedMotion', v === 'true' ? true : v === 'false' ? false : 'auto');
  });

  document.getElementById('set-themeLock').addEventListener('change', (e) => {
    settings.set('themeLock', e.target.value);
  });

  document.getElementById('settings-reset').addEventListener('click', () => {
    if (!confirm('Reset EVERYTHING — photos, levels, unlocks, settings?')) return;
    localStorage.clear();
    settings.reset();
    location.reload();
  });
}

function stopAviaryAnimations() {
  if (aviaryRafId) cancelAnimationFrame(aviaryRafId);
  aviaryRafId = null;
  aviaryTiles = [];
}

function startAviaryAnimations() {
  if (aviaryRafId) cancelAnimationFrame(aviaryRafId);
  aviaryStartTime = performance.now();
  const tick = (now) => {
    aviaryRafId = requestAnimationFrame(tick);
    const t = (now - aviaryStartTime) / 1000;
    for (const tile of aviaryTiles) {
      paintAnimatedTile(tile, t);
    }
  };
  aviaryRafId = requestAnimationFrame(tick);
}

function paintAnimatedTile(tile, t) {
  const { ctx, entry, phase } = tile;
  const size = 80;
  const r = 26;
  // Clear in identity transform so we don't accumulate the per-frame transforms.
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  const dpr = window.devicePixelRatio || 1;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const bob = Math.sin(t * 2.2 + phase) * 3;
  ctx.translate(size / 2, size / 2 + 4 + bob);
  if (entry.isPhoto) {
    if (tile.photoImg) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.clip();
      const img = tile.photoImg;
      const scale = Math.max((r * 2) / img.width, (r * 2) / img.height);
      const w = img.width * scale, h = img.height * scale;
      ctx.drawImage(img, -w / 2, -h / 2, w, h);
      ctx.restore();
      ctx.strokeStyle = '#ffd166';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.stroke();
    }
  } else if (entry.bird) {
    const flap = 0.5 + 0.5 * Math.sin(t * 5.5 + phase);
    drawWing(ctx, r, flap, entry.bird.wingFill, entry.bird.wingStroke);
    entry.bird.draw(ctx, r);
  }
  if (tile.selected) {
    // 4 sparkles orbiting
    const sparkles = 4;
    for (let i = 0; i < sparkles; i++) {
      const a = t * 1.2 + i * (Math.PI * 2 / sparkles);
      const orbit = r + 10 + Math.sin(t * 2 + i) * 3;
      const sx = Math.cos(a) * orbit;
      const sy = Math.sin(a) * orbit;
      ctx.save();
      ctx.translate(sx, sy);
      ctx.fillStyle = '#ffd166';
      ctx.beginPath();
      // 4-point diamond sparkle
      ctx.moveTo(0, -4); ctx.lineTo(2, 0); ctx.lineTo(0, 4); ctx.lineTo(-2, 0);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
  }
}

function renderAviary() {
  stopAviaryAnimations();
  const grid = document.getElementById('aviary-grid');
  const progressEl = document.getElementById('aviary-progress');
  grid.innerHTML = '';
  const unlockedIds = new Set(loadUnlocked());
  const selectedId = loadSelectedBird();
  const photoUrl = loadPhotos().bird;

  const allEntries = [];
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

  function makeCard(entry, index) {
    const card = document.createElement('div');
    card.className = 'bird-card';
    if (!entry.unlocked) card.classList.add('locked');
    if (entry.id === selectedId) card.classList.add('selected');

    const tileCanvas = document.createElement('canvas');
    const dpr = window.devicePixelRatio || 1;
    tileCanvas.width = 80 * dpr;
    tileCanvas.height = 80 * dpr;
    card.appendChild(tileCanvas);

    const tile = {
      ctx: tileCanvas.getContext('2d'),
      entry,
      phase: index * 0.43,
      photoImg: null,
      selected: entry.id === selectedId,
    };
    if (entry.isPhoto) {
      loadImageFromUrl(entry.photoUrl).then(img => { tile.photoImg = img; });
    }
    aviaryTiles.push(tile);

    const name = document.createElement('div');
    name.className = 'bird-name';
    name.textContent = entry.name;
    card.appendChild(name);

    const cond = document.createElement('div');
    cond.className = 'bird-cond';
    cond.textContent = entry.unlocked ? entry.desc : (entry.bird ? unlockText(entry.bird.unlock) : '');
    card.appendChild(cond);

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

    // Tilt (from Task 5.1)
    let tiltRaf = 0;
    card.addEventListener('pointermove', (e) => {
      const r = card.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width;
      const y = (e.clientY - r.top) / r.height;
      const rx = (0.5 - y) * 8;
      const ry = (x - 0.5) * 8;
      cancelAnimationFrame(tiltRaf);
      tiltRaf = requestAnimationFrame(() => {
        card.style.transform = `rotateX(${rx}deg) rotateY(${ry}deg)`;
      });
    });
    card.addEventListener('pointerleave', () => {
      cancelAnimationFrame(tiltRaf);
      card.style.transform = '';
    });
  }

  const groups = { face: [], earned: [], locked: [] };
  for (const e of allEntries) {
    if (e.isPhoto) groups.face.push(e);
    else if (e.unlocked) groups.earned.push(e);
    else groups.locked.push(e);
  }
  const order = [
    { key: 'face',   label: 'YOUR FACE' },
    { key: 'earned', label: 'EARNED' },
    { key: 'locked', label: 'LOCKED' },
  ];

  let idx = 0;
  for (const { key, label } of order) {
    if (!groups[key].length) continue;
    const h = document.createElement('div');
    h.className = 'aviary-group-header';
    h.textContent = label;
    grid.appendChild(h);
    for (const entry of groups[key]) {
      makeCard(entry, idx++);
    }
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

  startAviaryAnimations();
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

async function populateMenuGlyphs() {
  const { iconSvg } = await import('./icons.js');
  document.querySelectorAll('[data-glyph]').forEach(el => {
    el.innerHTML = '';
    el.appendChild(iconSvg(el.dataset.glyph));
  });
}

// ---------- INIT ----------
function init() {
  installUiFx();
  audio.setMuted(settings.get('muted'));
  audio.ensureContext();
  if (audio.setGain) audio.setGain(settings.get('volume'));
  bootstrapUnlocks();
  wireUploads();
  wireMenuNav();
  wireCatTiles();
  wireCustomizeDrawer();
  wireMenuImport();
  populateMenuGlyphs();
  wirePlayHud();
  wireEditor();
  wireLevels();
  wireSortChips();
  wireAviary();
  wireSettings();
  wireButtonSounds();
  wireTitleEasterEgg();
  onUnlock((birds) => {
    const overlay = document.getElementById('overlay-gameover');
    const inGame = currentGame && overlay.hidden;
    if (inGame) return;   // will be shown via consumeRecentUnlocks() on game-over
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
  import('./intro.js').then(({ maybeShowIntro }) => maybeShowIntro({}));
}

init();
