# Flappy Face v2 UI Overhaul — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform Flappy Face from a polished mobile arcade game into a fully-committed pixel-art arcade-cabinet experience across every screen, adding Settings, first-run Intro, letter-grade game-over, share cards, and richer Editor/Levels/Aviary screens — all without introducing a build step.

**Architecture:** Single vanilla-JS ES-modules app served as static files. New modules slot beside existing ones (`js/ui-fx.js`, `js/grading.js`, `js/share-card.js`, `js/level-thumbnail.js`, `js/settings.js`, `js/transitions.js`, `js/intro.js`, `js/icons.js`). `style.css` splits into themed partials concatenated via `@import`. State persists in `localStorage` under the existing `ff.*` namespace plus three new keys.

**Tech Stack:** Vanilla ES modules, HTML5 Canvas 2D, CSS3 (with `@import` partials), Web Audio API, `anime.js` (CDN, kept), `localStorage`.

**Source-of-truth spec:** `docs/superpowers/specs/2026-05-24-ui-overhaul-design.md`. When a task references "spec §X.Y" it points there.

**Test approach:** This project has no test runner and adding one is out of scope. Verification is:
- **Pure modules** (`grading.js`, `level-thumbnail.js#difficultyOf`, `settings.js`) — inline browser-console assertion snippets included in each task. Run by pasting into DevTools console at `http://localhost:8765/` and confirming `OK` lines print.
- **UI work** — manual browser verification on Chrome desktop (1280×800) and DevTools mobile emulation (iPhone SE, 375×667). Specific steps to follow are listed per task.

**Dev server:** Run `py -m http.server 8765` from the project root, then visit `http://localhost:8765/`. Hard-refresh with `Ctrl+Shift+R` after each task to bypass cache.

---

## File Structure

### New files (created in this plan)

| Path | Responsibility |
|---|---|
| `js/settings.js` | Settings store with subscribers, defaults, localStorage migration. |
| `js/ui-fx.js` | CRT scanline overlay, dither-grain overlay, confetti spawn helper, stamp-reveal helper, element shake. |
| `js/transitions.js` | Wraps screen-switching with pixel-dissolve wipe + opacity-fade fallback. |
| `js/grading.js` | Pure `gradeRun()` function + threshold constants. |
| `js/share-card.js` | Off-screen canvas renderer producing a downloadable/copyable 1080×1350 PNG. |
| `js/level-thumbnail.js` | `renderLevelThumbnail(level, canvas)` + `difficultyOf(level)`. |
| `js/intro.js` | First-run 4-slide tap-through overlay; sets `ff.intro.seen`. |
| `js/icons.js` | Inline-SVG + canvas-drawn glyph library replacing emoji in chrome. |
| `style/_tokens.css` | `:root` vars + font imports. |
| `style/_base.css` | Resets, body, screen visibility system. |
| `style/_chrome.css` | Shared pixel-border/button/icon mixins. |
| `style/_menu.css` | Menu hub layout, hero, category tiles, customize drawer, stats ribbon. |
| `style/_play.css` | HUD, combo meter, coin/near-miss counters, overlays, game-over with grade. |
| `style/_editor.css` | Editor toolbars, grid overlay, mini-preview, undo. |
| `style/_levels.css` | Levels list rows with thumbnails, sort/filter chips. |
| `style/_aviary.css` | Aviary tiles, tilt, sparkles, group headers, progress bars. |
| `style/_settings.css` | Settings screen layout + control styles. |
| `style/_modals.css` | Save/share/reset modals. |
| `style/_intro.css` | First-run intro overlay. |
| `style/_fx.css` | CRT, grain, pixel-wipe layer styles. |

### Existing files modified

| Path | Reason |
|---|---|
| `index.html` | New menu DOM (hub tiles, drawer, ribbon, gear btn), settings + intro screens, new game-over markup (grade, share btn, inline unlock), updated HUD (combo meter, counters), updated editor toolbar (grid, undo, mini-preview, difficulty), updated levels list scaffolding, share modal. |
| `style.css` | Becomes a one-line `@import` index pointing at `style/*.css` partials. |
| `js/main.js` | Wires up new modules; menu DOM bindings replaced; uses `transitions.transition()` instead of direct `show()`. Target shrinks from 833 → ~400 lines. |
| `js/game.js` | Emits `onCombo`, `onCoin`, `onNearMiss` callbacks (for live HUD). Honors theme-lock from settings. |
| `js/scene.js` | `pickTheme()` accepts an override argument. |
| `js/storage.js` | Adds level-schema migration (lastPlayedAt, bestScore, playCount); adds settings load/save helpers (or re-exports from `settings.js`). |
| `js/editor.js` | Snap-to-grid, undo/redo stack, scroll-jump from mini-preview, difficulty meta. |
| `js/achievements.js` | Surface "last unlock(s) this run" via `consumeRecentUnlocks()` for inline unlock card. |

---

## Phases

Phases ship independently. Each phase ends with a commit and is a valid stopping point. After Phase 1, the app should boot and look basically the same (Foundation is invisible scaffolding); from Phase 2 onward visible changes accumulate.

- Phase 1: Foundation (settings, ui-fx, transitions, icons, CSS reorg, font promotion, CRT/grain)
- Phase 2: Menu hub
- Phase 3: Play HUD + Game-over (grade, confetti, inline unlock, share card)
- Phase 4: Settings + Intro
- Phase 5: Aviary + Levels + Editor polish
- Phase 6: Transitions everywhere + final polish + reduced-motion verification

---

# PHASE 1 — FOUNDATION

The goal of Phase 1 is to install the cross-cutting systems and styling tokens that every later phase consumes. After Phase 1, the game must boot exactly as today; no visible changes except the CRT/grain overlay if enabled by default.

## Task 1.1: Create CSS partials directory + token file

**Files:**
- Create: `style/_tokens.css`

- [ ] **Step 1: Create the partials directory and the tokens file**

Create `style/_tokens.css`:

```css
/* style/_tokens.css — design tokens (colors, fonts, radii, shadows) */

:root {
  /* Backgrounds */
  --bg:        #1a1a2e;
  --bg-2:      #16213e;
  --bg-3:      #0e1729;
  --midnight:  #0d1b3d;
  --frame-dark:  #1a1a2e;
  --frame-light: #f7f7ff;

  /* Sky (kept from v1) */
  --sky-top:    #5eb3d6;
  --sky-mid:    #8fd1e8;
  --sky-bottom: #d2eef4;

  /* Accents */
  --accent:    #ffd166;  /* amber */
  --accent-2:  #ef476f;  /* pink */
  --accent-3:  #06d6a0;  /* mint */
  --sunset:    #ff8c42;

  /* Text */
  --text:  #f7f7ff;
  --muted: #a8a8c0;
  --ink:   #1d2b4a;

  /* Surfaces */
  --panel:        rgba(20, 20, 40, 0.85);
  --panel-light:  rgba(255, 255, 255, 0.55);

  /* Pixel-frame shadow stack (used by buttons/frames) */
  --pix-shadow-1: 0 4px 0 rgba(0,0,0,0.45);
  --pix-shadow-2: 0 4px 0 rgba(0,0,0,0.45), inset 0 2px 0 rgba(255,255,255,0.15);
  --pix-shadow-3: 0 4px 0 rgba(0,0,0,0.45), inset 0 2px 0 rgba(255,255,255,0.15), 0 0 0 4px var(--frame-dark);

  /* Sizing */
  --tap: 44px;

  /* Fonts (loaded in index.html) */
  --font-display: 'Bungee', 'Press Start 2P', 'Arial Black', system-ui, sans-serif;
  --font-pixel:   'Press Start 2P', 'VT323', monospace;
  --font-game:    'Jersey 25', 'Bungee', 'Trebuchet MS', system-ui, sans-serif;

  /* Z-layers */
  --z-overlay:    3;
  --z-modal:      10;
  --z-toast:      50;
  --z-crt:        80;
  --z-grain:      81;
  --z-transition: 90;
  --z-intro:      95;
}
```

- [ ] **Step 2: Verify the file exists**

Run: `ls style/_tokens.css`
Expected: prints the path.

- [ ] **Step 3: Commit**

```bash
git add style/_tokens.css
git commit -m "Add CSS tokens partial for UI overhaul"
```

---

## Task 1.2: Split style.css into partials (base, chrome, fx)

**Files:**
- Create: `style/_base.css`, `style/_chrome.css`, `style/_fx.css`
- (we'll create the screen-specific partials in later tasks; they start empty here)

- [ ] **Step 1: Create `style/_base.css`**

```css
/* style/_base.css — resets, body, screen visibility system */

* { box-sizing: border-box; }

html, body {
  margin: 0;
  padding: 0;
  height: 100%;
  width: 100%;
  overflow: hidden;
  background: var(--bg);
  color: var(--text);
  font-family: var(--font-game);
  -webkit-font-smoothing: antialiased;
  user-select: none;
  -webkit-tap-highlight-color: transparent;
  overscroll-behavior: none;
  image-rendering: pixelated;
}

body { display: flex; flex-direction: column; }

.screen {
  position: fixed;
  inset: 0;
  display: flex;
  flex-direction: column;
  padding: env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left);
  opacity: 0;
  visibility: hidden;
  pointer-events: none;
  transition: opacity 0.32s ease, visibility 0s 0.32s;
}
.screen.active {
  opacity: 1;
  visibility: visible;
  pointer-events: auto;
  transition: opacity 0.32s ease, visibility 0s 0s;
}

button:focus-visible,
[role="button"]:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

- [ ] **Step 2: Create `style/_chrome.css` (shared pixel-frame button/border styles)**

```css
/* style/_chrome.css — pixel-frame buttons, frames, icon glyph classes */

.btn {
  min-height: var(--tap);
  padding: 12px 20px;
  border-radius: 4px;
  border: 3px solid var(--frame-dark);
  background: var(--bg-2);
  color: var(--text);
  font-family: var(--font-pixel);
  font-size: 14px;
  letter-spacing: 1.5px;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  box-shadow: var(--pix-shadow-2);
  text-transform: uppercase;
  transition: transform 0.06s ease, background 0.15s ease, box-shadow 0.1s ease;
  position: relative;
}
.btn:hover { transform: translateY(-1px); }
.btn:active {
  transform: translateY(3px);
  box-shadow: 0 1px 0 rgba(0,0,0,0.45), inset 0 2px 0 rgba(255,255,255,0.15);
}
.btn.primary {
  background: var(--accent);
  color: var(--ink);
  border-color: #a8782e;
  box-shadow: 0 4px 0 #a8782e, inset 0 2px 0 rgba(255,255,255,0.35), 0 0 24px rgba(255, 209, 102, 0.35);
}
.btn.primary:active { box-shadow: 0 1px 0 #a8782e, inset 0 2px 0 rgba(255,255,255,0.35); }
.btn.big {
  font-size: 18px;
  letter-spacing: 3px;
  min-height: 60px;
  animation: btn-pulse 2.4s ease-in-out infinite;
}
.btn.ghost {
  background: rgba(29, 43, 74, 0.15);
  color: var(--ink);
  border-color: rgba(29, 43, 74, 0.4);
  box-shadow: none;
  font-size: 12px;
  min-height: 38px;
}
.btn.ghost:active { transform: scale(0.97); box-shadow: none; }
.btn.small { min-height: 36px; padding: 6px 14px; font-size: 11px; letter-spacing: 0.5px; }

@keyframes btn-pulse {
  0%, 100% { box-shadow: 0 4px 0 #a8782e, inset 0 2px 0 rgba(255,255,255,0.35), 0 0 24px rgba(255, 209, 102, 0.35); }
  50%      { box-shadow: 0 4px 0 #a8782e, inset 0 2px 0 rgba(255,255,255,0.35), 0 0 36px rgba(255, 209, 102, 0.65); }
}

/* Pixel-frame card (used by stats ribbon, settings sections, etc.) */
.pix-frame {
  background: var(--panel-light);
  border: 3px solid var(--frame-dark);
  border-radius: 4px;
  padding: 12px 14px;
  box-shadow: var(--pix-shadow-1);
}

/* Icon container — keeps DPR-clean square glyphs */
.icon {
  display: inline-flex;
  width: 1em;
  height: 1em;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.icon svg { width: 100%; height: 100%; display: block; }
```

- [ ] **Step 3: Create `style/_fx.css` (CRT, grain, wipe layers)**

```css
/* style/_fx.css — CRT, grain, screen-wipe layers */

.crt-overlay {
  position: fixed;
  inset: 0;
  z-index: var(--z-crt);
  pointer-events: none;
  background-image: repeating-linear-gradient(
    to bottom,
    rgba(0,0,0,0.18) 0px,
    rgba(0,0,0,0.18) 1px,
    transparent 2px,
    transparent 3px
  );
  opacity: 0;
  transition: opacity 0.3s ease;
  mix-blend-mode: multiply;
}
body.fx-scanlines .crt-overlay { opacity: 0.35; }

.grain-overlay {
  position: fixed;
  inset: 0;
  z-index: var(--z-grain);
  pointer-events: none;
  opacity: 0;
  transition: opacity 0.3s ease;
  mix-blend-mode: overlay;
  /* background-image set by ui-fx.js at runtime (data URL of noise canvas) */
}
body.fx-grain .grain-overlay { opacity: 0.10; }

@media (prefers-reduced-motion: reduce) {
  body.fx-scanlines .crt-overlay,
  body.fx-grain .grain-overlay { opacity: 0 !important; }
}

.transition-layer {
  position: fixed;
  inset: 0;
  z-index: var(--z-transition);
  pointer-events: none;
  display: none;
}
.transition-layer.active { display: block; }
.transition-layer canvas { width: 100%; height: 100%; display: block; }
```

- [ ] **Step 4: Verify all three files exist**

Run: `ls style/_base.css style/_chrome.css style/_fx.css`
Expected: three paths printed.

- [ ] **Step 5: Commit**

```bash
git add style/_base.css style/_chrome.css style/_fx.css
git commit -m "Add base, chrome, fx CSS partials"
```

---

## Task 1.3: Create empty per-screen CSS partials

These will be populated in their respective phases. Creating them now lets the import index land in one shot.

**Files:**
- Create: `style/_menu.css`, `style/_play.css`, `style/_editor.css`, `style/_levels.css`, `style/_aviary.css`, `style/_settings.css`, `style/_modals.css`, `style/_intro.css`

- [ ] **Step 1: Create each file with a header comment**

For each filename above, create a file containing just:

```css
/* style/_<NAME>.css — populated in its respective phase */
```

Replace `<NAME>` with the screen name. Example for `_menu.css`:

```css
/* style/_menu.css — populated in Phase 2 */
```

- [ ] **Step 2: Verify all eight files exist**

Run: `ls style/_menu.css style/_play.css style/_editor.css style/_levels.css style/_aviary.css style/_settings.css style/_modals.css style/_intro.css`
Expected: eight paths printed.

- [ ] **Step 3: Commit**

```bash
git add style/_menu.css style/_play.css style/_editor.css style/_levels.css style/_aviary.css style/_settings.css style/_modals.css style/_intro.css
git commit -m "Stub remaining CSS partials"
```

---

## Task 1.4: Replace style.css with an @import index pointing at all partials

**Files:**
- Modify: `style.css` (full rewrite)

- [ ] **Step 1: Replace the entire contents of `style.css`**

Replace `style.css` with:

```css
/* style.css — index for partials. Edit the matching style/_*.css file. */

@import url('./style/_tokens.css');
@import url('./style/_base.css');
@import url('./style/_chrome.css');
@import url('./style/_fx.css');

@import url('./style/_menu.css');
@import url('./style/_play.css');
@import url('./style/_editor.css');
@import url('./style/_levels.css');
@import url('./style/_aviary.css');
@import url('./style/_settings.css');
@import url('./style/_modals.css');
@import url('./style/_intro.css');
```

- [ ] **Step 2: Start the dev server in a separate terminal and open the app**

In a separate terminal: `py -m http.server 8765`
Then open `http://localhost:8765/` and hard-refresh (`Ctrl+Shift+R`).

Expected: app boots. Title visible. Background sky gradient visible. The menu screen will look *broken* (no menu-specific styles left yet — they'll come back in Phase 2). This is expected mid-Phase-1. **Specifically: title and buttons render in default browser styles, no layout** — that's fine.

If you see no fonts loading, check Network tab — `@import` requests should be `200`.

- [ ] **Step 3: Migrate any remaining unsplit styles into the appropriate partial**

The previous `style.css` had styles for every screen. Open the old version (from git history): `git show HEAD~1:style.css | less`.

Copy each block into the correct partial:
- `#screen-menu`, `.menu-inner`, `.ambient-cloud`, `.hero-bird-*`, `.title*`, `.subtitle`, `.upload-*`, `.thumb*`, `.menu-buttons`, `.highscore`, `.stats-card`, `.tip` → `style/_menu.css`
- `#screen-play`, `#game-canvas`, `.hud*`, `.score`, `.overlay*`, `.score-row`, `.score-label`, `.score-value`, `.run-summary`, `.run-stat*`, `.new-best-badge`, `@keyframes new-best-pulse` → `style/_play.css`
- `#screen-editor`, `#editor-canvas`, `.editor-toolbar*`, `.ed-tool-group`, `.tool-btn`, `.slider-label` → `style/_editor.css`
- `#screen-levels`, `.screen-header`, `.levels-list`, `.level-item*`, `.empty-msg` → `style/_levels.css`
- `#screen-aviary`, `.aviary-*`, `.bird-card*`, `@keyframes tile-selected-pulse` → `style/_aviary.css`
- `.unlock-toast*` → `style/_modals.css`
- `.modal*` → `style/_modals.css`

Keep `.btn`-related styles in `_chrome.css` (already there from Task 1.2 — verify no duplicates remain).

- [ ] **Step 4: Hard-refresh and verify the app looks identical to before**

In the browser: Hard-refresh. Click through Menu → Play → Editor → Levels → Aviary → Settings doesn't exist yet.

Expected: every existing screen looks pixel-identical to v1. If any screen looks wrong, you missed a block in step 3 — search the v1 file (`git show HEAD~3:style.css`, adjusting depth as needed) for the broken selector and move it.

- [ ] **Step 5: Commit**

```bash
git add style.css style/
git commit -m "Migrate style.css into split partials"
```

---

## Task 1.5: Create js/settings.js with defaults, subscribers, migration

**Files:**
- Create: `js/settings.js`

- [ ] **Step 1: Create the module**

```js
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
```

- [ ] **Step 2: Inline browser-console test**

Hard-refresh and open DevTools console. Paste:

```js
const { settings, DEFAULTS, isReducedMotion } = await import('./js/settings.js');

// Defaults present
console.assert(settings.get('volume') === DEFAULTS.volume, 'default volume');
console.assert(settings.get('themeLock') === 'auto', 'default themeLock');

// Set + persist + reload
settings.set('volume', 0.42);
const reload = await import('./js/settings.js?bust=' + Date.now());
console.assert(reload.settings.get('volume') === 0.42, 'persisted across import');
reload.settings.reset();
console.assert(reload.settings.get('volume') === DEFAULTS.volume, 'reset works');

// Subscribers fire
let lastSeen = null;
const off = settings.subscribe('scanlines', v => { lastSeen = v; });
settings.set('scanlines', false);
console.assert(lastSeen === false, 'subscriber fired');
off();
settings.set('scanlines', true);
console.assert(lastSeen === false, 'unsubscribed');

// Unknown key throws
let threw = false;
try { settings.get('nope'); } catch { threw = true; }
console.assert(threw, 'unknown key throws');

// isReducedMotion returns a boolean
console.assert(typeof isReducedMotion() === 'boolean', 'isReducedMotion bool');

console.log('OK settings.js');
```

Expected: a single `OK settings.js` line, no `Assertion failed` errors.

- [ ] **Step 3: Commit**

```bash
git add js/settings.js
git commit -m "Add settings module with persistence and subscribers"
```

---

## Task 1.6: Create js/icons.js with SVG + canvas glyphs

**Files:**
- Create: `js/icons.js`

- [ ] **Step 1: Create the module**

```js
// js/icons.js — chunky pixel glyphs replacing emoji in UI chrome.
//
// iconSvg(name): returns an HTMLElement <span class="icon"> containing an inline SVG.
// iconCanvas(name, ctx, size, color): draws into the given 2D context centered at (0,0).

const VIEW = 16; // 16x16 design grid for pixel-perfect look

const PATHS = {
  // Each entry is an array of <path d="..."> strings rendered in the current color.
  coin:      ['M5 3h6v1h1v1h1v6h-1v1h-1v1H5v-1H4v-1H3V5h1V4h1V3z M6 6h4v4H6V6z'],
  near:      ['M7 2h2v7H7V2z M7 11h2v2H7v-2z'],
  flame:     ['M8 2l2 3-1 1 2 2-1 2 2 2-3 2H7L4 12l2-2-1-2 2-2-1-1 2-3z'],
  runs:      ['M4 3v10l8-5z'],
  skull:     ['M5 3h6v1h1v6h-2v3H6v-3H4V4h1V3z M6 6h1v2H6V6z M9 6h1v2H9V6z'],
  gear:      ['M7 1h2v2h1l2-1 1 1-1 2 1 1 2 0v2l-2 0-1 1 1 2-1 1-2-1-1 1v2H7v-2l-1-1-2 1-1-1 1-2-1-1H1V8h2l1-1-1-2 1-1 2 1 1-1V1z M7 6h2v4H7V6z'],
  close:     ['M3 3l4 4-4 4 1 1 4-4 4 4 1-1-4-4 4-4-1-1-4 4-4-4z'],
  pause:     ['M4 3h3v10H4V3z M9 3h3v10H9V3z'],
  speaker:   ['M8 3L5 6H3v4h2l3 3V3z'],
  speakerX:  ['M8 3L5 6H3v4h2l3 3V3z M11 6l3 3 M14 6l-3 3'],
  sparkle:   ['M8 2v4l3-1-1 3h4l-4 1 1 3-3-1v4l-1-4-3 1 1-3H1l4-1-1-3 3 1V2z'],
  lock:      ['M5 7V5a3 3 0 0 1 6 0v2h1v6H4V7h1z M7 5a1 1 0 0 0-1 0v2h2V5a1 1 0 0 0-1 0z'],
  share:     ['M11 2L8 5h2v5h2V5h2l-3-3z M3 8v6h10V8h-2v4H5V8H3z'],
  undo:      ['M5 4v2H2l4 4 4-4H7V4H5z M2 11h12v2H2z'],
  redo:      ['M11 4v2h3l-4 4-4-4h3V4h2z M2 11h12v2H2z'],
  grid:      ['M3 3h10v10H3V3z M3 7h10 M3 11h10 M7 3v10 M11 3v10'],
};

const NEEDS_STROKE = new Set(['speakerX', 'grid']);

export function iconSvg(name, opts = {}) {
  const color = opts.color || 'currentColor';
  const size  = opts.size || '1em';
  const paths = PATHS[name];
  if (!paths) throw new Error(`Unknown icon: ${name}`);
  const stroke = NEEDS_STROKE.has(name);
  const span = document.createElement('span');
  span.className = 'icon';
  span.setAttribute('aria-hidden', 'true');
  if (opts.title) span.setAttribute('aria-label', opts.title);
  span.style.width = size;
  span.style.height = size;
  span.innerHTML = `
    <svg viewBox="0 0 ${VIEW} ${VIEW}" xmlns="http://www.w3.org/2000/svg">
      ${paths.map(d =>
        stroke
          ? `<path d="${d}" fill="none" stroke="${color}" stroke-width="1" />`
          : `<path d="${d}" fill="${color}" />`
      ).join('')}
    </svg>`;
  return span;
}

// Draws the icon into the given 2D context, with the icon centered at the current origin.
// `size` is the bounding pixel size; `color` may be any fillStyle value.
export function iconCanvas(name, ctx, size, color = '#ffd166') {
  const paths = PATHS[name];
  if (!paths) throw new Error(`Unknown icon: ${name}`);
  // SVG path => Path2D
  ctx.save();
  ctx.fillStyle = color;
  ctx.strokeStyle = color;
  ctx.lineWidth = 1;
  ctx.translate(-size / 2, -size / 2);
  ctx.scale(size / VIEW, size / VIEW);
  for (const d of paths) {
    const p = new Path2D(d);
    if (NEEDS_STROKE.has(name)) ctx.stroke(p); else ctx.fill(p);
  }
  ctx.restore();
}
```

- [ ] **Step 2: Inline browser-console test**

Paste into the console:

```js
const icons = await import('./js/icons.js?bust=' + Date.now());

// Every named icon resolves to an SVG element
const names = ['coin','near','flame','runs','skull','gear','close','pause','speaker','speakerX','sparkle','lock','share','undo','redo','grid'];
for (const n of names) {
  const el = icons.iconSvg(n);
  console.assert(el.querySelector('svg'), `icon ${n} renders svg`);
}

// Bogus name throws
let threw = false;
try { icons.iconSvg('nope'); } catch { threw = true; }
console.assert(threw, 'unknown icon throws');

// Canvas drawing doesn't throw
const cnv = document.createElement('canvas');
cnv.width = cnv.height = 32;
const ctx = cnv.getContext('2d');
ctx.translate(16, 16);
icons.iconCanvas('coin', ctx, 32, '#ffd166');

console.log('OK icons.js');
```

Expected: `OK icons.js`.

- [ ] **Step 3: Commit**

```bash
git add js/icons.js
git commit -m "Add icons module replacing emoji in chrome"
```

---

## Task 1.7: Create js/ui-fx.js with CRT, grain, helpers

**Files:**
- Create: `js/ui-fx.js`

- [ ] **Step 1: Create the module**

```js
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
```

- [ ] **Step 2: Add the shake keyframes to `style/_fx.css`**

Append to `style/_fx.css`:

```css
.fx-shake {
  animation: fx-shake 350ms cubic-bezier(.36,.07,.19,.97) both;
}
@keyframes fx-shake {
  10%, 90%  { transform: translateX(-1px); }
  20%, 80%  { transform: translateX(2px); }
  30%, 50%, 70% { transform: translateX(-4px); }
  40%, 60%  { transform: translateX(4px); }
}
@media (prefers-reduced-motion: reduce) {
  .fx-shake { animation: none; }
}
```

- [ ] **Step 3: Inline browser-console verification**

Paste into the console:

```js
const fx = await import('./js/ui-fx.js?bust=' + Date.now());
fx.installUiFx();

// CRT + grain overlays exist
console.assert(document.querySelector('.crt-overlay'), 'crt overlay installed');
console.assert(document.querySelector('.grain-overlay'), 'grain overlay installed');

// Class reflects current settings
const { settings } = await import('./js/settings.js');
settings.set('scanlines', true);
console.assert(document.body.classList.contains('fx-scanlines'), 'scanlines class toggled on');
settings.set('scanlines', false);
console.assert(!document.body.classList.contains('fx-scanlines'), 'scanlines class toggled off');
settings.set('scanlines', true);

// Visual check: scanlines should now be visibly faintly tiled across the screen.
console.log('OK ui-fx.js — visually confirm faint scanlines + grain over the page');
```

Visually confirm: faint horizontal scanlines + grain texture over the entire page.

- [ ] **Step 4: Commit**

```bash
git add js/ui-fx.js style/_fx.css
git commit -m "Add ui-fx module with CRT, grain, shake, stamp helpers"
```

---

## Task 1.8: Create js/transitions.js (pixel-wipe + opacity-fade)

**Files:**
- Create: `js/transitions.js`

- [ ] **Step 1: Create the module**

```js
// js/transitions.js — screen-to-screen transition runner.
// Replaces the direct .classList.toggle('active') flip with a pixel-dissolve wipe.

import { isReducedMotion } from './settings.js';

const TILE_SIZE = 32;

let layer = null;
let layerCanvas = null;

function ensureLayer() {
  if (layer) return;
  layer = document.createElement('div');
  layer.className = 'transition-layer';
  layerCanvas = document.createElement('canvas');
  layer.appendChild(layerCanvas);
  document.body.appendChild(layer);
}

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = (Math.random() * (i + 1)) | 0;
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function tileList(w, h) {
  const cols = Math.ceil(w / TILE_SIZE);
  const rows = Math.ceil(h / TILE_SIZE);
  const tiles = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      tiles.push({ x: c * TILE_SIZE, y: r * TILE_SIZE });
    }
  }
  return shuffle(tiles);
}

function fillPhase(ctx, tiles, ratio) {
  ctx.fillStyle = '#0d1b3d';
  const count = Math.floor(tiles.length * ratio);
  for (let i = 0; i < count; i++) {
    const t = tiles[i];
    ctx.fillRect(t.x, t.y, TILE_SIZE, TILE_SIZE);
  }
}

function revealPhase(ctx, tiles, ratio, w, h) {
  ctx.fillStyle = '#0d1b3d';
  ctx.fillRect(0, 0, w, h);
  ctx.clearRect(0, 0, 0, 0); // reset state
  const count = Math.floor(tiles.length * ratio);
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = '#0d1b3d';
  for (let i = count; i < tiles.length; i++) {
    const t = tiles[i];
    ctx.fillRect(t.x, t.y, TILE_SIZE, TILE_SIZE);
  }
}

async function pixelWipe(swapFn) {
  ensureLayer();
  const w = window.innerWidth;
  const h = window.innerHeight;
  layerCanvas.width = w;
  layerCanvas.height = h;
  layer.classList.add('active');
  const ctx = layerCanvas.getContext('2d');
  const tiles = tileList(w, h);
  const DURATION_FILL = 180;
  const DURATION_REVEAL = 180;

  // FILL phase
  await new Promise(resolve => {
    const start = performance.now();
    const tick = (now) => {
      const t = Math.min(1, (now - start) / DURATION_FILL);
      ctx.clearRect(0, 0, w, h);
      fillPhase(ctx, tiles, t);
      if (t < 1) requestAnimationFrame(tick);
      else resolve();
    };
    requestAnimationFrame(tick);
  });

  // Swap screens (DOM changes happen while fully covered)
  await swapFn();

  // REVEAL phase
  await new Promise(resolve => {
    const start = performance.now();
    const tick = (now) => {
      const t = Math.min(1, (now - start) / DURATION_REVEAL);
      revealPhase(ctx, tiles, t, w, h);
      if (t < 1) requestAnimationFrame(tick);
      else { ctx.clearRect(0, 0, w, h); resolve(); }
    };
    requestAnimationFrame(tick);
  });

  layer.classList.remove('active');
}

async function opacityFade(swapFn) {
  await swapFn();
}

// Public API: run swapFn (which must update DOM to show the new screen) inside a transition.
export async function transition(swapFn) {
  if (isReducedMotion()) return opacityFade(swapFn);
  return pixelWipe(swapFn);
}
```

- [ ] **Step 2: Inline browser-console smoke test**

Paste into console:

```js
const t = await import('./js/transitions.js?bust=' + Date.now());
await t.transition(async () => {
  await new Promise(r => setTimeout(r, 50));
  console.log('mid-swap');
});
console.log('OK transitions — you should have seen a pixel wipe');
```

Expected: a brief pixel-dissolve covering then revealing the screen. `OK transitions` logged.

- [ ] **Step 3: Commit**

```bash
git add js/transitions.js
git commit -m "Add transitions module with pixel-wipe screen swap"
```

---

## Task 1.9: Install ui-fx + settings + transitions at app boot

**Files:**
- Modify: `js/main.js` (top imports + `init()` function)

- [ ] **Step 1: Add imports at the top of `js/main.js`**

In `js/main.js`, locate the import block (lines 1-12). After the existing imports, add:

```js
import { settings } from './settings.js';
import { installUiFx } from './ui-fx.js';
import { transition } from './transitions.js';
```

- [ ] **Step 2: Wrap `show()` in a transition**

In `js/main.js`, find `function show(name)` (around line 55). Replace with:

```js
function show(name) {
  return transition(async () => {
    for (const [k, el] of Object.entries(screens)) {
      el.classList.toggle('active', k === name);
    }
  });
}
```

Note: `show()` is now async, but all current call sites can ignore the returned promise (existing code doesn't await it). No call-site changes needed.

- [ ] **Step 3: Install ui-fx in `init()`**

In `js/main.js`, find `function init()` (near the bottom). Add as the FIRST line inside `init()`:

```js
  installUiFx();
```

- [ ] **Step 4: Verify in browser**

Hard-refresh `http://localhost:8765/`.

Expected:
- App boots normally.
- Faint scanlines + grain visible over everything (settings default ON).
- Click `Build a Map` → see a pixel-dissolve wipe transition into the editor screen.
- Click X back → pixel-dissolve back to menu.

If scanlines/grain are NOT visible, open DevTools and check `document.body.classList` contains `fx-scanlines fx-grain`. If wipe is not visible, check for errors in console.

- [ ] **Step 5: Commit**

```bash
git add js/main.js
git commit -m "Boot ui-fx + wrap screen swaps in transitions"
```

---

## Task 1.10: Promote Press Start 2P globally; verify font usage

**Files:**
- Modify: `style/_chrome.css` (button font-family confirmed); add small overrides to `_menu.css`, `_play.css`, etc. via the per-phase tasks. This task is the global pass.

- [ ] **Step 1: Spot-check that existing UI text uses the right fonts**

Open the app, inspect each visible element with DevTools:
- Title chars → `Bungee` ✓ (kept).
- Subtitle → currently `Jersey 25`; change in Phase 2 menu rework.
- Buttons → `Press Start 2P` (verify; `_chrome.css` from Task 1.2 sets this).
- Score (in play) → `Press Start 2P` ✓.
- Stats card numbers → `Press Start 2P` ✓.

- [ ] **Step 2: Add a global label-tightening rule to `style/_chrome.css`**

Append to `style/_chrome.css`:

```css
/* Press Start 2P is rendered tighter; reduce line-height & letter-spacing
   so it doesn't blow up vertical rhythm. */
.btn, .hud-btn, .tool-btn, .stat-num, .score-label, .run-stat-icon, .run-stat-value, .bird-name, .empty-msg {
  font-family: var(--font-pixel);
  line-height: 1.1;
}
```

- [ ] **Step 3: Verify no regressions**

Hard-refresh. Click around. Numbers, labels, and buttons should all be pixel-font. Body copy and tips remain Jersey 25.

- [ ] **Step 4: Commit**

```bash
git add style/_chrome.css
git commit -m "Promote Press Start 2P across chrome labels"
```

---

## Phase 1 wrap-up

By the end of Phase 1:
- App boots and looks essentially the same as v1.
- Faint CRT + grain visible over the page (toggleable later via Settings).
- Screen transitions are pixel-dissolve wipes.
- `js/settings.js`, `js/ui-fx.js`, `js/transitions.js`, `js/icons.js` modules exist and tested via console.
- `style.css` is now a thin index; all real styles live under `style/`.
- Press Start 2P is promoted on labels/buttons/HUD.

Stop point. PR can be cut here.

---

# PHASE 2 — MENU HUB LAYOUT

The menu becomes a hub of category tiles with a collapsible Customize drawer and a stats ribbon at the bottom.

## Task 2.1: Replace menu HTML with the hub layout

**Files:**
- Modify: `index.html` — `<section id="screen-menu">` block (lines ~14-73).

- [ ] **Step 1: Replace the entire `#screen-menu` section**

In `index.html`, find `<section id="screen-menu" class="screen active">` and replace the whole `<section>...</section>` block with:

```html
  <!-- MENU SCREEN -->
  <section id="screen-menu" class="screen active">
    <div class="ambient-clouds" aria-hidden="true">
      <div class="ambient-cloud c1"></div>
      <div class="ambient-cloud c2"></div>
      <div class="ambient-cloud c3"></div>
      <div class="ambient-cloud c4"></div>
      <div class="ambient-cloud c5"></div>
      <div class="ambient-cloud c6"></div>
    </div>

    <button class="menu-corner-btn" id="btn-settings" aria-label="Settings"></button>

    <div class="menu-inner">
      <div class="hero-bird-wrap">
        <canvas id="hero-bird" width="220" height="220"></canvas>
        <div class="hero-bird-platform"></div>
      </div>

      <h1 class="title" id="menu-title">
        <span class="ch">F</span><span class="ch">L</span><span class="ch">A</span><span class="ch">P</span><span class="ch">P</span><span class="ch">Y</span>
        <span class="title-break"></span>
        <span class="ch accent">F</span><span class="ch accent">A</span><span class="ch accent">C</span><span class="ch accent">E</span>
      </h1>
      <p class="subtitle">TAP · FLAP · DIE</p>

      <!-- Category tiles -->
      <div class="cat-tiles" id="cat-tiles">
        <button class="cat-tile" data-cat="play" id="cat-play">
          <div class="cat-tile-glyph" data-glyph="runs"></div>
          <div class="cat-tile-label">PLAY</div>
        </button>
        <button class="cat-tile" data-cat="make" id="cat-make">
          <div class="cat-tile-glyph" data-glyph="grid"></div>
          <div class="cat-tile-label">MAKE</div>
        </button>
        <button class="cat-tile" data-cat="birds" id="cat-birds">
          <div class="cat-tile-glyph" data-glyph="sparkle"></div>
          <div class="cat-tile-label">BIRDS</div>
        </button>
      </div>

      <!-- Expand panel — shown when a category is selected -->
      <div class="cat-panel" id="cat-panel" hidden>
        <div data-panel="play">
          <button class="btn primary big" data-go="play-random">SEND IT</button>
          <button class="btn" data-go="levels">MY MAPS</button>
        </div>
        <div data-panel="make">
          <button class="btn primary" data-go="editor">NEW MAP</button>
          <label class="btn" for="upload-import">IMPORT
            <input type="file" id="upload-import" accept="application/json,.json" hidden />
          </label>
        </div>
      </div>

      <!-- Customize drawer -->
      <div class="customize-drawer pix-frame" id="customize-drawer">
        <button class="customize-toggle" id="customize-toggle" aria-expanded="false">
          <span class="customize-caret">▶</span> CUSTOMIZE
        </button>
        <div class="customize-body" hidden>
          <div class="upload-grid">
            <label class="upload-slot" for="upload-bird">
              <div class="thumb" id="thumb-bird"><span class="thumb-plus">+</span></div>
              <span>YOUR FACE</span>
              <input type="file" id="upload-bird" accept="image/*" capture="environment" hidden />
            </label>
            <label class="upload-slot" for="upload-pipe">
              <div class="thumb" id="thumb-pipe"><span class="thumb-plus">+</span></div>
              <span>OBSTACLES</span>
              <input type="file" id="upload-pipe" accept="image/*" capture="environment" hidden />
            </label>
            <label class="upload-slot" for="upload-bg">
              <div class="thumb" id="thumb-bg"><span class="thumb-plus">+</span></div>
              <span>SCENERY</span>
              <input type="file" id="upload-bg" accept="image/*" capture="environment" hidden />
            </label>
          </div>
          <button class="btn ghost" id="btn-reset-photos">Wipe Photos</button>
        </div>
      </div>

      <!-- Stats ribbon -->
      <div class="stats-ribbon pix-frame" id="stats-card">
        <div class="stat"><span class="stat-glyph" data-glyph="runs"></span><div class="stat-num" id="stat-best">0</div><div class="stat-label">BEST</div></div>
        <div class="stat"><span class="stat-glyph" data-glyph="flame"></span><div class="stat-num" id="stat-combo">0</div><div class="stat-label">STREAK</div></div>
        <div class="stat"><span class="stat-glyph" data-glyph="coin"></span><div class="stat-num" id="stat-runs">0</div><div class="stat-label">RUNS</div></div>
        <div class="stat"><span class="stat-glyph" data-glyph="skull"></span><div class="stat-num" id="stat-deaths">0</div><div class="stat-label">CRASHES</div></div>
      </div>

      <p class="tip" id="tip">Pro tip: keep flapping.</p>
    </div>
  </section>
```

Notes on changes vs. v1:
- `<button id="btn-settings">` in the top-right (handled in Task 1.9 / Phase 4 wiring).
- Renamed the old menu-buttons stack into category tiles + cat-panel system.
- Wrapped uploads in `<div class="customize-drawer">` with a toggle.
- Added a 4th stat (`#stat-runs`) with a glyph slot. Renamed `#stat-games` to `#stat-runs` (update `js/main.js` in next step).
- Added an `#upload-import` file input INSIDE the MAKE panel for the IMPORT button.
- Added `data-glyph` attributes that `js/main.js` will populate with icons.

- [ ] **Step 2: Verify the markup parses**

Hard-refresh. Open DevTools console. Should see no errors. The menu will look wrong (no styles yet) — that's expected until Task 2.2.

- [ ] **Step 3: Commit**

```bash
git add index.html
git commit -m "Replace menu markup with hub-tile layout"
```

---

## Task 2.2: Style the menu hub in `style/_menu.css`

**Files:**
- Modify: `style/_menu.css` (replace the migrated v1 content with the new layout styles)

- [ ] **Step 1: Replace `style/_menu.css` entirely**

Open `style/_menu.css` and replace its contents with:

```css
/* style/_menu.css — menu hub layout */

#screen-menu {
  align-items: stretch;
  justify-content: flex-start;
  background: linear-gradient(180deg, var(--sky-top) 0%, var(--sky-mid) 60%, var(--sky-bottom) 100%);
  overflow: hidden;
  position: fixed;
}

.menu-inner {
  position: relative;
  z-index: 1;
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  padding: calc(env(safe-area-inset-top) + 16px) 12px calc(env(safe-area-inset-bottom) + 8px);
  overflow-y: auto;
  gap: 10px;
}

/* === Top-right gear button === */
.menu-corner-btn {
  position: absolute;
  top: calc(env(safe-area-inset-top) + 12px);
  right: 12px;
  width: var(--tap);
  height: var(--tap);
  border-radius: 4px;
  border: 3px solid var(--frame-dark);
  background: var(--panel-light);
  color: var(--ink);
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
  box-shadow: var(--pix-shadow-1);
  z-index: 2;
}
.menu-corner-btn:active { transform: translateY(2px); box-shadow: 0 2px 0 rgba(0,0,0,0.45); }

/* === Drifting ambient clouds (kept) === */
.ambient-clouds { position: absolute; inset: 0; pointer-events: none; z-index: 0; overflow: hidden; }
.ambient-cloud {
  position: absolute;
  background:
    radial-gradient(ellipse 60% 70% at 35% 60%, rgba(255,255,255,0.85), transparent 70%),
    radial-gradient(ellipse 65% 80% at 60% 45%, rgba(255,255,255,0.9), transparent 70%),
    radial-gradient(ellipse 55% 70% at 75% 60%, rgba(255,255,255,0.78), transparent 70%);
  width: 240px; height: 100px; border-radius: 50%;
  filter: drop-shadow(0 4px 8px rgba(40, 80, 120, 0.15));
  animation: drift linear infinite;
}
.ambient-cloud.c1 { top: 6%;  width: 220px; height: 80px;  animation-duration: 70s;  opacity: 0.85; animation-delay: -15s; }
.ambient-cloud.c2 { top: 14%; width: 280px; height: 110px; animation-duration: 95s;  opacity: 0.7;  animation-delay: -55s; }
.ambient-cloud.c3 { top: 22%; width: 180px; height: 70px;  animation-duration: 60s;  opacity: 0.65; animation-delay: -25s; }
.ambient-cloud.c4 { top: 32%; width: 320px; height: 130px; animation-duration: 110s; opacity: 0.55; animation-delay: -80s; }
.ambient-cloud.c5 { top: 45%; width: 200px; height: 80px;  animation-duration: 75s;  opacity: 0.45; animation-delay: -10s; }
.ambient-cloud.c6 { top: 60%; width: 260px; height: 100px; animation-duration: 90s;  opacity: 0.35; animation-delay: -45s; }
@keyframes drift {
  from { transform: translateX(-30vw); }
  to   { transform: translateX(130vw); }
}

/* === Hero === */
.hero-bird-wrap { position: relative; width: 200px; height: 200px; margin: 0 auto -8px; pointer-events: none; }
#hero-bird { width: 200px; height: 200px; display: block; }
.hero-bird-platform {
  position: absolute; bottom: 18px; left: 50%; transform: translateX(-50%);
  width: 110px; height: 14px;
  background: radial-gradient(ellipse at center, rgba(29,43,74,0.35), transparent 70%);
  border-radius: 50%;
  animation: platform-pulse 1s ease-in-out infinite alternate;
}
@keyframes platform-pulse {
  from { transform: translateX(-50%) scale(1); opacity: 0.7; }
  to   { transform: translateX(-50%) scale(0.85); opacity: 0.4; }
}

/* === Title === */
.title {
  font-family: var(--font-display);
  font-size: clamp(44px, 13vw, 84px);
  margin: 4px 0 0;
  line-height: 0.95;
  letter-spacing: 2px;
  text-shadow: 0 4px 0 rgba(0,0,0,0.25), 0 8px 16px rgba(20, 60, 90, 0.25);
  color: var(--ink);
  display: flex; flex-wrap: wrap; justify-content: center; gap: 0 4px;
  text-align: center;
}
.title .ch { display: inline-block; transform-origin: 50% 100%; transition: transform 0.2s ease; }
.title .ch.accent { color: var(--accent-2); }
.title .ch:hover { transform: translateY(-6px) rotate(-4deg); }
.title-break { flex-basis: 100%; height: 0; }

.subtitle {
  color: var(--ink);
  margin: 6px 0 4px;
  font-family: var(--font-pixel);
  font-size: 10px;
  letter-spacing: 3px;
  text-align: center;
  opacity: 0.7;
}

/* === Category tiles === */
.cat-tiles {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
  width: min(420px, 96vw);
  margin-top: 4px;
}
.cat-tile {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 14px 6px 10px;
  border-radius: 4px;
  border: 3px solid var(--frame-dark);
  background: var(--panel-light);
  color: var(--ink);
  cursor: pointer;
  box-shadow: var(--pix-shadow-1);
  transition: transform 0.06s ease, box-shadow 0.1s ease, background 0.15s ease;
  font-family: var(--font-pixel);
}
.cat-tile:active { transform: translateY(2px); box-shadow: 0 2px 0 rgba(0,0,0,0.35); }
.cat-tile.expanded {
  background: var(--accent);
  box-shadow: 0 4px 0 #a8782e, inset 0 2px 0 rgba(255,255,255,0.35);
}
.cat-tile-glyph {
  width: 32px;
  height: 32px;
  color: var(--ink);
}
.cat-tile-label {
  font-size: 11px;
  letter-spacing: 2px;
}

/* === Category panel (expanded sub-actions) === */
.cat-panel {
  width: min(320px, 92vw);
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 4px 0;
}
.cat-panel > div { display: none; flex-direction: column; gap: 8px; }
.cat-panel > div.active { display: flex; }

/* === Customize drawer === */
.customize-drawer { width: min(420px, 96vw); padding: 8px 10px; }
.customize-toggle {
  width: 100%;
  border: none;
  background: transparent;
  color: var(--ink);
  font-family: var(--font-pixel);
  font-size: 11px;
  letter-spacing: 2px;
  padding: 6px 4px;
  cursor: pointer;
  text-align: left;
  display: inline-flex;
  align-items: center;
  gap: 8px;
}
.customize-caret { display: inline-block; transition: transform 0.2s ease; }
.customize-drawer[data-open] .customize-caret { transform: rotate(90deg); }
.customize-body { display: flex; flex-direction: column; gap: 10px; padding-top: 8px; }

/* Upload grid (kept layout, tighter sizing) */
.upload-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
}
.upload-slot {
  display: flex; flex-direction: column; align-items: center; gap: 4px;
  cursor: pointer;
  font-size: 9px;
  font-family: var(--font-pixel);
  color: var(--ink);
  letter-spacing: 1px;
}
.thumb {
  width: 100%;
  aspect-ratio: 1 / 1;
  border-radius: 12px;
  background: rgba(255,255,255,0.5);
  border: 3px dashed rgba(29,43,74,0.4);
  background-size: cover; background-position: center;
  display: flex; align-items: center; justify-content: center;
  position: relative;
  box-shadow: var(--pix-shadow-1);
  transition: transform 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease;
}
.upload-slot:hover .thumb { transform: translateY(-2px); }
.upload-slot:active .thumb { transform: translateY(2px); box-shadow: 0 0 0 rgba(0,0,0,0); }
.thumb-plus { font-size: 32px; color: rgba(29,43,74,0.35); font-family: var(--font-display); pointer-events: none; }
.thumb:not([data-loaded]) { animation: thumb-pulse 2.4s ease-in-out infinite; }
.thumb[data-loaded] {
  border-style: solid;
  border-color: var(--accent);
  box-shadow: var(--pix-shadow-1), 0 0 0 3px rgba(255,209,102,0.4);
  animation: none;
}
.thumb[data-loaded] .thumb-plus { display: none; }
@keyframes thumb-pulse {
  0%, 100% { border-color: rgba(29,43,74,0.4); }
  50%      { border-color: rgba(29,43,74,0.7); transform: translateY(-1px); }
}

/* === Stats ribbon (replaces stats-card) === */
.stats-ribbon {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 4px;
  width: min(420px, 96vw);
  padding: 8px 10px;
}
.stats-ribbon .stat {
  display: flex; flex-direction: column; align-items: center; gap: 2px;
}
.stats-ribbon .stat-glyph {
  width: 16px; height: 16px; color: var(--accent-2);
}
.stats-ribbon .stat-num {
  font-family: var(--font-pixel);
  font-size: 14px;
  color: var(--ink);
}
.stats-ribbon .stat-label {
  font-family: var(--font-pixel);
  font-size: 8px;
  color: rgba(29,43,74,0.7);
  letter-spacing: 1px;
}

/* === Tip === */
.tip {
  font-family: var(--font-game);
  font-size: 14px;
  color: var(--ink);
  background: rgba(255,255,255,0.5);
  padding: 6px 14px;
  border-radius: 999px;
  margin: 6px 0 0;
  letter-spacing: 0.5px;
  max-width: 92vw;
  text-align: center;
  opacity: 0;
  transition: opacity 0.4s ease;
}
.tip.shown { opacity: 0.85; }
```

- [ ] **Step 2: Hard-refresh and visually inspect**

Open `http://localhost:8765/`. The menu should now show:
- Hero bird at top with title and subtitle below
- 3 category tiles in a row (PLAY / MAKE / BIRDS)
- Customize drawer below (collapsed)
- Stats ribbon at bottom
- Gear button in top-right corner

Buttons probably don't do anything new yet — that's wired in Task 2.3.

- [ ] **Step 3: Commit**

```bash
git add style/_menu.css
git commit -m "Style menu hub: category tiles, drawer, ribbon"
```

---

## Task 2.3: Wire menu hub interactions in `js/main.js`

**Files:**
- Modify: `js/main.js`

- [ ] **Step 1: Add a new wiring function**

Near `wireMenuNav()` (around line 209), add:

```js
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
```

- [ ] **Step 2: Populate icon glyphs in stats ribbon + cat tiles**

Add this function near the bottom of the file (before `init()`):

```js
async function populateMenuGlyphs() {
  const { iconSvg } = await import('./icons.js');
  document.querySelectorAll('[data-glyph]').forEach(el => {
    el.innerHTML = '';
    el.appendChild(iconSvg(el.dataset.glyph));
  });
}
```

- [ ] **Step 3: Update `init()`**

In `init()` (near the bottom), add these calls after `wireMenuNav()`:

```js
  wireCatTiles();
  wireCustomizeDrawer();
  wireMenuImport();
  populateMenuGlyphs();
```

- [ ] **Step 4: Rename `stat-games` → `stat-runs` references**

Earlier the HTML uses `id="stat-runs"`. In `js/main.js`, search for `'stat-games'` and replace with `'stat-runs'`. There should be exactly one occurrence in `refreshStatsCard()`:

```js
  rollNumber(document.getElementById('stat-runs'), stats.gamesPlayed || 0);
```

- [ ] **Step 5: Manual verification in browser**

Hard-refresh.
- Click PLAY tile → expands to show SEND IT + MY MAPS.
- Click MAKE → expands to NEW MAP + IMPORT.
- Click BIRDS → opens Aviary directly.
- Click PLAY again → collapses.
- Toggle CUSTOMIZE → drawer expands/collapses; reloading page preserves state.
- Stats ribbon shows 4 numbers with glyphs.
- Gear button visible top-right (does nothing yet — wired in Phase 4).

- [ ] **Step 6: Commit**

```bash
git add js/main.js
git commit -m "Wire menu hub: cat tiles, drawer, glyphs"
```

---

## Task 2.4: Update menu entrance animation for the new elements

**Files:**
- Modify: `js/main.js` — `animateMenuIntro()` function (around line 125).

- [ ] **Step 1: Replace `animateMenuIntro()`**

Find `function animateMenuIntro()` and replace its body with:

```js
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
```

- [ ] **Step 2: Verify**

Hard-refresh. On menu load: title chars cascade in elastically, then subtitle → tiles → drawer → ribbon stagger up. Total time ~900ms.

- [ ] **Step 3: Commit**

```bash
git add js/main.js
git commit -m "Update menu entrance animation for hub layout"
```

---

## Phase 2 wrap-up

Menu is now a tile hub with drawer + ribbon. Settings gear button is visible but inert (wired in Phase 4). Stop point.

---

# PHASE 3 — PLAY HUD + GAME-OVER

Adds live combo meter, coin/near-miss counters to the HUD; introduces grading, confetti, inline unlock card, and share card to the game-over flow.

## Task 3.1: Update HUD markup

**Files:**
- Modify: `index.html` — `<div class="hud">` block.

- [ ] **Step 1: Replace the HUD markup**

In `index.html`, find `<div class="hud">` inside `<section id="screen-play">` and replace with:

```html
    <div class="hud">
      <div class="hud-top">
        <div class="hud-left">
          <button class="hud-btn" id="btn-pause" aria-label="Pause"></button>
          <button class="hud-btn" id="btn-mute" aria-label="Mute"></button>
        </div>
        <button class="hud-btn" id="btn-quit" aria-label="Quit"></button>
      </div>
      <div class="combo-row">
        <div class="combo-meter" id="combo-meter">
          <div class="combo-seg" data-i="0"></div>
          <div class="combo-seg" data-i="1"></div>
          <div class="combo-seg" data-i="2"></div>
          <div class="combo-seg" data-i="3"></div>
          <div class="combo-seg" data-i="4"></div>
          <div class="combo-x" id="combo-x" hidden>x5+</div>
        </div>
      </div>
      <div class="score" id="score">0</div>
      <div class="hud-counters">
        <div class="hud-counter" id="hud-coins"><span class="hud-counter-glyph" data-glyph="coin"></span><span class="hud-counter-num" id="hud-coins-num">0</span></div>
        <div class="hud-counter" id="hud-near"><span class="hud-counter-glyph" data-glyph="near"></span><span class="hud-counter-num" id="hud-near-num">0</span></div>
      </div>
    </div>
```

The pause/mute/quit buttons are now icon-only — text content removed; aria-labels added. Glyphs populated by `populateMenuGlyphs()` (already populates `[data-glyph]` globally) — but pause/mute use `data-glyph` directly:

Change the three button lines to:

```html
          <button class="hud-btn" id="btn-pause" data-glyph="pause" aria-label="Pause"></button>
          <button class="hud-btn" id="btn-mute" data-glyph="speaker" aria-label="Mute"></button>
        </div>
        <button class="hud-btn" id="btn-quit" data-glyph="close" aria-label="Quit"></button>
```

- [ ] **Step 2: Verify markup parses**

Hard-refresh. Click Play → new HUD elements appear but unstyled. Expected — styles next task.

- [ ] **Step 3: Commit**

```bash
git add index.html
git commit -m "Add combo meter and counters to HUD markup"
```

---

## Task 3.2: Style the HUD in `style/_play.css`

**Files:**
- Modify: `style/_play.css` — append HUD/combo/counter styles.

- [ ] **Step 1: Replace the HUD section in `style/_play.css`**

Locate the `.hud { ... }` block in `style/_play.css` and replace **the .hud + .hud-btn + .score blocks** with:

```css
.hud {
  position: absolute;
  top: env(safe-area-inset-top);
  left: 0; right: 0;
  padding: 12px;
  pointer-events: none;
  z-index: 2;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.hud > * { pointer-events: auto; }
.hud-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.hud-left { display: flex; gap: 8px; }

.hud-btn {
  min-width: var(--tap);
  min-height: var(--tap);
  border-radius: 4px;
  border: 3px solid var(--frame-dark);
  background: var(--panel);
  color: var(--text);
  cursor: pointer;
  backdrop-filter: blur(6px);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  box-shadow: var(--pix-shadow-1);
  transition: transform 0.08s ease;
  font-size: 18px;
}
.hud-btn .icon { width: 22px; height: 22px; }
.hud-btn:active { transform: translateY(2px); box-shadow: 0 1px 0 rgba(0,0,0,0.35); }
.hud-btn.muted { opacity: 0.5; }

.score {
  font-family: var(--font-pixel);
  font-size: 36px;
  color: #fff;
  text-shadow: -3px 0 0 var(--frame-dark), 3px 0 0 var(--frame-dark), 0 -3px 0 var(--frame-dark), 0 3px 0 var(--frame-dark), 0 6px 0 rgba(0,0,0,0.4);
  font-variant-numeric: tabular-nums;
  text-align: center;
  margin-top: 4px;
}

/* === Combo meter === */
.combo-row {
  display: flex;
  justify-content: center;
  margin-top: 4px;
}
.combo-meter {
  display: inline-flex;
  gap: 4px;
  padding: 4px 8px;
  background: rgba(0,0,0,0.5);
  border: 2px solid var(--frame-dark);
  border-radius: 4px;
  align-items: center;
}
.combo-seg {
  width: 16px;
  height: 10px;
  background: rgba(255,255,255,0.15);
  border: 1px solid rgba(255,255,255,0.25);
}
.combo-seg.lit {
  background: var(--accent);
  box-shadow: 0 0 6px rgba(255,209,102,0.7);
}
.combo-seg.lit-2 { background: var(--sunset); box-shadow: 0 0 6px rgba(255,140,66,0.7); }
.combo-seg.lit-3 { background: var(--accent-2); box-shadow: 0 0 8px rgba(239,71,111,0.7); }
.combo-x {
  font-family: var(--font-pixel);
  font-size: 11px;
  color: var(--accent-2);
  margin-left: 6px;
  letter-spacing: 1px;
}
.combo-meter.broken {
  animation: combo-break 0.4s ease;
}
@keyframes combo-break {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-4px); }
  75% { transform: translateX(4px); }
}

/* === HUD counters === */
.hud-counters {
  display: flex;
  justify-content: space-between;
  padding: 0 4px;
  margin-top: 6px;
}
.hud-counter {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  background: var(--panel);
  border: 2px solid var(--frame-dark);
  border-radius: 4px;
  padding: 4px 8px;
  font-family: var(--font-pixel);
  font-size: 12px;
  color: var(--text);
}
.hud-counter-glyph { width: 14px; height: 14px; color: var(--accent); }
#hud-near .hud-counter-glyph { color: var(--accent-3); }
.hud-counter.flash {
  animation: counter-flash 0.4s ease;
}
@keyframes counter-flash {
  0%   { transform: scale(1); }
  40%  { transform: scale(1.25); background: var(--accent); color: var(--ink); }
  100% { transform: scale(1); }
}
```

- [ ] **Step 2: Visually verify in browser**

Hard-refresh, click PLAY → SEND IT. Should see:
- Pause / mute icons top-left.
- X icon top-right.
- Empty combo meter (5 grey segments).
- Score in middle.
- Two counters at the bottom (0 coins / 0 near-miss).

Counters update inert until Task 3.3.

- [ ] **Step 3: Commit**

```bash
git add style/_play.css
git commit -m "Style new HUD: combo meter, counters, icon-only buttons"
```

---

## Task 3.3: Emit combo / coin / near-miss callbacks from `js/game.js`

**Files:**
- Modify: `js/game.js`

The `Game` constructor accepts an options object today. Add three new callback options: `onCombo(streak)`, `onCoin(total)`, `onNearMiss(total)`. Fire them from the existing combo/coin/near-miss code paths.

- [ ] **Step 1: Locate the existing event hooks**

Open `js/game.js`. The constructor accepts `{ onScore, onGameOver, ... }`. Search for where the score callback `onScore` is invoked (it's called on each pipe pass). Combo tracking and coin pickup live in the same area.

- [ ] **Step 2: Accept and stash the new callbacks**

In the `Game` constructor (line ~29+), wherever options are destructured/stored, add:

```js
    this.onCombo    = options.onCombo    || (() => {});
    this.onCoin     = options.onCoin     || (() => {});
    this.onNearMiss = options.onNearMiss || (() => {});
```

- [ ] **Step 3: Fire `onCoin` whenever a coin is collected**

Search for where coin pickup is detected (likely a `coins.splice(...)` near a particle-spawn / sound-play block). After the splice/score update, add:

```js
        this.onCoin(this.totalCoins);   // adjust to match actual coin-count variable name
```

If the variable name differs, use whatever the code calls the per-run coin counter (e.g. `this.coinCount`, `this.runStats.coins`). Inspect the surrounding code to determine.

- [ ] **Step 4: Fire `onCombo` whenever the combo counter changes**

Search for where the combo increments (likely inside the pipe-pass code path that triggers a milestone popup). Wherever the combo is set, add:

```js
        this.onCombo(this.combo);
```

And where the combo is reset (on death or near-miss timeout):

```js
        this.onCombo(0);
```

- [ ] **Step 5: Fire `onNearMiss` whenever a near-miss is detected**

Search for "near" / "close" / "+2" — the near-miss detection. After incrementing the near-miss count:

```js
        this.onNearMiss(this.nearMisses);
```

- [ ] **Step 6: Wire the callbacks in `js/main.js`**

In `js/main.js`, find `startGame()` and inside the `new Game(canvas, { ... })` call, add to the options:

```js
    onCombo: (streak) => {
      const meter = document.getElementById('combo-meter');
      const segs = meter.querySelectorAll('.combo-seg');
      const x = document.getElementById('combo-x');
      // Light up segments up to min(streak, 5)
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
```

Reset counters at the start of each game inside `startGame()` after `show('play')`:

```js
  document.getElementById('hud-coins-num').textContent = '0';
  document.getElementById('hud-near-num').textContent = '0';
  document.querySelectorAll('.combo-seg').forEach(s => s.classList.remove('lit','lit-2','lit-3'));
  document.getElementById('combo-x').hidden = true;
```

- [ ] **Step 7: Verify in browser**

Hard-refresh, start a run, fly through pipes.
- Each pipe pass: combo meter fills one segment, then resets visually on hit.
- Each coin: coin counter bumps + flashes.
- Each near-miss: near-miss counter bumps + flashes green.

If callbacks don't fire, add a `console.log` inside each `onX` handler to confirm `game.js` is calling them.

- [ ] **Step 8: Commit**

```bash
git add js/game.js js/main.js
git commit -m "Wire live combo meter and HUD counters"
```

---

## Task 3.4: Create `js/grading.js` with pure grading function

**Files:**
- Create: `js/grading.js`

- [ ] **Step 1: Create the module**

```js
// js/grading.js — pure scoring → letter-grade.
//
// Inputs are the final-run stats; output is a grade letter, the breakdown,
// and a CSS color string for visual use.

export const GRADE_THRESHOLDS = Object.freeze({
  S: 80, A: 50, B: 25, C: 10, D: 0,
});

const COLORS = Object.freeze({
  S: '#ffd166',
  A: '#06d6a0',
  B: '#5eb3d6',
  C: '#ff8c42',
  D: '#ef476f',
});

export function gradeRun({ score = 0, coins = 0, bestCombo = 0, nearMisses = 0, isNewBest = false } = {}) {
  const base  = Math.max(0, score);
  const bonus = coins * 0.5 + bestCombo * 1.5 + nearMisses * 0.3;
  const total = base + bonus;
  let grade;
  if (isNewBest || total >= GRADE_THRESHOLDS.S) grade = 'S';
  else if (total >= GRADE_THRESHOLDS.A) grade = 'A';
  else if (total >= GRADE_THRESHOLDS.B) grade = 'B';
  else if (total >= GRADE_THRESHOLDS.C) grade = 'C';
  else grade = 'D';
  return {
    grade,
    breakdown: { base, bonus: Number(bonus.toFixed(1)), total: Number(total.toFixed(1)) },
    color: COLORS[grade],
  };
}
```

- [ ] **Step 2: Inline browser-console test**

Paste:

```js
const { gradeRun, GRADE_THRESHOLDS } = await import('./js/grading.js?bust=' + Date.now());
console.assert(gradeRun({ score: 0 }).grade === 'D', 'zero → D');
console.assert(gradeRun({ score: 12 }).grade === 'C', '12 → C');
console.assert(gradeRun({ score: 30 }).grade === 'B', '30 → B');
console.assert(gradeRun({ score: 60 }).grade === 'A', '60 → A');
console.assert(gradeRun({ score: 100 }).grade === 'S', '100 → S');
console.assert(gradeRun({ score: 0, isNewBest: true }).grade === 'S', 'new best → S');
const r = gradeRun({ score: 50, coins: 10, bestCombo: 5, nearMisses: 5 });
console.assert(r.breakdown.bonus > 0, 'bonus computed');
console.assert(typeof r.color === 'string' && r.color.startsWith('#'), 'color string');
console.log('OK grading.js');
```

Expected: `OK grading.js`.

- [ ] **Step 3: Commit**

```bash
git add js/grading.js
git commit -m "Add grading module"
```

---

## Task 3.5: Update game-over overlay markup with grade + share

**Files:**
- Modify: `index.html` — `#overlay-gameover` block.

- [ ] **Step 1: Replace the game-over overlay**

In `index.html`, find `<div class="overlay" id="overlay-gameover" hidden>` and replace the whole element with:

```html
    <div class="overlay" id="overlay-gameover" hidden>
      <div class="grade-stamp" id="grade-stamp" data-grade="D">D</div>
      <div class="new-best-badge" id="new-best-badge">NEW BEST!</div>
      <h2 id="gameover-message">Splat.</h2>
      <div class="score-row">
        <div><span class="score-label">SCORE</span><span class="score-value" id="final-score">0</span></div>
        <div><span class="score-label">BEST</span><span class="score-value" id="final-best">0</span></div>
      </div>
      <div class="run-summary" id="run-summary">
        <div class="run-stat"><span class="run-stat-icon" data-glyph="coin"></span><span class="run-stat-label">Coins</span><span class="run-stat-value" id="sum-coins">0</span></div>
        <div class="run-stat"><span class="run-stat-icon" data-glyph="near"></span><span class="run-stat-label">Closes</span><span class="run-stat-value" id="sum-closes">0</span></div>
        <div class="run-stat"><span class="run-stat-icon" data-glyph="flame"></span><span class="run-stat-label">Streak</span><span class="run-stat-value" id="sum-streak">0</span></div>
        <div class="run-stat"><span class="run-stat-icon" data-glyph="runs"></span><span class="run-stat-label">Flaps</span><span class="run-stat-value" id="sum-flaps">0</span></div>
        <div class="run-stat"><span class="run-stat-icon" data-glyph="sparkle"></span><span class="run-stat-label">Time</span><span class="run-stat-value" id="sum-time">0:00</span></div>
      </div>
      <div class="unlock-inline" id="unlock-inline" hidden>
        <canvas class="unlock-inline-bird" id="unlock-inline-canvas" width="64" height="64"></canvas>
        <div class="unlock-inline-text">
          <div class="unlock-inline-label">NEW BIRD UNLOCKED</div>
          <div class="unlock-inline-name" id="unlock-inline-name"></div>
        </div>
        <button class="btn small primary" id="unlock-inline-equip">EQUIP</button>
      </div>
      <div class="gameover-buttons">
        <button class="btn primary" id="btn-retry">RUN IT BACK</button>
        <button class="btn" id="btn-share"><span class="icon" data-glyph="share"></span> SHARE</button>
        <button class="btn ghost" id="btn-back-from-gameover">MENU</button>
      </div>
    </div>
```

- [ ] **Step 2: Add styles for the grade stamp + inline unlock + buttons**

Append to `style/_play.css`:

```css
.grade-stamp {
  font-family: var(--font-display);
  font-size: 96px;
  line-height: 1;
  color: var(--accent);
  text-shadow: 0 6px 0 rgba(0,0,0,0.45), 0 12px 24px rgba(0,0,0,0.4);
  letter-spacing: 4px;
  margin-bottom: 6px;
  transform: scale(2.2);
  opacity: 0;
  will-change: transform, opacity;
}
.grade-stamp[data-grade="S"] { color: var(--accent); }
.grade-stamp[data-grade="A"] { color: var(--accent-3); }
.grade-stamp[data-grade="B"] { color: var(--sky-top); }
.grade-stamp[data-grade="C"] { color: var(--sunset); }
.grade-stamp[data-grade="D"] { color: var(--accent-2); }

.unlock-inline {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 14px;
  background: linear-gradient(90deg, var(--accent), var(--sunset));
  border: 3px solid var(--frame-dark);
  border-radius: 4px;
  color: var(--ink);
  margin-top: 6px;
  box-shadow: 0 4px 0 #a8782e, 0 0 24px rgba(255,209,102,0.5);
}
.unlock-inline-bird { width: 48px; height: 48px; }
.unlock-inline-text { flex: 1; }
.unlock-inline-label { font-family: var(--font-pixel); font-size: 8px; letter-spacing: 2px; opacity: 0.85; }
.unlock-inline-name { font-family: var(--font-display); font-size: 18px; letter-spacing: 1px; }

.gameover-buttons {
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: min(280px, 84vw);
  margin-top: 8px;
}
```

- [ ] **Step 3: Verify markup parses (game-over doesn't show yet)**

Hard-refresh. No errors. Game-over still works (just shows a `D` grade for now without animation).

- [ ] **Step 4: Commit**

```bash
git add index.html style/_play.css
git commit -m "Add grade stamp + inline unlock + share button to game-over"
```

---

## Task 3.6: Wire grading + stamp reveal + confetti into game-over

**Files:**
- Modify: `js/main.js` — `startGame()` callback `onGameOver` + `animateRunSummary()`.
- Modify: `js/main.js` — import new modules.

- [ ] **Step 1: Import grading + stampReveal**

Near the top of `js/main.js`, add:

```js
import { gradeRun } from './grading.js';
import { stampReveal, spawnConfettiAt } from './ui-fx.js';
```

(`installUiFx` was imported earlier; this adds the new exports.)

Update the `ui-fx.js` import line that exists to:

```js
import { installUiFx, stampReveal, spawnConfettiAt } from './ui-fx.js';
```

(Remove the duplicate import added a moment ago.)

- [ ] **Step 2: Update the `onGameOver` callback**

In `startGame()`, find the `onGameOver: (info) => { ... }` block and replace with:

```js
    onGameOver: (info) => {
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
```

**Note:** `currentGame.particles` assumes the `Game` instance exposes its `ParticleSystem` as `.particles`. If it doesn't, expose it: in `js/game.js`, in the constructor, after creating the particle system, ensure `this.particles = <particleSystem>`.

- [ ] **Step 3: Verify particle exposure**

In `js/game.js`, find where `new ParticleSystem(...)` is constructed. After:

```js
    this.particles = ps; // or whatever local name
```

If it's already assigned to `this.something`, use that name in main.js. Adjust the `currentGame.particles` reference accordingly.

- [ ] **Step 4: Verify in browser**

Hard-refresh. Play and crash. On game-over: letter grade stamps in big with a scale-bounce, then confetti bursts behind it, then run-summary rows tween up.

- [ ] **Step 5: Commit**

```bash
git add js/main.js js/game.js
git commit -m "Wire grade stamp + confetti into game-over flow"
```

---

## Task 3.7: Inline unlock card in game-over

**Files:**
- Modify: `js/achievements.js` — expose `consumeRecentUnlocks()`.
- Modify: `js/main.js` — add `renderInlineUnlock()` + wire equip button.

- [ ] **Step 1: Add `consumeRecentUnlocks` to `js/achievements.js`**

Look at the existing unlock-listener pattern in `js/achievements.js`. There's an `onUnlock(callback)` that's notified on unlocks. Add a recent-unlocks queue.

Open `js/achievements.js`. Near the top of the file (after imports), add:

```js
let recentUnlocks = [];   // queue of unlocked bird ids since last consume
```

Find where unlocks are emitted to subscribers (search for `onUnlock` or where birds are pushed into the unlocked list). After firing the existing notification, also push:

```js
  recentUnlocks.push(...newlyUnlocked);   // newlyUnlocked = array of bird objects fired this tick
```

Export the consumer:

```js
export function consumeRecentUnlocks() {
  const list = recentUnlocks.slice();
  recentUnlocks = [];
  return list;   // array of bird objects (use bird.id, bird.name, bird.draw)
}
```

- [ ] **Step 2: Implement `renderInlineUnlock()` in `js/main.js`**

Add this function near the other game-over helpers:

```js
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
```

Add the import for `consumeRecentUnlocks`:

```js
import { onUnlock, bootstrapUnlocks, recordTitleClick, isUnlocked, getProgress, consumeRecentUnlocks } from './achievements.js';
```

Update the existing `onUnlock(...)` handler in `init()` to no longer toast unlocks during a game (the inline card handles them). It can keep handling unlocks that happen OUTSIDE a game (e.g. from title clicks):

```js
  onUnlock((birds) => {
    // Only toast unlocks outside of a game; in-game unlocks are shown inline on game-over.
    if (currentGame && !currentGame.isOver?.()) return;  // skip; consume on game-over instead
    let delay = 0;
    for (const b of birds) {
      setTimeout(() => showUnlockToast(b), delay);
      delay += 3000;
    }
  });
```

If `currentGame.isOver()` doesn't exist, instead gate on `overlayGameOver.hidden === false`:

```js
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
```

- [ ] **Step 3: Verify**

Hard-refresh. Score enough to unlock a bird in a single run (Punk = score 5 is fastest). After crash, inline unlock card appears in game-over with bird, name, EQUIP button. Tap EQUIP → text changes to EQUIPPED, button disables. Return to menu → new bird shown as hero.

- [ ] **Step 4: Commit**

```bash
git add js/achievements.js js/main.js
git commit -m "Show inline unlock card in game-over"
```

---

## Task 3.8: Create `js/share-card.js`

**Files:**
- Create: `js/share-card.js`

- [ ] **Step 1: Create the module**

```js
// js/share-card.js — renders a shareable 1080x1350 PNG of a run.
//
// buildShareCard({...}) returns { blob, dataUrl, width, height }.
// downloadShareCard(card, name?) triggers a download.
// copyShareCard(card) writes to clipboard if supported, returns true/false.

import { drawScene, pickTheme, buildScene } from './scene.js';

const W = 1080;
const H = 1350;

export async function buildShareCard({ bird, photoImg, grade, score, best, theme }) {
  const cnv = document.createElement('canvas');
  cnv.width = W;
  cnv.height = H;
  const ctx = cnv.getContext('2d');

  // 1. Sky backdrop
  const t = theme || pickTheme();
  const scene = buildScene(t, W, H - 200);
  drawScene(ctx, scene, 0, 0, W, H - 200, H - 200);

  // Solid bottom band for text
  ctx.fillStyle = '#0d1b3d';
  ctx.fillRect(0, H - 200, W, 200);

  // 2. Bird centered
  ctx.save();
  ctx.translate(W / 2, H / 2 - 80);
  const r = 140;
  if (bird && bird.draw) {
    bird.draw(ctx, r);
  } else if (photoImg) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.clip();
    const scale = Math.max((r * 2) / photoImg.width, (r * 2) / photoImg.height);
    const w = photoImg.width * scale, h = photoImg.height * scale;
    ctx.drawImage(photoImg, -w / 2, -h / 2, w, h);
    ctx.restore();
    ctx.strokeStyle = '#ffd166';
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();

  // 3. Grade letter (huge)
  ctx.fillStyle = gradeColor(grade);
  ctx.font = '900 320px "Bungee", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(grade || 'D', W / 2, H / 2 + 220);

  // 4. Score row
  ctx.fillStyle = '#f7f7ff';
  ctx.font = 'bold 64px "Press Start 2P", monospace';
  ctx.fillText(`${score}`, W / 2, H - 130);
  ctx.font = '24px "Press Start 2P", monospace';
  ctx.fillStyle = '#a8a8c0';
  ctx.fillText(`BEST ${best}`, W / 2, H - 80);

  // 5. Wordmark
  ctx.fillStyle = '#ffd166';
  ctx.font = '900 40px "Bungee", sans-serif';
  ctx.fillText('FLAPPY FACE', W / 2, H - 30);

  const dataUrl = cnv.toDataURL('image/png');
  const blob = await new Promise(r => cnv.toBlob(r, 'image/png'));
  return { blob, dataUrl, width: W, height: H };
}

function gradeColor(g) {
  switch (g) {
    case 'S': return '#ffd166';
    case 'A': return '#06d6a0';
    case 'B': return '#5eb3d6';
    case 'C': return '#ff8c42';
    case 'D':
    default:  return '#ef476f';
  }
}

export function downloadShareCard(card, filename = 'flappy-face.png') {
  const a = document.createElement('a');
  a.href = card.dataUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

export async function copyShareCard(card) {
  if (!navigator.clipboard || !window.ClipboardItem) return false;
  try {
    await navigator.clipboard.write([new ClipboardItem({ 'image/png': card.blob })]);
    return true;
  } catch (e) {
    console.warn('copy failed', e);
    return false;
  }
}
```

- [ ] **Step 2: Inline browser-console test**

Paste:

```js
const sc = await import('./js/share-card.js?bust=' + Date.now());
const { BIRDS } = await import('./js/birds.js');
const bird = BIRDS.buddy;
const card = await sc.buildShareCard({ bird, grade: 'A', score: 42, best: 88, theme: 'day' });
console.assert(card.width === 1080 && card.height === 1350, 'card dimensions');
console.assert(card.blob instanceof Blob, 'blob produced');
console.assert(card.dataUrl.startsWith('data:image/png'), 'dataUrl produced');

// Visual preview: open in a new tab
window.open(card.dataUrl);

console.log('OK share-card.js — preview opened in new tab');
```

A new tab should open showing the rendered share card.

- [ ] **Step 3: Commit**

```bash
git add js/share-card.js
git commit -m "Add share-card renderer"
```

---

## Task 3.9: Wire share modal + button into game-over

**Files:**
- Modify: `index.html` — add share modal.
- Modify: `style/_modals.css` — add share modal styles.
- Modify: `js/main.js` — wire the share button.

- [ ] **Step 1: Add the share modal markup**

In `index.html`, near the existing `<div class="modal" id="save-modal" hidden>`, add a sibling:

```html
  <!-- Share modal -->
  <div class="modal" id="share-modal" hidden>
    <div class="modal-inner share-modal-inner">
      <h3>SHARE YOUR RUN</h3>
      <img class="share-preview" id="share-preview" alt="Your run" />
      <div class="modal-buttons">
        <button class="btn" id="share-close">Close</button>
        <button class="btn" id="share-copy">Copy</button>
        <button class="btn primary" id="share-download">Download</button>
      </div>
    </div>
  </div>
```

- [ ] **Step 2: Style the share modal**

Append to `style/_modals.css`:

```css
.share-modal-inner { max-width: min(420px, 92vw); }
.share-preview {
  display: block;
  width: 100%;
  height: auto;
  max-height: 60vh;
  object-fit: contain;
  background: #0d1b3d;
  border: 3px solid var(--frame-dark);
  border-radius: 4px;
}
```

- [ ] **Step 3: Wire the share button**

Add this function in `js/main.js` near the other game-over helpers:

```js
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
```

Then in `wirePlayHud()` add:

```js
  document.getElementById('btn-share').addEventListener('click', openShareModal);
```

- [ ] **Step 4: Expose `theme` on the Game instance**

In `js/game.js`, in the constructor or wherever `pickTheme()` is called, store the chosen theme on `this`:

```js
    this.theme = options.themeOverride || pickTheme();
```

(`themeOverride` is a forward-reference to Phase 4 Settings; default to `pickTheme()` for now.)

- [ ] **Step 5: Verify**

Hard-refresh. Crash. Click SHARE. Modal opens, preview renders. Click Download → PNG saves. Click Copy → either "Copied!" (Chrome) or "Unavailable" (Safari fallback).

- [ ] **Step 6: Commit**

```bash
git add index.html style/_modals.css js/main.js js/game.js
git commit -m "Wire share modal with download and copy"
```

---

## Task 3.10: Populate game-over icons

**Files:**
- Modify: `js/main.js` — `populateMenuGlyphs()` (rename + reuse, or call again after game-over opens).

- [ ] **Step 1: Make the glyph populator re-runnable**

The current `populateMenuGlyphs()` runs once on init. The game-over icons (`data-glyph="coin"` etc.) won't be populated unless we re-run after the overlay shows. Modify the existing function to be idempotent (clear before populating):

The function already does `el.innerHTML = ''` then appends — so it IS idempotent. But it runs once at init when the overlay is `hidden`. The `data-glyph` elements still exist in the DOM, just not visible. So they should be populated already. Verify:

Hard-refresh. Crash. Inspect a `.run-stat-icon` in DevTools — does it contain a `<svg>`? If yes, done.

If empty, force a re-populate by calling `populateMenuGlyphs()` at the start of `animateRunSummary()`.

- [ ] **Step 2: Add to `animateRunSummary()` start if needed**

```js
function animateRunSummary({ coins, nearMisses, bestCombo, flaps, durationMs }) {
  populateMenuGlyphs();   // safe re-run
  // ... rest of existing function
}
```

- [ ] **Step 3: Visually verify game-over has crisp pixel icons**

Hard-refresh, crash, inspect run summary — every row has a glyph SVG visible.

- [ ] **Step 4: Commit**

```bash
git add js/main.js
git commit -m "Ensure game-over icons render after overlay opens"
```

---

## Phase 3 wrap-up

Play HUD has live combo + counters. Game-over has letter grade, confetti, inline unlock, and share card with download + copy. Stop point.

---

# PHASE 4 — SETTINGS + INTRO

## Task 4.1: Add Settings screen markup

**Files:**
- Modify: `index.html` — add `<section id="screen-settings">`.

- [ ] **Step 1: Add the settings section**

In `index.html`, after `<section id="screen-aviary">...</section>`, add:

```html
  <!-- SETTINGS SCREEN -->
  <section id="screen-settings" class="screen">
    <header class="screen-header">
      <button class="hud-btn" id="settings-back" data-glyph="close" aria-label="Back"></button>
      <h2>SETTINGS</h2>
    </header>
    <div class="settings-body">
      <section class="settings-group pix-frame">
        <h3>SOUND</h3>
        <div class="setting-row">
          <label for="set-volume">Volume</label>
          <input type="range" id="set-volume" min="0" max="1" step="0.01" />
        </div>
        <div class="setting-row">
          <label for="set-muted">Mute</label>
          <button class="pix-toggle" id="set-muted" data-key="muted"></button>
        </div>
      </section>

      <section class="settings-group pix-frame">
        <h3>FEEL</h3>
        <div class="setting-row">
          <label for="set-haptics">Haptics (mobile)</label>
          <button class="pix-toggle" id="set-haptics" data-key="haptics"></button>
        </div>
        <div class="setting-row">
          <label for="set-scanlines">Scanlines</label>
          <button class="pix-toggle" id="set-scanlines" data-key="scanlines"></button>
        </div>
        <div class="setting-row">
          <label for="set-grain">Grain</label>
          <button class="pix-toggle" id="set-grain" data-key="grain"></button>
        </div>
        <div class="setting-row">
          <label for="set-reducedMotion">Reduced motion</label>
          <select id="set-reducedMotion" class="pix-select">
            <option value="auto">Auto</option>
            <option value="true">On</option>
            <option value="false">Off</option>
          </select>
        </div>
      </section>

      <section class="settings-group pix-frame">
        <h3>GAME</h3>
        <div class="setting-row">
          <label for="set-themeLock">Theme</label>
          <select id="set-themeLock" class="pix-select">
            <option value="auto">Auto (random)</option>
            <option value="day">Day</option>
            <option value="dusk">Dusk</option>
            <option value="night">Night</option>
          </select>
        </div>
      </section>

      <section class="settings-group pix-frame settings-danger">
        <h3>DANGER</h3>
        <button class="btn ghost" id="settings-reset">RESET ALL DATA</button>
      </section>
    </div>
  </section>
```

- [ ] **Step 2: Add the screens map entry in `js/main.js`**

Find the `screens` constant near the top of `js/main.js`:

```js
const screens = {
  menu: document.getElementById('screen-menu'),
  play: document.getElementById('screen-play'),
  editor: document.getElementById('screen-editor'),
  levels: document.getElementById('screen-levels'),
  aviary: document.getElementById('screen-aviary'),
};
```

Add a settings entry:

```js
  settings: document.getElementById('screen-settings'),
```

(Variable name `screens.settings` is fine — won't collide with the `settings` import as long as imports use named not default.)

- [ ] **Step 3: Commit**

```bash
git add index.html js/main.js
git commit -m "Add settings screen markup"
```

---

## Task 4.2: Style settings screen

**Files:**
- Modify: `style/_settings.css`

- [ ] **Step 1: Replace `style/_settings.css` with**

```css
/* style/_settings.css */

#screen-settings {
  background: linear-gradient(180deg, var(--sky-top), var(--sky-bottom));
  color: var(--ink);
  padding-top: env(safe-area-inset-top);
  overflow-y: auto;
}

.settings-body {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 0 14px env(safe-area-inset-bottom);
  overflow-y: auto;
  flex: 1;
}

.settings-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px 14px;
}
.settings-group h3 {
  margin: 0 0 4px;
  font-family: var(--font-pixel);
  font-size: 12px;
  letter-spacing: 2px;
  color: var(--ink);
  border-bottom: 2px solid rgba(29,43,74,0.2);
  padding-bottom: 6px;
}
.setting-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  min-height: var(--tap);
  font-family: var(--font-pixel);
  font-size: 11px;
  letter-spacing: 1px;
}

.pix-toggle {
  width: 56px;
  height: 28px;
  border: 3px solid var(--frame-dark);
  border-radius: 4px;
  background: var(--bg-2);
  position: relative;
  cursor: pointer;
}
.pix-toggle::after {
  content: '';
  position: absolute;
  top: 2px; left: 2px;
  width: 18px; height: 18px;
  background: var(--text);
  transition: left 0.12s ease;
}
.pix-toggle[aria-pressed="true"] {
  background: var(--accent);
}
.pix-toggle[aria-pressed="true"]::after { left: 30px; background: var(--ink); }

.pix-select {
  padding: 4px 8px;
  border: 3px solid var(--frame-dark);
  border-radius: 4px;
  background: var(--bg-2);
  color: var(--text);
  font-family: var(--font-pixel);
  font-size: 11px;
}

input[type="range"]#set-volume {
  flex: 1;
  max-width: 60%;
}

.settings-danger { border-color: var(--accent-2); }
```

- [ ] **Step 2: Visually verify by manually navigating to settings**

In the console:

```js
document.getElementById('screen-menu').classList.remove('active');
document.getElementById('screen-settings').classList.add('active');
```

You should see a styled settings page with 4 groups. Reset:

```js
document.getElementById('screen-settings').classList.remove('active');
document.getElementById('screen-menu').classList.add('active');
```

- [ ] **Step 3: Commit**

```bash
git add style/_settings.css
git commit -m "Style settings screen"
```

---

## Task 4.3: Wire settings controls + gear button

**Files:**
- Modify: `js/main.js` — add `wireSettings()`, `openSettings()`.

- [ ] **Step 1: Add wiring**

Add to `js/main.js`:

```js
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
    audio.setGain?.(Number(e.target.value));   // see step 2 — adds setGain to AudioBus
  });

  document.querySelectorAll('.pix-toggle').forEach(btn => {
    btn.addEventListener('click', () => {
      const key = btn.dataset.key;
      const cur = settings.get(key);
      settings.set(key, !cur);
      btn.setAttribute('aria-pressed', String(!cur));
      // Mute special-case: keep AudioBus in sync
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
```

- [ ] **Step 2: Add `setGain(value)` to AudioBus in `js/effects.js`**

In `js/effects.js`, find the `AudioBus` class. If it doesn't already have a master gain node, add one. Look for `this.ctx` and the play methods. Add:

```js
  ensureContext() {
    if (this.ctx) return;
    this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    this.master = this.ctx.createGain();
    this.master.gain.value = this._gain ?? 0.7;
    this.master.connect(this.ctx.destination);
  }

  setGain(v) {
    this._gain = v;
    if (this.master) this.master.gain.value = v;
  }
```

Then every `connect(this.ctx.destination)` in `play()` should become `connect(this.master)`. Search for `.connect(this.ctx.destination)` in effects.js and replace each with `.connect(this.master || this.ctx.destination)`.

- [ ] **Step 3: Apply volume + muted from settings on boot**

In `init()` add (after `installUiFx()`):

```js
  audio.setMuted(settings.get('muted'));
  audio.ensureContext();
  audio.setGain(settings.get('volume'));
```

- [ ] **Step 4: Call `wireSettings()` in `init()`**

```js
  wireSettings();
```

- [ ] **Step 5: Verify**

Hard-refresh. Click gear → settings opens.
- Drag volume slider → audible volume change on next button hover sound.
- Toggle Scanlines → CRT overlay disappears/reappears live.
- Toggle Grain → grain overlay disappears/reappears.
- Toggle Mute → button graphic on menu (muted indicator) reflects state.
- Change Theme to "Night" → next game forces night theme (verified in next step).
- Click Back → return to menu.

- [ ] **Step 6: Honor theme-lock in `Game` constructor**

In `js/game.js`, change the theme assignment:

```js
    this.theme = options.themeOverride || pickTheme();
```

In `js/main.js` `startGame()`, pass it:

```js
import { settings } from './settings.js'; // already imported

  currentGame = new Game(canvas, {
    ...options,
    themeOverride: settings.get('themeLock') !== 'auto' ? settings.get('themeLock') : null,
    onScore: ...
```

Verify by setting Theme = Night and starting a run — sky should be the night theme.

- [ ] **Step 7: Commit**

```bash
git add js/main.js js/game.js js/effects.js
git commit -m "Wire settings: volume, toggles, theme-lock, reset"
```

---

## Task 4.4: Add first-run intro overlay

**Files:**
- Create: `js/intro.js`
- Modify: `style/_intro.css`
- Modify: `js/main.js` — call `maybeShowIntro()` after init.

- [ ] **Step 1: Create `js/intro.js`**

```js
// js/intro.js — first-run 4-slide tap-through overlay over the menu.

const KEY = 'ff.intro.seen';

const SLIDES = [
  { title: 'WELCOME',  body: 'Upload your face. Become a bird.', target: '#customize-toggle' },
  { title: 'PICK',     body: 'Choose what to do.',                target: '#cat-play' },
  { title: 'OR BUILD', body: 'Make your own level.',             target: '#cat-make' },
  { title: 'GO',       body: "Hit GO. Don't die.",                target: '[data-go="play-random"]' },
];

export function maybeShowIntro({ onComplete } = {}) {
  if (localStorage.getItem(KEY) === '1') return Promise.resolve(false);
  return new Promise(resolve => {
    const root = document.createElement('div');
    root.className = 'intro-root';
    document.body.appendChild(root);
    let i = 0;

    function expandCustomize() {
      // Auto-open the customize drawer for slide 0 highlight.
      const t = document.getElementById('customize-toggle');
      const body = document.querySelector('.customize-body');
      if (body && body.hidden) t?.click();
    }

    function render() {
      const s = SLIDES[i];
      const target = document.querySelector(s.target);
      const rect = target ? target.getBoundingClientRect() : { left: 0, top: 0, width: 0, height: 0 };
      root.innerHTML = `
        <div class="intro-dim"></div>
        <div class="intro-spotlight" style="left:${rect.left - 8}px;top:${rect.top - 8}px;width:${rect.width + 16}px;height:${rect.height + 16}px"></div>
        <div class="intro-card">
          <div class="intro-step">${i + 1} / ${SLIDES.length}</div>
          <div class="intro-title">${s.title}</div>
          <div class="intro-body">${s.body}</div>
          <div class="intro-buttons">
            <button class="btn ghost" id="intro-skip">SKIP</button>
            <button class="btn primary" id="intro-next">${i === SLIDES.length - 1 ? "LET'S GO" : 'NEXT'}</button>
          </div>
        </div>`;
      root.querySelector('#intro-skip').onclick = finish;
      root.querySelector('#intro-next').onclick = next;
      if (s.target === '#customize-toggle') expandCustomize();
    }

    function next() {
      i++;
      if (i >= SLIDES.length) finish();
      else render();
    }

    function finish() {
      try { localStorage.setItem(KEY, '1'); } catch {}
      root.remove();
      onComplete?.();
      resolve(true);
    }

    render();
    window.addEventListener('resize', render);
  });
}
```

- [ ] **Step 2: Style the intro overlay**

Replace `style/_intro.css` with:

```css
/* style/_intro.css */

.intro-root {
  position: fixed;
  inset: 0;
  z-index: var(--z-intro);
  font-family: var(--font-pixel);
}
.intro-dim {
  position: absolute;
  inset: 0;
  background: rgba(0,0,0,0.65);
}
.intro-spotlight {
  position: absolute;
  border: 3px solid var(--accent);
  border-radius: 6px;
  box-shadow: 0 0 0 9999px rgba(0,0,0,0.55), 0 0 24px rgba(255,209,102,0.7);
  pointer-events: none;
  transition: all 0.25s ease;
}
.intro-card {
  position: absolute;
  left: 50%;
  bottom: calc(env(safe-area-inset-bottom) + 24px);
  transform: translateX(-50%);
  background: var(--bg-2);
  color: var(--text);
  padding: 16px 18px;
  border: 3px solid var(--accent);
  border-radius: 4px;
  box-shadow: var(--pix-shadow-1);
  max-width: min(360px, 90vw);
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.intro-step { font-size: 9px; letter-spacing: 2px; color: var(--accent); }
.intro-title { font-family: var(--font-display); font-size: 24px; letter-spacing: 1px; }
.intro-body { font-family: var(--font-game); font-size: 16px; opacity: 0.85; }
.intro-buttons { display: flex; gap: 8px; justify-content: flex-end; margin-top: 4px; }
```

- [ ] **Step 3: Trigger from `init()`**

In `js/main.js`, near the end of `init()`:

```js
  import('./intro.js').then(({ maybeShowIntro }) => maybeShowIntro({}));
```

- [ ] **Step 4: Verify**

Clear `localStorage`: `localStorage.removeItem('ff.intro.seen');`
Hard-refresh. Intro overlay should appear with slide 1 spotlighting CUSTOMIZE. Click Next 3 times → spotlights cycle through cat tiles. Last button says "LET'S GO" → closes.

Verify it doesn't reappear on next refresh.

- [ ] **Step 5: Commit**

```bash
git add js/intro.js style/_intro.css js/main.js
git commit -m "Add first-run intro overlay"
```

---

## Phase 4 wrap-up

Settings screen fully functional with live updates. First-run intro shows once. Stop point.

---

# PHASE 5 — AVIARY + LEVELS + EDITOR POLISH

## Task 5.1: Aviary — tilt on pointer move

**Files:**
- Modify: `js/main.js` — extend the aviary render to attach a tilt handler per tile.
- Modify: `style/_aviary.css` — set perspective on parent.

- [ ] **Step 1: Add CSS perspective**

In `style/_aviary.css`, find `.aviary-grid` and add:

```css
  perspective: 800px;
```

In `.bird-card`, replace `transition: transform 0.1s ease, ...` with:

```css
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
  transform-style: preserve-3d;
  will-change: transform;
```

- [ ] **Step 2: Attach pointer tilt in `renderAviary()`**

In `js/main.js` `renderAviary()`, inside the `allEntries.forEach(...)` loop, after `grid.appendChild(card);` add (still inside the loop):

```js
    let tiltRaf = 0;
    card.addEventListener('pointermove', (e) => {
      const r = card.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width;   // 0..1
      const y = (e.clientY - r.top) / r.height;
      const rx = (0.5 - y) * 8;   // deg
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
```

- [ ] **Step 3: Verify**

Navigate to Aviary. Move pointer over a tile → tile tilts toward the pointer. Leave → returns flat.

- [ ] **Step 4: Commit**

```bash
git add js/main.js style/_aviary.css
git commit -m "Aviary: pointer-tracking tilt on tiles"
```

---

## Task 5.2: Aviary — sparkle particles on selected tile

**Files:**
- Modify: `js/main.js` — `paintAnimatedTile()` to also draw sparkles when `entry.id === selectedId`.

- [ ] **Step 1: Track selectedId per tile**

In `renderAviary()` where `aviaryTiles.push({...})` happens, include `selected: entry.id === selectedId`.

- [ ] **Step 2: Draw sparkles in `paintAnimatedTile()`**

After the existing draw code in `paintAnimatedTile()`, before the final brace, add:

```js
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
```

- [ ] **Step 3: Verify**

Navigate to Aviary. Selected tile should have small gold sparkles orbiting its bird.

- [ ] **Step 4: Commit**

```bash
git add js/main.js
git commit -m "Aviary: sparkle particles on selected tile"
```

---

## Task 5.3: Aviary — group headers

**Files:**
- Modify: `js/main.js` — `renderAviary()` to insert headers; `style/_aviary.css` for header styles.

- [ ] **Step 1: Refactor `renderAviary()` to group entries**

Replace the `allEntries.forEach(...)` loop with grouping logic:

```js
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

  for (const { key, label } of order) {
    if (!groups[key].length) continue;
    const h = document.createElement('div');
    h.className = 'aviary-group-header';
    h.textContent = label;
    grid.appendChild(h);
    for (const entry of groups[key]) {
      // ... existing per-entry card-creation code (kept verbatim, including tilt + sparkles + canvas registration)
    }
  }
```

You may keep the existing card-creation code as an inner function `function makeCard(entry, index) { ... return card; }` to avoid duplication.

- [ ] **Step 2: Style group headers + adjust grid**

In `style/_aviary.css`:

```css
.aviary-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
  gap: 12px;
  padding: 8px 14px env(safe-area-inset-bottom);
  overflow-y: auto;
  flex: 1;
  perspective: 800px;
}
.aviary-group-header {
  grid-column: 1 / -1;
  font-family: var(--font-pixel);
  font-size: 12px;
  letter-spacing: 3px;
  color: var(--ink);
  padding: 12px 4px 4px;
  border-bottom: 3px dashed rgba(29,43,74,0.3);
}
```

- [ ] **Step 3: Verify**

Aviary now shows headers above each group. If no photo uploaded, "YOUR FACE" header is hidden.

- [ ] **Step 4: Commit**

```bash
git add js/main.js style/_aviary.css
git commit -m "Aviary: group headers (Your Face / Earned / Locked)"
```

---

## Task 5.4: Create `js/level-thumbnail.js`

**Files:**
- Create: `js/level-thumbnail.js`

- [ ] **Step 1: Create the module**

```js
// js/level-thumbnail.js — renders a small canvas preview of a level + difficulty estimate.

export function renderLevelThumbnail(level, canvas) {
  const w = canvas.width;
  const h = canvas.height;
  const ctx = canvas.getContext('2d');
  // Sky
  const grad = ctx.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, '#5eb3d6');
  grad.addColorStop(1, '#d2eef4');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  // Ground band
  ctx.fillStyle = '#3a7a3a';
  ctx.fillRect(0, h - 6, w, 6);

  if (!level || !level.obstacles?.length) return;

  // Pipes: project across width
  const minX = Math.min(...level.obstacles.map(o => o.x));
  const maxX = Math.max(...level.obstacles.map(o => o.x));
  const range = Math.max(1, maxX - minX);
  ctx.fillStyle = '#0d1b3d';
  for (const o of level.obstacles) {
    const x = ((o.x - minX) / range) * (w - 4) + 2;
    // gap centered at o.gapY
    const totalH = h - 6;
    const gapTop = (o.gapY - level.gap / 2) / 600 * totalH;
    const gapBot = (o.gapY + level.gap / 2) / 600 * totalH;
    ctx.fillRect(x - 1, 0, 3, Math.max(0, gapTop));
    ctx.fillRect(x - 1, gapBot, 3, Math.max(0, totalH - gapBot));
  }
}

export function difficultyOf(level) {
  if (!level || !level.obstacles?.length) return 'EASY';
  const count = level.obstacles.length;
  const avgGap = level.gap;   // gap is uniform per level today
  if (avgGap <= 110 || count >= 15) return 'HARD';
  if (avgGap >= 180 || count <= 5)  return 'EASY';
  return 'MED';
}
```

- [ ] **Step 2: Inline browser-console test**

```js
const lt = await import('./js/level-thumbnail.js?bust=' + Date.now());
console.assert(lt.difficultyOf({ obstacles: [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16], gap: 150 }) === 'HARD', 'lots of pipes → HARD');
console.assert(lt.difficultyOf({ obstacles: [1,2,3], gap: 200 }) === 'EASY', 'few wide gaps → EASY');
console.assert(lt.difficultyOf({ obstacles: [1,2,3,4,5,6,7,8], gap: 150 }) === 'MED', 'moderate → MED');

const c = document.createElement('canvas');
c.width = 64; c.height = 48;
lt.renderLevelThumbnail({ obstacles: [{x:100,gapY:300},{x:300,gapY:200},{x:500,gapY:400}], gap: 150 }, c);
console.log('OK level-thumbnail; preview dataUrl below');
console.log(c.toDataURL());
```

Paste the printed `data:image/png;...` URL into a new tab — you should see a thumbnail with pipes.

- [ ] **Step 3: Commit**

```bash
git add js/level-thumbnail.js
git commit -m "Add level thumbnail renderer + difficulty estimator"
```

---

## Task 5.5: Add level meta fields + migration in `js/storage.js`

**Files:**
- Modify: `js/storage.js`

- [ ] **Step 1: Add a migration helper**

In `js/storage.js`, after the existing `loadLevels()` function, modify it to migrate missing fields:

```js
export function loadLevels() {
  let raw;
  try { raw = JSON.parse(localStorage.getItem('ff.levels') || '[]'); }
  catch { raw = []; }
  return raw.map(l => ({
    lastPlayedAt: l.lastPlayedAt ?? null,
    bestScore:    l.bestScore    ?? 0,
    playCount:    l.playCount    ?? 0,
    ...l,   // existing fields override defaults if present (this preserves saved data)
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
```

(The `...l` spread at the end ensures existing values win; the defaults only fill in missing keys.)

- [ ] **Step 2: Wire `recordLevelPlay` from `js/main.js`**

In `startGame()`, when `options.mode === 'custom'`, capture the level name to record on game-over.

In the `onGameOver` callback, add at the top:

```js
      if (options.mode === 'custom' && options.level?.name && options.level.name !== '__test__') {
        recordLevelPlay(options.level.name, score);
      }
```

Add import: in the existing storage import block, add `recordLevelPlay`:

```js
import {
  ..., recordLevelPlay,
} from './storage.js';
```

- [ ] **Step 3: Verify**

Play a saved level, crash. Check console: `JSON.parse(localStorage['ff.levels'])` — selected level should now have `lastPlayedAt` (epoch ms) and `playCount: 1`.

- [ ] **Step 4: Commit**

```bash
git add js/storage.js js/main.js
git commit -m "Track per-level last played + best score + play count"
```

---

## Task 5.6: Update Levels list rows with thumbnails + best + sort/filter

**Files:**
- Modify: `index.html` — add sort/filter chips above list.
- Modify: `style/_levels.css`.
- Modify: `js/main.js` — `refreshLevelsList()`.

- [ ] **Step 1: Add sort chips to `index.html`**

Inside `<section id="screen-levels">`, between the `<header>` and `<ul id="levels-list">`, add:

```html
    <div class="levels-sort">
      <button class="sort-chip active" data-sort="newest">NEWEST</button>
      <button class="sort-chip" data-sort="best">BEST</button>
      <button class="sort-chip" data-sort="hardest">HARDEST</button>
    </div>
```

- [ ] **Step 2: Replace `style/_levels.css`**

```css
/* style/_levels.css */

#screen-levels {
  background: linear-gradient(180deg, var(--sky-top), var(--sky-bottom));
  padding-top: env(safe-area-inset-top);
  color: var(--ink);
}
.screen-header {
  display: flex; align-items: center; gap: 12px;
  padding: 12px;
}
.screen-header h2 {
  margin: 0;
  font-family: var(--font-display);
  font-size: 26px;
  letter-spacing: 1px;
}
.levels-sort {
  display: flex; gap: 6px; padding: 0 12px 8px;
}
.sort-chip {
  font-family: var(--font-pixel);
  font-size: 10px;
  letter-spacing: 1px;
  padding: 6px 10px;
  border: 2px solid var(--frame-dark);
  border-radius: 4px;
  background: var(--panel-light);
  color: var(--ink);
  cursor: pointer;
}
.sort-chip.active { background: var(--accent); }

.levels-list { list-style: none; margin: 0; padding: 0 12px 24px; overflow-y: auto; flex: 1; }

.level-item {
  display: grid;
  grid-template-columns: 64px 1fr auto;
  gap: 10px;
  padding: 10px;
  background: var(--panel-light);
  border: 3px solid var(--frame-dark);
  border-radius: 4px;
  margin-bottom: 8px;
  box-shadow: var(--pix-shadow-1);
  align-items: center;
}
.level-thumb { width: 64px; height: 48px; border: 2px solid var(--frame-dark); border-radius: 2px; image-rendering: pixelated; }
.level-meta { min-width: 0; }
.level-meta .name {
  font-family: var(--font-pixel);
  font-size: 12px;
  letter-spacing: 1px;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  color: var(--ink);
}
.level-meta .stats {
  font-family: var(--font-pixel);
  font-size: 9px;
  letter-spacing: 1px;
  color: rgba(29,43,74,0.7);
  margin-top: 2px;
}
.level-meta .best { color: var(--accent-2); }
.level-actions { display: flex; gap: 4px; flex-wrap: wrap; justify-content: flex-end; }

.empty-msg {
  color: var(--ink);
  text-align: center;
  padding: 24px;
  font-family: var(--font-pixel);
  font-size: 12px;
}
```

- [ ] **Step 3: Replace `refreshLevelsList()` in `js/main.js`**

```js
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
      // hardest = fewest gaps = lowest gap value; tiebreak by pipe count desc
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

    // Render thumbnail + difficulty async-friendly
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
```

Call `wireSortChips()` in `init()`.

- [ ] **Step 4: Verify**

Navigate to MAKE → IMPORT or build a level + save. Then PLAY → MY MAPS. Should see:
- Each row: thumbnail (left), name + stats (middle), action buttons (right).
- Sort chips at top — click each, list re-orders.

- [ ] **Step 5: Commit**

```bash
git add index.html style/_levels.css js/main.js
git commit -m "Levels list: thumbnails, difficulty, best score, sort chips"
```

---

## Task 5.7: Editor — grid overlay + snap toggle

**Files:**
- Modify: `index.html` — add grid toggle to editor toolbar.
- Modify: `js/editor.js` — render grid + snap on placement.

- [ ] **Step 1: Add toolbar buttons to `index.html`**

In `<section id="screen-editor">`, replace the `.editor-toolbar.top` block with:

```html
    <div class="editor-toolbar top">
      <button class="hud-btn" id="ed-back" data-glyph="close" aria-label="Back"></button>
      <div class="ed-tool-group">
        <button class="tool-btn active" data-tool="add">+</button>
        <button class="tool-btn" data-tool="move">M</button>
        <button class="tool-btn" data-tool="delete">-</button>
      </div>
      <div class="ed-tool-group">
        <button class="hud-btn" id="ed-undo" data-glyph="undo" aria-label="Undo"></button>
        <button class="hud-btn" id="ed-redo" data-glyph="redo" aria-label="Redo"></button>
        <button class="hud-btn" id="ed-grid" data-glyph="grid" aria-label="Grid"></button>
      </div>
      <canvas class="ed-mini" id="ed-mini" width="160" height="60"></canvas>
      <button class="hud-btn" id="ed-test">&#9654;</button>
    </div>
```

And replace the `.editor-toolbar.bottom` block with:

```html
    <div class="editor-toolbar bottom">
      <label class="slider-label">Gap
        <input type="range" id="ed-gap" min="80" max="260" value="150" step="5" />
      </label>
      <span class="ed-meta" id="ed-meta">0 pipes · EASY</span>
      <button class="btn small" id="ed-save">Save</button>
      <button class="btn small" id="ed-export">Export</button>
      <label class="btn small" for="ed-import-file">Import
        <input type="file" id="ed-import-file" accept="application/json,.json" hidden />
      </label>
      <button class="btn small ghost" id="ed-clear">Clear</button>
    </div>
```

- [ ] **Step 2: Add editor CSS for grid / mini / meta**

Append to `style/_editor.css`:

```css
.ed-mini {
  border: 2px solid var(--frame-dark);
  border-radius: 2px;
  width: 160px;
  height: 60px;
  image-rendering: pixelated;
  cursor: pointer;
  background: #0d1b3d;
}
.ed-meta {
  font-family: var(--font-pixel);
  font-size: 10px;
  color: var(--text);
  background: var(--panel);
  padding: 4px 10px;
  border-radius: 4px;
}
.editor-toolbar.top {
  flex-wrap: wrap;
}
```

- [ ] **Step 3: Add grid rendering + snap to `js/editor.js`**

In `js/editor.js`, the Editor class has a render method (look for `draw()` / `render()` / `tick()`). Find where it draws pipes. Before the pipe-draw loop, render the grid if enabled:

```js
    if (this.showGrid) {
      const grid = 40;
      ctx.strokeStyle = 'rgba(255,255,255,0.1)';
      ctx.lineWidth = 1;
      for (let x = -this.scrollX % grid; x < viewW; x += grid) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, viewH); ctx.stroke();
      }
      for (let y = 0; y < viewH; y += grid) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(viewW, y); ctx.stroke();
      }
    }
```

Initialize `this.showGrid = true; this.snapToGrid = true;` in the constructor.

Wherever an obstacle is placed (search for `obstacles.push(`), if `this.snapToGrid` then snap the coordinates:

```js
    if (this.snapToGrid) {
      x = Math.round(x / 40) * 40;
      gapY = Math.round(gapY / 40) * 40;
    }
```

- [ ] **Step 4: Wire the new buttons in `js/main.js`**

In `wireEditor()`, add:

```js
  document.getElementById('ed-grid').addEventListener('click', () => {
    if (!currentEditor) return;
    currentEditor.showGrid = !currentEditor.showGrid;
    currentEditor.snapToGrid = currentEditor.showGrid;   // tie snap to grid for simplicity
  });
```

- [ ] **Step 5: Verify**

Open editor. Click grid icon → grid disappears. Click again → re-appears. Drop a pipe with grid ON → it lands on a 40px boundary.

- [ ] **Step 6: Commit**

```bash
git add index.html style/_editor.css js/editor.js js/main.js
git commit -m "Editor: grid overlay + snap-to-grid toggle"
```

---

## Task 5.8: Editor — undo/redo

**Files:**
- Modify: `js/editor.js`

- [ ] **Step 1: Add an undo stack to Editor**

In the Editor constructor:

```js
    this.undoStack = [];
    this.redoStack = [];
```

Add helpers:

```js
  snapshot() {
    this.undoStack.push(JSON.stringify(this.obstacles));
    if (this.undoStack.length > 30) this.undoStack.shift();
    this.redoStack.length = 0;
  }
  undo() {
    if (!this.undoStack.length) return;
    this.redoStack.push(JSON.stringify(this.obstacles));
    this.obstacles = JSON.parse(this.undoStack.pop());
  }
  redo() {
    if (!this.redoStack.length) return;
    this.undoStack.push(JSON.stringify(this.obstacles));
    this.obstacles = JSON.parse(this.redoStack.pop());
  }
```

Call `this.snapshot()` before EVERY mutation: pipe add, pipe delete, pipe move-commit, clear. Search the file for `obstacles.push`, `obstacles.splice`, and add `this.snapshot()` immediately before each.

- [ ] **Step 2: Wire buttons + keyboard in `js/main.js`**

In `wireEditor()`, add:

```js
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
```

- [ ] **Step 3: Verify**

Editor: place 3 pipes, undo 3 times — all gone. Ctrl+Shift+Z to redo. Use buttons too.

- [ ] **Step 4: Commit**

```bash
git add js/editor.js js/main.js
git commit -m "Editor: undo/redo with keyboard shortcuts"
```

---

## Task 5.9: Editor — mini preview canvas

**Files:**
- Modify: `js/main.js` — render mini preview each frame or on change.

- [ ] **Step 1: Hook mini-preview rendering**

In `js/main.js` `openEditor()`, after `currentEditor.start(initial)`:

```js
  const mini = document.getElementById('ed-mini');
  mini.addEventListener('click', (e) => {
    if (!currentEditor) return;
    const r = mini.getBoundingClientRect();
    const ratio = (e.clientX - r.left) / r.width;   // 0..1
    const totalW = currentEditor.totalWidth?.() ?? (currentEditor.obstacles.length * 200);
    currentEditor.scrollX = ratio * totalW;
  });

  // Periodic refresh while in editor
  const renderMini = () => {
    if (!currentEditor) return;
    import('./level-thumbnail.js').then(({ renderLevelThumbnail }) => {
      const fakeLevel = { obstacles: currentEditor.obstacles, gap: currentEditor.gap };
      renderLevelThumbnail(fakeLevel, mini);
    });
    miniRaf = requestAnimationFrame(renderMini);
  };
  let miniRaf = requestAnimationFrame(renderMini);
  // Cancel on exit
  currentEditor._miniRaf = miniRaf;
```

Note: if `currentEditor.totalWidth()` doesn't exist, you can compute it as `Math.max(...obstacles.map(o => o.x)) + 200`. Adjust as needed by reading the editor file.

Cancel the RAF in `exitToMenu()`:

```js
  if (currentEditor?._miniRaf) cancelAnimationFrame(currentEditor._miniRaf);
```

- [ ] **Step 2: Verify**

In editor: drop pipes, mini-preview reflects them. Click on mini-preview → editor scrolls to that position.

- [ ] **Step 3: Commit**

```bash
git add js/main.js
git commit -m "Editor: mini-preview canvas with scroll-jump"
```

---

## Task 5.10: Editor — pipe count + difficulty meta

**Files:**
- Modify: `js/main.js` — update meta on changes.

- [ ] **Step 1: Refresh meta in render loop**

In the `renderMini` function from Task 5.9, also update the meta text:

```js
  const renderMini = () => {
    if (!currentEditor) return;
    import('./level-thumbnail.js').then(({ renderLevelThumbnail, difficultyOf }) => {
      const fakeLevel = { obstacles: currentEditor.obstacles, gap: currentEditor.gap };
      renderLevelThumbnail(fakeLevel, mini);
      document.getElementById('ed-meta').textContent =
        `${currentEditor.obstacles.length} pipes · ${difficultyOf(fakeLevel)}`;
    });
    miniRaf = requestAnimationFrame(renderMini);
  };
```

- [ ] **Step 2: Verify**

Drop pipes → meta updates pipe count + difficulty live.

- [ ] **Step 3: Commit**

```bash
git add js/main.js
git commit -m "Editor: live pipe count + difficulty in toolbar"
```

---

## Phase 5 wrap-up

Aviary has tilt + sparkles + groups. Levels list has thumbnails + sort + best score. Editor has grid + undo + mini-preview + difficulty meter. Stop point.

---

# PHASE 6 — TRANSITIONS PASS + FINAL POLISH

## Task 6.1: Audit every screen change uses `transition()`

**Files:**
- Modify: `js/main.js` — every direct `screen.classList.toggle('active', ...)` outside `show()`.

- [ ] **Step 1: Search for stray screen switches**

```
grep -n "classList.toggle('active'" js/main.js
grep -n "classList.add('active'" js/main.js
grep -n "classList.remove('active'" js/main.js
```

Apart from the one inside `show()`, there should be no others related to screens. If you find any, replace them with a call to `show('targetname')`.

(Use the Grep tool; results pasted directly into a TODO list to walk through.)

- [ ] **Step 2: Manual verification**

Visit every screen and confirm wipes occur:
- Menu → Play
- Play → Game-over (overlay, NO wipe — overlays use opacity)
- Game-over → Menu
- Menu → Editor
- Editor → Menu
- Menu → Levels
- Levels → Editor
- Levels → Play
- Menu → Aviary
- Aviary → Menu
- Menu → Settings
- Settings → Menu

- [ ] **Step 3: Commit (if any code changed)**

```bash
git add js/main.js
git commit -m "Ensure all screen switches use transition wrapper"
```

If nothing changed, skip the commit.

---

## Task 6.2: Mobile-width audit (375×667)

**Files:**
- Possibly: any `style/_*.css` files needing tweaks.

- [ ] **Step 1: Open DevTools → Toggle device toolbar → iPhone SE (375×667)**

Walk through every screen, looking for:
- Overflow / cut-off elements
- Tap targets < 44px
- Text overflowing buttons
- Stats ribbon clipping
- Settings screen sections clipping

- [ ] **Step 2: Fix any issues found**

Common fixes:
- Reduce padding on `.cat-tile` to `12px 4px 8px` if labels clip
- Reduce `.title` font-size clamp lower bound
- Wrap any single-row layout in `flex-wrap: wrap`
- Confirm `.gameover-buttons` width caps at `min(280px, 84vw)` (it already does)

Make whatever specific edits are needed; commit per file group.

- [ ] **Step 3: Commit**

```bash
git add style/
git commit -m "Mobile width polish pass"
```

---

## Task 6.3: Reduced-motion verification

**Files:**
- None expected to change; this is a verification task.

- [ ] **Step 1: Force prefers-reduced-motion via DevTools**

DevTools → ⋮ → More tools → Rendering → Emulate CSS media feature `prefers-reduced-motion: reduce`.

Hard-refresh.

Expected with reduce ON:
- No pixel-wipe transitions (instant fade).
- No confetti on game-over.
- No tilt on aviary tiles.
- No sparkles.
- No screen shake on combo break.
- CRT + grain overlays hidden (already enforced via `@media (prefers-reduced-motion: reduce)` in `_fx.css`).

Game still playable; counters still update; grade still shows (without bounce).

- [ ] **Step 2: Toggle Reduced Motion off in Settings while emulation is ON**

In settings, change "Reduced motion" from Auto → Off.

Expected: motion comes back even though system says reduce. Setting overrides.

- [ ] **Step 3: Toggle back to Auto**

Motion goes away again.

- [ ] **Step 4: Commit (if any fixes were required)**

If any element wasn't honoring `isReducedMotion()`, add the check, then:

```bash
git add js/
git commit -m "Reduced-motion polish pass"
```

If nothing changed, skip.

---

## Task 6.4: Final pass — manual smoke test of every flow

**Files:**
- None expected to change.

- [ ] **Step 1: Walkthrough**

Hard-refresh. Verify in this order:
1. First-run intro appears (after `localStorage.clear()`).
2. Click SKIP. Land on menu.
3. Click CUSTOMIZE → drawer opens, upload a face (or pick a stock photo from your machine).
4. Click PLAY → SEND IT. Play one run. Watch combo meter, coin counter, near-miss counter live-update.
5. Crash. Watch grade stamp, confetti, summary cascade, inline unlock (if any).
6. Click SHARE → modal opens, preview renders. Click Download → PNG saves.
7. Click RUN IT BACK → starts a new run.
8. Click X to quit. Back on menu.
9. Click BIRDS tile → Aviary opens with groups + tilt + sparkles on selected.
10. Equip a different bird. Back to menu — hero bird is the new one.
11. Click MAKE → NEW MAP. Open editor.
12. Drop a few pipes, undo, redo. Grid visible. Mini-preview reflects pipes. Difficulty changes as you add.
13. Save the map. Click X. Visit MY MAPS. Row shows thumbnail + best 0 + Never played.
14. Play it. Get a score. Crash. Back to menu → MY MAPS. Row shows updated best + last-played date.
15. Click gear → Settings. Toggle scanlines off and back on. Drag volume slider. Change Theme to Night, start a run — sky is night.
16. Reset all data (DANGER section). Confirm. Page reloads → intro re-shows.

If anything misbehaves, fix in place and commit.

- [ ] **Step 2: Commit (if fixes required)**

```bash
git add -A
git commit -m "Final smoke-test fixes"
```

If nothing changed, no commit.

---

# Wrap-up

After Phase 6, the v2 overhaul is complete. The current branch should be on top of v1 with:
- ~7 new JS modules
- 12 CSS partials (replacing the monolithic style.css)
- Materially nicer Menu, Play HUD, Game-over, Editor, Levels, Aviary screens
- New Settings screen + first-run Intro
- CRT + grain + pixel-wipe FX layer
- Inline letter-grade + confetti + share card

Push, open a PR, or merge per project workflow.

---

## Self-Review Notes

This plan covers all 7 spec sections:
- §1 Aesthetic — Phases 1 & 2 (tokens, chrome, pixel borders, font promotion, CRT/grain, sky backdrop reuse)
- §2 Per-screen — Phases 2 (menu), 3 (play+gameover), 4 (settings+intro), 5 (aviary+levels+editor)
- §3 New modules — `settings.js`, `ui-fx.js`, `transitions.js`, `grading.js`, `share-card.js`, `level-thumbnail.js`, `intro.js`, `icons.js` (8 created across the plan)
- §4 Tech approach — CSS reorganization in Phase 1 Task 1.4, perf via static CRT/grain in Task 1.7, accessibility via `prefers-reduced-motion` honored in CSS + `isReducedMotion()` in JS, icon policy in Task 1.6, storage migration in Task 5.5
- §5 Phased build order — directly maps to Phases 1-6 in this plan
- §6 Out of scope — respected; no new birds, no new gameplay, no test framework
- §7 Success criteria — covered by Task 6.4 smoke test

Type/signature consistency spot-check:
- `gradeRun({score, coins, bestCombo, nearMisses, isNewBest})` — used identically in Task 3.4 (definition) and Task 3.6 (consumer). ✓
- `settings.get/set/subscribe` — consistent across Tasks 1.5, 1.7, 4.3, 4.4. ✓
- `transition(swapFn)` — Task 1.8 (definition) takes a swap fn; Task 1.9 (consumer in `show()`) passes one. ✓
- `consumeRecentUnlocks()` — defined in Task 3.7, consumed only in that task. ✓
- `recordLevelPlay(name, score)` — defined Task 5.5, consumed Task 5.5. ✓
- `buildShareCard({bird, photoImg, grade, score, best, theme})` — Task 3.8 definition; Task 3.9 consumer uses same shape. ✓
- `iconSvg(name, opts?)` — Task 1.6 definition; consumed in Task 2.3 with `iconSvg(name)`. ✓
- `installUiFx()`, `stampReveal(el, opts?)`, `spawnConfettiAt(ps, rect, amount)` — all consistent.

One minor caveat: several tasks instruct the engineer to "search and locate" specific code in `js/game.js` and `js/editor.js` (e.g., where the combo increments, where obstacles are placed). This is intentional — the existing files weren't read in full during planning, and the spec doesn't dictate their internal structure. The engineer should be capable of finding these and inserting hooks; if they get stuck, ask for guidance.
