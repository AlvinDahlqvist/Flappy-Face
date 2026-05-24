# Flappy Face v2 — UI/UX Overhaul

**Status:** Approved 2026-05-24
**Scope:** Total reinvention across every screen + new Settings, Intro, Share-card, Grading systems.

---

## 1. Aesthetic North Star

**"Soft sky inside a chunky arcade cabinet."**

Keep what's magical in the current game — the drifting clouds, the day/dusk/night parallax skies, the procedural bird, the run-summary card. Wrap the entire UI shell in pixel-perfect arcade-cabinet chrome so the *contrast* (atmospheric scene + crunchy 8-bit frame) becomes the thing people remember.

### Concrete commitments

- **Borders.** Replace soft 14–18px rounded corners on UI chrome with **stepped pixel borders**: 4–6px outer dark frame, 2px inner highlight, 0 radius. Buttons get a 3-layer box-shadow stack that visibly compresses on press. Keep small radii (≥12px) only on photo crops (face bird, uploads) — round profile pics still need to feel like profile pics.
- **Type.**
  - `Bungee` — hero display (kept, current usage fine).
  - `Press Start 2P` — **promoted from "tiny accents" to all UI labels, button text, HUD, headers**. The current under-use is why the pixel aesthetic feels half-committed.
  - `Jersey 25` — body copy, tips, run-stat labels (legibility-critical text only).
  - No Arial/Helvetica/Inter/system fallbacks ever surface visibly. Fallback stacks may list them but the loaded fonts must always win.
- **Color tokens** (add to `:root`):
  - Keep: `--accent: #ffd166` (amber), `--accent-2: #ef476f` (pink), `--accent-3: #06d6a0` (mint).
  - Add: `--midnight: #0d1b3d`, `--sunset: #ff8c42`, `--frame-dark: #1a1a2e`, `--frame-light: #f7f7ff`.
  - Rule: dominant flat field + ONE sharp accent per surface. No gradients on UI chrome (gradients live in the sky/game world only).
- **Atmosphere.**
  - **CRT scanline overlay** — fixed `<canvas>` or `<div>` over the whole viewport, `repeating-linear-gradient` 2px-on / 2px-off at ~6% opacity.
  - **Dither-grain overlay** — static noise PNG (generated once into a hidden canvas, then used as `background-image`) at ~4% opacity. Both toggle-able in Settings (default ON; auto-OFF if `prefers-reduced-motion: reduce`).
  - **Parallax sky** becomes the default backdrop for `menu`, `aviary`, `levels`, `settings`. Drives from a single shared `<div class="sky-backdrop">` injected once into the body and shown/hidden per screen.
- **Motion philosophy.** Every screen gets ONE orchestrated entrance — staggered elastic tile-pop on the primary elements. Micro-interactions exist only on press/hover, not on idle. Existing ambient motion stays (clouds drifting, hero bird flapping, aviary bobs). New rule: don't add idle motion to elements that aren't already moving.

---

## 2. Per-screen specifications

### 2.1 Menu — hub layout

**Current:** vertical scroll — hero, title, 3 upload slots, 5 stacked buttons, stats card, tip.

**New layout (mobile-first, single column, no scroll on standard phone heights):**

```
┌─────────────────────────────┐
│      [parallax sky bg]      │
│   ☁  ☁                  ☁   │
│         ╔═══════╗           │  <- pixel cabinet frame around hero
│         ║ HERO  ║           │
│         ║ BIRD  ║           │
│         ╚═══════╝           │
│        FLAPPY FACE          │  <- title (Bungee, current)
│       "tap. flap. die."     │  <- subtitle (Press Start 2P, small)
│                             │
│  ┌────┐ ┌────┐ ┌────┐       │  <- 3 category tiles
│  │PLAY│ │MAKE│ │BIRDS│      │     each tile has icon + label
│  └────┘ └────┘ └────┘       │     tap = expand sub-actions inline
│                             │
│  ▶ CUSTOMIZE   ▼            │  <- collapsible drawer (closed by default)
│                             │     opens to reveal 3 upload slots
│                             │
│  ╔═══════════════════════╗  │  <- stats ribbon (pixel border)
│  ║ ★12  🔥5  ▶42  💀38  ║  │     compact, always visible
│  ╚═══════════════════════╝  │
└─────────────────────────────┘
```

**Behavior:**
- Tapping `PLAY` → expands inline (anime stagger ~120ms) to reveal: `SEND IT (random)` (primary glowing CTA) + `MY MAPS`. Other tiles collapse if expanded.
- Tapping `MAKE` → expands to: `NEW MAP` + `IMPORT`. (Editor + Import live here.)
- Tapping `BIRDS` → goes straight to Aviary (no expansion needed — destination screen does the work).
- `CUSTOMIZE` drawer is collapsed by default; opens to current 3-slot upload grid + `Wipe Photos`. Drawer state persists in `localStorage` (`ff.menu.customizeOpen`).
- Stats ribbon uses pixel icons inline with numbers, Press Start 2P, 12px. Compact enough to always fit without scroll.
- Tip text moves into a small marquee at the very bottom edge.

**Entrance animation:** staggered elastic pop on hero → title chars → tiles → ribbon. Total budget ~900ms.

### 2.2 Play HUD — live counters

**Current:** pause, mute, score, quit. Score in center.

**New layout:**

```
┌─────────────────────────────┐
│ [II] [M]              [X]   │  <- top row (kept positions)
│                             │
│         ▣▣▣▣▣ x5            │  <- combo meter (segmented pixel bar)
│             47              │  <- score (kept center)
│                             │
│  ★ 12          ! 3          │  <- coin + near-miss counters
│                             │
```

- **Combo meter:** horizontal segmented bar above the score. Empty bar = combo 1, fills one segment per pipe up to 5, then shows `x5+` indicator. Resets visually on combo break with a red flash.
- **Coin counter (top-left below pause/mute):** ★ icon + tabular number. Ticks up with a +1 popup effect on pickup (reuses existing popup system).
- **Near-miss counter (top-right below quit):** `!` icon + number. Flashes green on every near-miss.
- All HUD elements use Press Start 2P, 12–14px, with `text-shadow` outline for legibility against busy scenes.
- HUD elements get a subtle drop-shadow that scales with combo intensity (visual feedback for being "in the zone").

### 2.3 Game over — letter grade, confetti, inline unlock, share card

**Current:** death message, score/best row, 5-row run summary, retry/menu buttons.

**New flow (sequenced, ~2.2s total):**

1. **0–400ms:** existing red flash + shake (kept). Overlay slides up from bottom.
2. **400–800ms:** big **letter grade** stamps in (S / A / B / C / D), 96px Bungee, with a "STAMP" sound effect and a scale-bounce from 2.0 → 1.0. Grade color: S=gold, A=mint, B=cyan, C=amber, D=pink.
3. **800–1400ms:** confetti burst from behind the grade (reuses `ParticleSystem`).
4. **1400–2000ms:** run-summary rows tween up sequentially (already implemented, kept).
5. **If unlock happened this run:** unlock card slides into the summary (between grade and stats) showing the bird canvas + name + "TAP TO EQUIP" pulsing badge. Replaces the existing standalone toast for in-run unlocks.
6. **Buttons** at the bottom: `RUN IT BACK` (primary), `SHARE` (new), `MENU` (kept).

**Grading formula** (`grading.js`):

```
base = score
bonus = coins * 0.5 + bestCombo * 1.5 + nearMisses * 0.3
totalGrade = base + bonus

S: totalGrade >= 80 OR new personal best
A: 50–79
B: 25–49
C: 10–24
D: 0–9
```

(Numbers tunable; live in a single constants block at top of `grading.js`.)

**Share card** (`share-card.js`):
- Opens a modal with a pre-rendered 1080×1350 PNG (Instagram-story friendly).
- Content: parallax sky thumbnail + bird centered + big letter grade + score + "FLAPPY FACE" wordmark + tiny URL/credit at the bottom.
- Buttons: `DOWNLOAD` (saves PNG via `<a download>`) + `COPY` (clipboard API where available, fallback = download) + `CLOSE`.
- Rendering happens lazily on modal open (don't pre-render every game).

### 2.4 Editor — grid, snap, undo, mini-preview

**Current:** black canvas, top toolbar (back/tools/test), bottom toolbar (gap/save/export/import/clear).

**New additions:**
- **Grid overlay** on the canvas: 40px squares, very faint (10% white). Toggle button in top toolbar.
- **Snap-to-grid** toggle (default ON). When ON, pipes snap to the 40px grid on placement and move.
- **Undo/Redo buttons** in the top toolbar. History stack capped at 30 entries. Keyboard: `Ctrl/Cmd+Z`, `Ctrl/Cmd+Shift+Z`.
- **Mini-preview** in the top-right corner: a 160×60px canvas rendering the whole level zoomed-out, with a viewport rectangle showing current scroll position. Tap = jump scroll.
- **Pipe count + difficulty estimate** in bottom toolbar: "12 pipes · gap 150 · EASY/MED/HARD". Difficulty rule: `EASY` if avg gap ≥ 180 OR pipe count ≤ 5; `HARD` if avg gap ≤ 110 OR pipe count ≥ 15; else `MED`. Implemented in `difficultyOf(level)` and shared with the Levels list row.
- Toolbar styling matches the new pixel-frame chrome.

### 2.5 Levels — thumbnails, sort, filter

**Current:** plain text list with name + meta + 4 action buttons.

**New row layout:**

```
┌────────────────────────────────────────────┐
│ ┌────┐  DAD'S NIGHTMARE         ★ BEST 47  │
│ │ ▮▮ │  12 pipes · gap 150 · HARD          │
│ │ ▮▮▮│  Last played 3d ago                 │
│ └────┘  [▶ PLAY] [✎] [↗] [×]               │
└────────────────────────────────────────────┘
```

- **Thumbnail** (left, 64×64) rendered by `level-thumbnail.js` from level data — pipes as silhouettes against a mini sky.
- **Best score badge** (top-right of row).
- **Last played timestamp** — stored when level is played; "Never" if not yet.
- **Sort/filter chips** at top of list: `NEWEST` (default) | `BEST` | `HARDEST`.
- Empty-state stays but gets a sad-bird pixel illustration.

Storage additions: each level entry gets `lastPlayedAt`, `bestScore`, `playCount` fields. Migration: missing fields default to `0` / `null`.

### 2.6 Aviary — tilt, sparkles, groups

**Current:** flat grid, selected glow, locked desaturated, progress bars.

**New additions:**
- **Tilt-on-pointer-move:** mouse position over a tile rotates it ~6° on X/Y (CSS `transform: perspective(800px) rotateX/Y`). Mobile: gentle accelerometer-driven tilt (if available, no-op otherwise).
- **Sparkle particles** on the selected tile — 3–5 small canvas-drawn sparkles that orbit. Reuses `ParticleSystem` with a "sparkle" preset.
- **Group headers:** tiles split into sections — `YOUR FACE` (only if photo uploaded) | `EARNED` | `LOCKED`. Headers are chunky pixel dividers with Press Start 2P labels.
- **Animated progress stripe:** progress bars get a CSS-only diagonal stripe animation (slow drift), making locked birds feel "alive."
- **Equip transition:** tapping an unlocked bird does a satisfying scale-bounce on the tile + the hero bird on the menu (when you return) flips through a quick swap animation.

### 2.7 Settings (NEW)

Reached via a gear button added to the menu's top-right corner.

```
┌─────────────────────────────┐
│  [X]      SETTINGS          │
│                             │
│  SOUND                      │
│  Volume    [━━━━━○─────]    │
│  Mute      [ON ●]           │
│                             │
│  FEEL                       │
│  Haptics   [ON ●]  (mobile) │
│  Scanlines [ON ●]           │
│  Grain     [ON ●]           │
│  Reduced motion [OFF ○]     │
│                             │
│  GAME                       │
│  Theme lock [AUTO ▼]        │  <- AUTO / DAY / DUSK / NIGHT
│                             │
│  DANGER                     │
│  [ Reset all data ]         │
└─────────────────────────────┘
```

- All settings live in a single `ff.settings` localStorage key.
- Changes apply **live** — toggling scanlines updates the overlay opacity instantly. Volume slider tweens the audio gain.
- Theme lock overrides the random theme pick in `game.js` / `scene.js`.
- Reduced motion auto-defaults to `system` value (`prefers-reduced-motion`) but can be toggled. When on: disables wipes, confetti, sparkles, tilt; keeps essential feedback (score popups, screen shake at half intensity).
- Reset shows a confirm modal with a 3-second hold-to-confirm button to prevent rage-taps.

### 2.8 Intro (NEW, first-run only)

Triggered on first menu load when `ff.intro.seen !== true`.

4 slides, each dims the menu and arrow-points at the highlighted element:
1. **"Upload your face."** Highlights the Customize drawer (auto-opens it).
2. **"Pick a category."** Highlights the PLAY tile.
3. **"Or build your own level."** Highlights MAKE.
4. **"Hit GO and don't die."** Highlights SEND IT.

Buttons: `SKIP` (top-right, always visible) + `NEXT` / `LET'S GO` on last slide. Tappable arrows are pixel-art chunky. Sets `ff.intro.seen = true` on completion or skip.

### 2.9 Screen transitions

All `show(name)` calls go through a new `transitions.transition(from, to)` helper:
- Default: **pixel-dissolve wipe** — full-screen overlay of 32×32 black squares appears in random order over ~120ms, then disappears in reverse order revealing the new screen. ~250ms total.
- Reduced-motion: pure opacity fade (current behavior).
- Within-screen overlays (game-over, pause, modals) keep existing opacity transitions — wipes are for screen-level changes only.

---

## 3. New cross-cutting systems (modules)

### 3.1 `js/ui-fx.js`

Owns global visual effects on the UI layer (not gameplay particles — those stay in `effects.js`).

```js
export const uiFx = {
  // CRT/grain overlay control
  setScanlines(on),      // toggles the CSS class on body
  setGrain(on),
  setReducedMotion(on),  // updates body class; respected by other modules

  // Screen transitions
  transition(fromEl, toEl, opts?),  // resolves when complete

  // Game-over candy
  spawnConfetti(originRect, count?),  // delegates to ParticleSystem
  shakeElement(el, intensity?),       // CSS keyframes
  stampReveal(el, opts?),             // scale-bounce + sound trigger
};
```

State internal to module: overlay DOM nodes, transition queue, current settings snapshot (subscribed from `settings.js`).

### 3.2 `js/grading.js`

Pure functions, no DOM.

```js
export function gradeRun({ score, coins, bestCombo, nearMisses, isNewBest }) {
  // returns { grade: 'S'|'A'|'B'|'C'|'D', breakdown: {base, bonus, total}, color }
}
export const GRADE_THRESHOLDS = { S: 80, A: 50, B: 25, C: 10, D: 0 };
```

### 3.3 `js/share-card.js`

```js
export async function buildShareCard({ bird, photoImg, grade, score, best, theme }) {
  // returns { blob, dataUrl, width, height }
}
export async function copyShareCard(card) { /* clipboard API */ }
export function downloadShareCard(card, filename) { /* anchor download */ }
```

Rendering uses an offscreen canvas; reuses `birds.js` `draw()` for bird, `scene.js` for the mini sky.

### 3.4 `js/level-thumbnail.js`

```js
export function renderLevelThumbnail(level, canvas) {
  // paints pipes as silhouettes + a mini sky into the given canvas
}
export function difficultyOf(level) {
  // returns 'EASY'|'MED'|'HARD'
}
```

### 3.5 `js/settings.js`

```js
export const settings = {
  get(key),           // returns current value
  set(key, value),    // persists + notifies subscribers
  subscribe(key, fn), // returns unsubscribe
  all(),
};
export const DEFAULTS = {
  volume: 0.7,
  muted: false,
  haptics: true,
  scanlines: true,
  grain: true,
  reducedMotion: 'auto',  // 'auto' | true | false
  themeLock: 'auto',      // 'auto' | 'day' | 'dusk' | 'night'
};
```

Storage key: `ff.settings`. Migration: missing keys filled with defaults. Existing `ff.muted` migrated into `settings.muted` on first load, then ignored.

### 3.6 `js/transitions.js`

Wraps the screen-switching previously done in `main.js`'s `show()`. Exports `transition(name)`; internal `pixelWipe()`, `opacityFade()`.

### 3.7 `js/intro.js`

```js
export function maybeShowIntro({ menuEl, onComplete }) {
  // checks ff.intro.seen, renders slides, returns promise
}
```

---

## 4. Technical approach

### 4.1 Constraints honored

- **No build step.** Stay vanilla ES modules served from disk. No npm install.
- **No new external deps.** Keep `anime.js` (current CDN load). All new modules are local.
- **Mobile-first.** All new UI is designed at 360×640 first, then scaled up. Tap targets ≥44px. Pixel borders don't shrink hitboxes.
- **Touch + keyboard parity.** Every new interactive element works with both.

### 4.2 Performance

- CRT scanlines = pure CSS (`repeating-linear-gradient`), zero per-frame work.
- Grain = one static 256×256 PNG generated into a hidden canvas at load, then used as `background-image: url(canvas.toDataURL())`. Generated once.
- Pixel-wipe = single full-screen `<canvas>` redrawn for ~250ms then removed. Capped at 60fps.
- Confetti reuses existing `ParticleSystem` — no new render loop.
- Tilt-on-pointer-move = CSS transforms only, throttled via `requestAnimationFrame`.
- Share-card render = offscreen canvas, runs once when modal opens. Async.

### 4.3 Icon rendering policy

- **No emoji** in chrome UI (lock screen, sound state, etc.). Emoji rendering is inconsistent across iOS/Android/Win.
- Icons in HUD/menu/buttons = **inline SVG components or canvas-drawn glyphs** at the same DPR as the rest of the screen.
- Icon list (kept minimal): coin ★, near-miss !, streak 🔥→flame-svg, runs ▶, deaths skull-svg, gear, X (close), pause bars, mute speaker, sparkle. Stored as a single `js/icons.js` module exporting `iconSvg(name)` and `iconCanvas(name, ctx, size, color)`.
- Existing emoji (🔒 lock on aviary cards, 🍕 in tips text) replaced with SVG/canvas equivalents.

### 4.4 Accessibility

- `prefers-reduced-motion: reduce` is the default for new users. Settings toggle overrides.
- All new buttons have visible focus states (2px solid `--accent` outline).
- All icons have `aria-label` siblings.
- Color contrast: all text on UI chrome ≥ 4.5:1 against its background.
- Letter grade has both color AND letter (not color-only).

### 4.5 File reorganization

`style.css` is currently 921 lines. Split into:

```
style/
  _tokens.css      // :root variables, fonts
  _base.css        // resets, body, screen system, transitions
  _chrome.css      // shared button/frame/border/icon mixins
  _menu.css
  _play.css
  _editor.css
  _levels.css
  _aviary.css
  _settings.css
  _modals.css
  _intro.css
  _fx.css          // CRT, grain, wipe styles
```

Concatenated via `@import` chain in a new top-level `style.css`. No build step needed.

Source JS file additions (Section 3 lists each module). `main.js` shrinks as logic moves out — target ≤ 400 lines (currently 833).

### 4.6 Storage schema additions

New `localStorage` keys:
- `ff.settings` — settings object (Section 3.5).
- `ff.intro.seen` — boolean.
- `ff.menu.customizeOpen` — boolean.
- `ff.levels` — extended per-entry schema: adds `lastPlayedAt: number | null`, `bestScore: number`, `playCount: number`.

Migrations run on `init()` once; idempotent.

---

## 5. Phased build order

Each phase is independently shippable.

| # | Phase | Deliverable |
|---|---|---|
| 1 | **Foundation** | `ui-fx.js`, `transitions.js`, `settings.js`, CSS reorganization, pixel-border tokens, CRT + grain overlays wired globally, fonts re-promoted. |
| 2 | **Menu rework** | Hub layout with category tiles, collapsible Customize drawer, stats ribbon, gear button → Settings. |
| 3 | **Play HUD + Game-over** | Combo meter, coin/near-miss counters, `grading.js`, letter-grade reveal, confetti, inline unlock card, `share-card.js` + share modal. |
| 4 | **Settings + Intro** | Settings screen wired live, first-run intro overlay. |
| 5 | **Aviary, Levels, Editor polish** | Tilt + sparkles + groups (aviary); thumbnails + sort/filter + last-played (levels); grid/snap/undo/mini-preview (editor). |
| 6 | **Transitions pass + final polish** | Pixel-wipe transitions on all screen changes; final mobile-width audit; reduced-motion verification. |

Stop after any phase = still a meaningfully nicer game. PRs map 1:1 with phases unless we explicitly bundle.

---

## 6. Out of scope (explicitly)

- New gameplay mechanics (power-ups, daily challenge, fog mode) — README lists these as future ideas; not part of v2.
- Backend / cloud sync — game stays local-only.
- New birds — keep current 10 + photo bird.
- Sound redesign — keep existing Web Audio synth. (New sounds for stamp/confetti use existing AudioBus primitives.)
- Editor rebuild — adding grid/snap/undo/mini-preview only; not rewriting the editor model.
- Removing anime.js — keep it; load already optimized.

---

## 7. Success criteria

- Every screen visibly stronger when set side-by-side with current.
- Mobile-first: nothing scrolls on a 360×640 viewport that doesn't need to.
- No regressions in existing gameplay flow.
- CRT + grain are toggleable and respect `prefers-reduced-motion`.
- Share card produces a valid downloadable PNG with the player's bird + grade + score.
- First-run intro shows exactly once.
- All new modules tree-shake cleanly (no circular deps with `game.js` / `birds.js`).
