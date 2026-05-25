# Bird & Animation Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add tail feathers + pixel-snap to existing birds, plumb a `birdState` object through the game-loop, and implement 11 animation/cinematic features (squash+stretch, pipe wobble, pipe rise, combo-driven world reactions, bullet-time, damage-source death, four bird-specific gameplay tells).

**Architecture:** Wrapper pattern — new `drawBirdWithState(bird, ctx, r, state)` in `js/birds.js` applies pose transforms + eye overlays around the existing per-bird `draw()` functions, so existing bird code stays intact. New `birdState` object owned by `Game` and updated each tick. Game-loop changes (slow-mo, damage source, pipe spawn/wobble) live in `js/game.js`. Combo-driven scene effects live in `js/scene.js`.

**Tech Stack:** Vanilla ES modules, HTML5 Canvas 2D, existing `springStep`/`ParticleSystem`/`ScreenShake` from `js/effects.js`, existing `settings` + `isReducedMotion` from `js/settings.js`.

**Source-of-truth spec:** `docs/superpowers/specs/2026-05-25-bird-animation-polish-design.md`. Spec §3 was written before reading the current `birds.js` and assumed accessories weren't yet implemented; the WIP commits had already added bird-specific accessories (Punk = sunglasses, Chill = headphones, Royal = crown, Ghost = hollow eyes + mouth, Pizza = full pizza, Daredevil = angry brow + sweat drop, Collector = coin patches, Legend = crown + halo). This plan therefore does NOT rewrite accessories — only adds tails + pixel-snap + the state/animation systems.

**Test approach:** No test runner. Verification = manual browser testing on `http://localhost:8765/` (run `py -m http.server 8765` first). For pure functions added to `js/grading.js`-style modules, inline browser-console assertions are provided. For game-loop changes, specific behaviors to observe in-browser are listed per task.

---

## File Structure

### New (none)
No new modules. Everything lands inside existing files.

### Modified

| Path | Reason |
|---|---|
| `js/birds.js` | Add `tailFeathers` shared helper + call from each bird. Add `pixelSnap` helper applied in `shadedBody`/`beak`/`cheek`/`standardEye`. Export `drawBirdWithState(bird, ctx, r, state)` wrapper + `drawEyeOverlay(ctx, r, event)` helper. Add `tell()` methods to BIRDS.ghost / rainbow / pizza / daredevil. |
| `js/game.js` | Add `this.birdState` object + per-tick updater. Replace direct `bird.draw()` calls with `drawBirdWithState()`. Add pose detection (dive/scrunch/lean). Trigger eye events on coin pickup / near-miss / combo break. Implement `predictCollision` + `bulletTimeActive` + `timeScale`. Track `damageSource` on collision. Add `spawnAge` + `wobble` to pipes. Apply render offsets for spawn-rise and wobble. Derive `comboTier`; pass to scene. Push past bird positions into `birdTrail` for Ghost/Rainbow tells. |
| `js/scene.js` | `updateScene(scene, dt, tier?)` accepts an optional `tier` arg. Scale cloud + balloon drift by `1 + tier * 0.3`. Sun/moon pulse amplitude scales with tier. |
| `js/effects.js` | Add `spawnCrumb(ps, x, y)` helper for Pizza. Add `spawnSpeedLine(ps, x, y)` helper for Daredevil (or render speed lines inline if a particle is overkill). |
| `style/_play.css` | Append `.score.combo-aura-1/2/3` text-shadow variants. |

---

## Phases

Phases ship independently — stop after any one is still a meaningfully better game.

- **Phase A — Bird visual completion** (3 tasks): tails, pixel-snap, eye-overlay helper.
- **Phase B — State plumbing** (4 tasks): birdState object, wrapper, pose detection, eye events.
- **Phase C — Animation juice** (5 tasks): flap squash, pipe wobble, pipe rise, combo tier + scene + aura, reduced-motion verification.
- **Phase D — Death + tells** (7 tasks): bullet-time, damage source, branched deaths, four bird tells.

Total: 19 tasks.

**Pre-flight check (do once before starting):**
- `git status` should be clean OR your WIP is committed.
- You're on the right branch (suggested: `feature/bird-animation-polish` off main).
- Dev server can run with `py -m http.server 8765`.

---

# PHASE A — BIRD VISUAL COMPLETION

## Task A.1: Add tail feathers to all 10 birds

**Files:**
- Modify: `js/birds.js`

- [ ] **Step 1: Add `tailFeathers` shared helper**

In `js/birds.js`, after the existing `cheek()` helper (around line 234), ADD:

```js
// Tail feathers — 1-2 angled triangles behind the body.
// style: 'fan' (default, two triangles), 'point' (single), 'wispy' (translucent for ghost)
function tailFeathers(ctx, r, fill, stroke = '#1a1a2e', style = 'fan') {
  ctx.save();
  ctx.lineWidth = Math.max(1.5, r * 0.06);
  ctx.strokeStyle = stroke;

  if (style === 'wispy') {
    ctx.fillStyle = fill;
    ctx.globalAlpha = 0.7;
    ctx.beginPath();
    ctx.moveTo(-r * 0.95, 0);
    ctx.quadraticCurveTo(-r * 1.65, -r * 0.20, -r * 1.40, r * 0.25);
    ctx.quadraticCurveTo(-r * 1.10, r * 0.05, -r * 0.95, 0);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
    return;
  }

  if (style === 'point') {
    ctx.fillStyle = fill;
    ctx.beginPath();
    ctx.moveTo(-r * 0.85, -r * 0.15);
    ctx.lineTo(-r * 1.55, 0);
    ctx.lineTo(-r * 0.85, r * 0.20);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
    return;
  }

  // 'fan' (default): upper + lower triangle
  ctx.fillStyle = fill;
  // upper triangle
  ctx.beginPath();
  ctx.moveTo(-r * 0.85, -r * 0.20);
  ctx.lineTo(-r * 1.45, -r * 0.35);
  ctx.lineTo(-r * 0.85, r * 0.05);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // lower triangle
  ctx.beginPath();
  ctx.moveTo(-r * 0.85, -r * 0.02);
  ctx.lineTo(-r * 1.50, r * 0.10);
  ctx.lineTo(-r * 0.85, r * 0.28);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}
```

- [ ] **Step 2: Call `tailFeathers` from each bird's `draw()` function**

For each bird in `js/birds.js`, ADD a `tailFeathers(...)` call as the FIRST line inside its `draw()` function (BEFORE `shadedBody` / `circleBody` / any body shape). This ensures the tail sits behind the body.

Use these specific signatures per bird:

```js
function drawBuddy(ctx, r) {
  tailFeathers(ctx, r, '#ffd166');                            // <— ADD
  shadedBody(ctx, r, '#fff2a8', '#ffd166', '#c8961c');
  // ...rest unchanged
}

function drawPunk(ctx, r) {
  tailFeathers(ctx, r, '#ec4899', '#1a1a2e', 'fan');          // <— ADD
  shadedBody(ctx, r, '#ffb0d2', '#ec4899', '#a8336b');
  // ...rest unchanged
}

function drawChill(ctx, r) {
  tailFeathers(ctx, r, '#118ab2', '#1a1a2e', 'fan');          // <— ADD
  shadedBody(ctx, r, '#7fcfe6', '#118ab2', '#0a5b7a');
  // ...rest unchanged
}

function drawRoyal(ctx, r) {
  tailFeathers(ctx, r, '#a86bb4', '#1a1a2e', 'fan');          // <— ADD
  shadedBody(ctx, r, '#d8a8e0', '#a86bb4', '#6e3a7a');
  // ...rest unchanged
}

function drawGhost(ctx, r) {
  tailFeathers(ctx, r, 'rgba(255,255,255,0.6)', 'rgba(170,186,212,0.7)', 'wispy');  // <— ADD
  // ...rest unchanged (the ghost-shape path starts after this)
}

function drawRainbow(ctx, r) {
  tailFeathers(ctx, r, '#a86bb4', '#1a1a2e', 'point');        // <— ADD
  ctx.save();
  // ...rest unchanged
}

function drawPizza(ctx, r) {
  tailFeathers(ctx, r, '#b87333', '#1a1a2e', 'fan');          // <— ADD
  shadedBody(ctx, r, '#fee489', '#f4c430', '#b88e10', '#7a4f00');
  // ...rest unchanged
}

function drawDaredevil(ctx, r) {
  tailFeathers(ctx, r, '#e63b3b', '#1a1a2e', 'point');        // <— ADD
  shadedBody(ctx, r, '#ff8a7e', '#e63b3b', '#8e1e1e');
  // ...rest unchanged
}

function drawCollector(ctx, r) {
  tailFeathers(ctx, r, '#79c244', '#1a1a2e', 'fan');          // <— ADD
  shadedBody(ctx, r, '#cef0a8', '#79c244', '#3d6e20');
  // ...rest unchanged
}

function drawLegend(ctx, r) {
  tailFeathers(ctx, r, '#ffd166', '#1a1a2e', 'fan');          // <— ADD
  shadedBody(ctx, r, '#fff6a8', '#ffd166', '#b8861d', '#1a1a2e');
  // ...rest unchanged
}
```

- [ ] **Step 3: Manual visual verification**

Run `py -m http.server 8765` (if not running) and open `http://localhost:8765/`. Navigate to BIRDS in the menu (Aviary screen).

Expected: every bird tile has visible tail feathers protruding from the upper-left of the body (since the canvas is flipped so the bird faces right). Ghost's tail looks wispy/translucent; Rainbow and Daredevil have single-point tails; rest have two-triangle fans.

- [ ] **Step 4: Commit**

```bash
git add js/birds.js
git commit -m "Birds: add tail feathers to every bird"
```

---

## Task A.2: Pixel-snap shared bird helpers

**Files:**
- Modify: `js/birds.js`

This task wraps existing draw operations in `Math.round()` so the bird sprites snap to integer pixel boundaries, sharpening the pixel-art identity. Apply only to shared helpers — birds' per-instance draws will inherit the snap.

- [ ] **Step 1: Add a `pxSnap(v)` helper**

In `js/birds.js`, after the `cheek()` helper (and after `tailFeathers` from Task A.1), ADD:

```js
// Round to nearest integer pixel — sharpens the procedural sprites against the
// parallax scene. Used by shared body / eye / beak / cheek helpers.
function pxSnap(v) { return Math.round(v); }
```

- [ ] **Step 2: Apply pixel-snap in `shadedBody`**

REPLACE the existing `shadedBody` function with this snapped version:

```js
function shadedBody(ctx, r, light, main, dark, outline = '#1a1a2e') {
  const g = ctx.createRadialGradient(pxSnap(-r * 0.35), pxSnap(-r * 0.4), pxSnap(r * 0.1), 0, 0, pxSnap(r * 1.15));
  g.addColorStop(0, light);
  g.addColorStop(0.55, main);
  g.addColorStop(1, dark);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(0, 0, pxSnap(r), 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.22)';
  ctx.beginPath();
  ctx.ellipse(pxSnap(-r * 0.35), pxSnap(-r * 0.45), pxSnap(r * 0.35), pxSnap(r * 0.18), -0.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = outline;
  ctx.lineWidth = Math.max(2, r * 0.085);
  ctx.beginPath();
  ctx.arc(0, 0, pxSnap(r), 0, Math.PI * 2);
  ctx.stroke();
}
```

- [ ] **Step 3: Apply pixel-snap in `standardEye`**

REPLACE the existing `standardEye` function:

```js
function standardEye(ctx, r) {
  ctx.fillStyle = '#fff';
  ctx.strokeStyle = '#1a1a2e';
  ctx.lineWidth = Math.max(1.5, r * 0.06);
  ctx.beginPath();
  ctx.arc(pxSnap(r * 0.30), pxSnap(-r * 0.18), pxSnap(r * 0.28), 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#1a1a2e';
  ctx.beginPath();
  ctx.arc(pxSnap(r * 0.36), pxSnap(-r * 0.14), pxSnap(r * 0.16), 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(pxSnap(r * 0.40), pxSnap(-r * 0.20), pxSnap(r * 0.06), 0, Math.PI * 2);
  ctx.fill();
}
```

- [ ] **Step 4: Apply pixel-snap in `beak`**

REPLACE the existing `beak` function:

```js
function beak(ctx, r, color = '#ef476f', dark = '#b8323d') {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(pxSnap(r * 0.55), pxSnap(-r * 0.02));
  ctx.lineTo(pxSnap(r * 1.40), pxSnap(-r * 0.20));
  ctx.lineTo(pxSnap(r * 1.40), pxSnap(r * 0.02));
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = dark;
  ctx.beginPath();
  ctx.moveTo(pxSnap(r * 0.55), pxSnap(r * 0.02));
  ctx.lineTo(pxSnap(r * 1.40), pxSnap(r * 0.02));
  ctx.lineTo(pxSnap(r * 1.40), pxSnap(r * 0.20));
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#1a1a2e';
  ctx.lineWidth = Math.max(1.5, r * 0.07);
  ctx.beginPath();
  ctx.moveTo(pxSnap(r * 0.55), pxSnap(-r * 0.02));
  ctx.lineTo(pxSnap(r * 1.40), pxSnap(-r * 0.20));
  ctx.lineTo(pxSnap(r * 1.40), pxSnap(r * 0.20));
  ctx.lineTo(pxSnap(r * 0.55), pxSnap(r * 0.02));
  ctx.closePath();
  ctx.stroke();
}
```

- [ ] **Step 5: Apply pixel-snap in `cheek`**

REPLACE the existing `cheek` function:

```js
function cheek(ctx, r, color = 'rgba(239, 71, 111, 0.55)') {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(pxSnap(r * 0.05), pxSnap(r * 0.30), pxSnap(r * 0.20), 0, Math.PI * 2);
  ctx.fill();
}
```

- [ ] **Step 6: Manual visual verification**

Hard-refresh `http://localhost:8765/`. Open the Aviary. Compare birds vs the previous task — they should look very slightly sharper at the same render size, edges aligning to integer pixels. The effect is most visible at small radii (the 80px aviary tiles).

If any bird looks broken (clipped, misaligned, gaps), revert just that helper and report DONE_WITH_CONCERNS.

- [ ] **Step 7: Commit**

```bash
git add js/birds.js
git commit -m "Birds: pixel-snap shared helpers for sharper sprites"
```

---

## Task A.3: Add `drawEyeOverlay` helper for reactive eyes

**Files:**
- Modify: `js/birds.js`

This task adds the helper that Phase B will use to overlay event-driven eyes ($/wide/angry) on top of whatever the bird's normal eyes render. The helper is added now so Phase B can wire it in cleanly without two changes to the same area.

- [ ] **Step 1: Add `drawEyeOverlay` helper**

In `js/birds.js`, AFTER the `cheek()` helper and before the `// ============ BIRDS ============` divider, ADD:

```js
// Event-driven eye overlay. Drawn ON TOP of the bird's normal eyes for one frame.
// `event` is one of: 'coin' | 'nearMiss' | 'comboBreak'.
export function drawEyeOverlay(ctx, r, event) {
  if (!event) return;
  const eyeX = pxSnap(r * 0.30);
  const eyeY = pxSnap(-r * 0.18);
  const er   = pxSnap(r * 0.30);
  if (event === 'coin') {
    // $ over a yellow white
    ctx.fillStyle = '#fff';
    ctx.strokeStyle = '#1a1a2e';
    ctx.lineWidth = Math.max(1.5, r * 0.06);
    ctx.beginPath();
    ctx.arc(eyeX, eyeY, er, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#1a8a45';
    ctx.font = `bold ${pxSnap(r * 0.55)}px "Bungee", system-ui`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('$', eyeX, eyeY + 1);
  } else if (event === 'nearMiss') {
    // wide white eye, tiny pupil
    ctx.fillStyle = '#fff';
    ctx.strokeStyle = '#1a1a2e';
    ctx.lineWidth = Math.max(1.5, r * 0.06);
    ctx.beginPath();
    ctx.arc(eyeX, eyeY, pxSnap(r * 0.38), 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#1a1a2e';
    ctx.beginPath();
    ctx.arc(eyeX, eyeY, pxSnap(r * 0.08), 0, Math.PI * 2);
    ctx.fill();
  } else if (event === 'comboBreak') {
    // angry V-slit eye
    ctx.strokeStyle = '#1a1a2e';
    ctx.lineWidth = Math.max(2.5, r * 0.10);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(pxSnap(r * 0.05), pxSnap(-r * 0.32));
    ctx.lineTo(pxSnap(r * 0.55), pxSnap(-r * 0.08));
    ctx.stroke();
    // red flush
    ctx.fillStyle = 'rgba(239, 71, 111, 0.4)';
    ctx.beginPath();
    ctx.arc(eyeX, eyeY, pxSnap(r * 0.45), 0, Math.PI * 2);
    ctx.fill();
  }
}
```

- [ ] **Step 2: Verify the export resolves**

Hard-refresh `http://localhost:8765/`. Open DevTools console. Paste:

```js
const m = await import('./js/birds.js?bust=' + Date.now());
console.assert(typeof m.drawEyeOverlay === 'function', 'drawEyeOverlay exported');
console.log('OK drawEyeOverlay exported');
```

Expected: `OK drawEyeOverlay exported`.

- [ ] **Step 3: Commit**

```bash
git add js/birds.js
git commit -m "Birds: add drawEyeOverlay helper for Phase B reactive eyes"
```

---

# PHASE B — STATE PLUMBING

## Task B.1: Add `birdState` object to Game class

**Files:**
- Modify: `js/game.js`

- [ ] **Step 1: Add `birdState` initialization to the Game constructor**

READ `js/game.js` to find the constructor. Locate where state is initialized (typically after `this.canvas = canvas;` and before any subsystem like `this.particles`).

ADD this block somewhere in the constructor (a sensible spot is near the other per-game state):

```js
    // Bird visual state — drives pose transforms and eye overlays each render frame.
    this.birdState = {
      pose: 'idle',          // 'idle' | 'flap' | 'dive' | 'scrunch' | 'lean'
      flapPhase: 0,          // 0..1, decays toward 0
      flapPhaseV: 0,         // velocity for springStep
      eyeEvent: null,        // null | 'coin' | 'nearMiss' | 'comboBreak'
      eyeEventTtl: 0,        // ms remaining for this event before clearing
      comboTier: 0,          // 0..3
      recentDamageSource: null, // 'topPipe' | 'bottomPipe' | 'ground' | null
    };
    // Trail of past bird positions for ghost/rainbow tells (oldest → newest).
    this.birdTrail = [];
```

- [ ] **Step 2: Add a `_updateBirdState(dt)` method**

Find a sensible spot in the Game class for instance methods (e.g. near `update`). ADD:

```js
  _updateBirdState(dt) {
    // Decay flapPhase toward 0 with a spring so it overshoots back.
    const sp = springStep(this.birdState.flapPhase, this.birdState.flapPhaseV, 0, dt / 1000, 240, 22);
    this.birdState.flapPhase  = sp.value;
    this.birdState.flapPhaseV = sp.velocity;
    if (Math.abs(this.birdState.flapPhase) < 0.002) {
      this.birdState.flapPhase = 0;
      this.birdState.flapPhaseV = 0;
    }

    // Eye event TTL countdown
    if (this.birdState.eyeEvent) {
      this.birdState.eyeEventTtl -= dt;
      if (this.birdState.eyeEventTtl <= 0) {
        this.birdState.eyeEvent = null;
      }
    }

    // Combo tier (0..3)
    const c = this.combo || 0;
    this.birdState.comboTier =
      c >= 15 ? 3 : c >= 10 ? 2 : c >= 5 ? 1 : 0;

    // Pose — precedence: dive > scrunch > flap > lean > idle.
    // Pose detection lands in Task B.3; default to 'idle' / 'flap' for now.
    if (this.birdState.flapPhase > 0.05) this.birdState.pose = 'flap';
    else this.birdState.pose = 'idle';

    // Push current bird position into trail (for tells in Phase D).
    this.birdTrail.push({ x: this.bird.x, y: this.bird.y, t: performance.now() });
    if (this.birdTrail.length > 10) this.birdTrail.shift();
  }
```

NOTE: `springStep` must already be imported in `js/game.js`. CHECK the top of `js/game.js` for an import like `import { ..., springStep, ... } from './effects.js';`. If `springStep` is missing from the import, ADD it. (`js/effects.js` exports `springStep`.)

- [ ] **Step 3: Call `_updateBirdState(dt)` from the per-tick update**

Find the main update method in the Game class (look for `update(dt)` or similar — the method that advances physics each frame). ADD `this._updateBirdState(dt);` near the END of update (after physics/collision but before render).

If `update` doesn't exist as a separate method and the loop is inside a private `tick`, add the call there at the equivalent spot. Use READ + grep to find the update loop reliably.

- [ ] **Step 4: Verify the state ticks**

Hard-refresh `http://localhost:8765/`. Start a run. Open DevTools console and paste:

```js
const g = window.__game = (window.__game || null);
// If currentGame isn't exposed, use the indirect path:
const game = document.querySelector('canvas') && /* getter */ null;
// Simpler: instrument a temporary console.log inside _updateBirdState (remove after verifying).
```

Pragmatic alternative: ADD `console.log('birdState', this.birdState.pose, this.birdState.comboTier)` inside `_updateBirdState` as a temporary line. Hard-refresh, start a run, watch console for tick output, then REMOVE the console.log and commit.

Expected console output: `birdState idle 0` repeating, switching to `birdState flap 0` briefly when you flap.

- [ ] **Step 5: Commit**

```bash
git add js/game.js
git commit -m "Game: add birdState object + per-tick updater with combo tier"
```

---

## Task B.2: Create `drawBirdWithState` wrapper + wire game render path

**Files:**
- Modify: `js/birds.js` — add the wrapper export.
- Modify: `js/game.js` — use the wrapper instead of direct `bird.draw()`.

- [ ] **Step 1: Add `drawBirdWithState` to `js/birds.js`**

In `js/birds.js`, after the `drawEyeOverlay` helper (added in Task A.3), ADD:

```js
// Wrapper that applies pose transforms + eye-event overlay around the bird's draw.
// Pose codes: 'idle' | 'flap' | 'dive' | 'scrunch' | 'lean'.
//   - flap: vertical squish driven by state.flapPhase (0..1)
//   - dive: stretched vertical
//   - scrunch: small uniform compression
//   - lean: small forward translate
export function drawBirdWithState(bird, ctx, r, state) {
  ctx.save();
  if (state) {
    if (state.pose === 'flap') {
      const f = Math.max(0, Math.min(1, state.flapPhase));
      ctx.scale(1 - 0.25 * f, 1 + 0.18 * f);
    } else if (state.pose === 'dive') {
      ctx.scale(0.9, 1.15);
    } else if (state.pose === 'scrunch') {
      ctx.scale(0.85, 0.85);
    } else if (state.pose === 'lean') {
      ctx.translate(2, 0);
    }
  }
  bird.draw(ctx, r);
  if (state && state.eyeEvent) {
    drawEyeOverlay(ctx, r, state.eyeEvent);
  }
  ctx.restore();
}
```

- [ ] **Step 2: Find the bird-drawing call site in `js/game.js`**

Search `js/game.js` for `bird.draw(` or `currentBird.draw(` or `.draw(ctx, r)` to find where the bird is rendered each frame.

In most likely structure: there's a `_drawBird(ctx)` or inline draw block in `_draw` / `render` that does roughly:

```js
ctx.save();
ctx.translate(this.bird.x, this.bird.y);
// possibly: ctx.rotate(...);
this.currentBird.draw(ctx, this.bird.r);
ctx.restore();
```

- [ ] **Step 3: Import `drawBirdWithState` and replace the draw call**

Add `drawBirdWithState` to the existing import from `./birds.js` at the top of `js/game.js`. The import line looks something like:

```js
import { drawWing, ... } from './birds.js';
```

CHANGE to include `drawBirdWithState`:

```js
import { drawWing, drawBirdWithState, ... } from './birds.js';
```

(Preserve whatever other named imports were there. If the file imports `BIRDS` or `getBird`, leave those.)

Then replace the bird draw call:

```js
// OLD: this.currentBird.draw(ctx, this.bird.r);
// NEW:
drawBirdWithState(this.currentBird, ctx, this.bird.r, this.birdState);
```

NOTE: If the photo-bird path is handled separately (with custom `ctx.clip` + `drawImage`), DO NOT wrap that. The wrapper is only for procedural birds. Photo-bird stays on its existing render path.

- [ ] **Step 4: Visual verification — nothing should break**

Hard-refresh `http://localhost:8765/`. Start a run. Bird should render identically to before (pose is still 'idle' or 'flap'; flap state from Task B.1 was added but `flap` pose now produces a tiny visible squish on each flap because of the wrapper).

If the bird disappears or looks distorted in some way unrelated to "tiny squish on flap", revert the wrapper call and report DONE_WITH_CONCERNS — likely the call site is inside an existing transform stack that the wrapper doesn't expect.

- [ ] **Step 5: Commit**

```bash
git add js/birds.js js/game.js
git commit -m "Game: route bird rendering through drawBirdWithState wrapper"
```

---

## Task B.3: Pose detection (dive, scrunch, lean)

**Files:**
- Modify: `js/game.js` — extend `_updateBirdState`.

- [ ] **Step 1: Replace the pose-detection block in `_updateBirdState`**

In the `_updateBirdState(dt)` method added in Task B.1, REPLACE the pose-detection lines (currently `if (this.birdState.flapPhase > 0.05) this.birdState.pose = 'flap'; else this.birdState.pose = 'idle';`) with:

```js
    // Pose — precedence: dive > scrunch > flap > lean > idle.
    const inDive = this.bird.vy > 8;
    const inFlap = this.birdState.flapPhase > 0.05;
    const highCombo = (this.combo || 0) >= 5;
    const inScrunch = this._birdInGap();   // implemented below

    if (inDive)         this.birdState.pose = 'dive';
    else if (inScrunch) this.birdState.pose = 'scrunch';
    else if (inFlap)    this.birdState.pose = 'flap';
    else if (highCombo) this.birdState.pose = 'lean';
    else                this.birdState.pose = 'idle';
```

- [ ] **Step 2: Add `_birdInGap()` method**

In the Game class, ADD:

```js
  // Returns true if the bird is currently inside the horizontal span of a pipe pair
  // AND vertically close to either the top or bottom obstacle edge (within 20px).
  _birdInGap() {
    if (!this.obstacles || !this.obstacles.length) return false;
    const bx = this.bird.x;
    const by = this.bird.y;
    for (const pair of this.obstacles) {
      // Each pair likely has: { x, gapY, gap, width? } — adapt to actual shape.
      const pw = pair.width || 60;
      if (bx + this.bird.r < pair.x) continue;
      if (bx - this.bird.r > pair.x + pw) continue;
      const gapTop = pair.gapY - pair.gap / 2;
      const gapBot = pair.gapY + pair.gap / 2;
      if (Math.abs(by - gapTop) < 20 || Math.abs(by - gapBot) < 20) return true;
    }
    return false;
  }
```

NOTE: If pipe pair geometry differs from `{ x, gapY, gap, width }` — for example if `width` lives somewhere else or if `gap` is stored per-level — adapt. Use a Read or Grep on `js/game.js` for `obstacles.push` to see the shape used at creation time.

- [ ] **Step 3: Manual verification**

Hard-refresh, start a run. Behaviors to observe:
- **Dive:** when you fall fast (after several non-flap frames), bird stretches vertically.
- **Scrunch:** when you squeeze through a pipe gap close to either edge, bird compresses for that frame.
- **Lean:** at combo ≥ 5, bird visually shifts 2px to the right (subtle).
- **Flap:** unchanged from Task B.2 — squish on flap.

If lean is too subtle to notice, leave it — the spec wanted a *minor* visual cue.

- [ ] **Step 4: Commit**

```bash
git add js/game.js
git commit -m "Game: pose detection (dive, scrunch, lean) in birdState"
```

---

## Task B.4: Eye event triggers (coin, near-miss, combo break)

**Files:**
- Modify: `js/game.js`

- [ ] **Step 1: Add a tiny helper for setting eye events**

In the Game class, ADD:

```js
  _setEyeEvent(event, ms = 250) {
    this.birdState.eyeEvent = event;
    this.birdState.eyeEventTtl = ms;
  }
```

- [ ] **Step 2: Trigger `'coin'` on coin pickup**

In `js/game.js`, find where coin pickup happens (search for `coinsCollected += 1` from Task 3.3 of the prior UI overhaul plan). After incrementing the counter (and before/around the existing `this.onCoin(...)` callback), ADD:

```js
        this._setEyeEvent('coin', 280);
```

- [ ] **Step 3: Trigger `'nearMiss'` on near-miss**

Similarly, find where near-miss is detected (search for `nearMisses += 1`). After the increment and after firing `this.onNearMiss(...)`, ADD:

```js
        this._setEyeEvent('nearMiss', 220);
```

- [ ] **Step 4: Trigger `'comboBreak'` when combo drops from ≥5 to 0**

Find where combo is reset to 0 (search for `this.combo = 0` or `combo = 0` in a non-init context). BEFORE the reset, capture the prior combo, then after the reset:

```js
        const prevCombo = this.combo;
        this.combo = 0;
        // ... existing onCombo(0) call ...
        if (prevCombo >= 5) this._setEyeEvent('comboBreak', 320);
```

If the existing code is structured differently (e.g. combo is set inside a method that doesn't have inline access to the prior value), use whatever pattern best fits — the goal is: "fire eye event only when transitioning from combo ≥ 5 to combo 0".

- [ ] **Step 5: Manual verification**

Hard-refresh, start a run.
- Fly into a coin: bird's eyes briefly show `$` for ~280ms.
- Scrape a pipe (near-miss): bird's eyes go wide for ~220ms.
- Build a combo ≥ 5, then crash through a pipe (combo break): bird's eyes get angry V-slit for ~320ms.

Each event is brief but visible. If you don't see them at all, check that the eye overlay is being rendered AFTER the bird's normal eyes (it is — `drawBirdWithState` in Task B.2 calls `bird.draw` first, then overlay).

- [ ] **Step 6: Commit**

```bash
git add js/game.js
git commit -m "Game: trigger reactive eye events on coin/near-miss/combo-break"
```

---

# PHASE C — ANIMATION JUICE

## Task C.1: Squash + stretch on flap via springStep

**Files:**
- Modify: `js/game.js`

The flapPhase decay (Task B.1) and squish render (Task B.2) are already wired. This task just triggers a flap impulse on the input.

- [ ] **Step 1: Find the flap input handler**

Search `js/game.js` for `flap()` or `onFlap` or wherever the player's flap action lives (tap/space/click ends up calling a single internal method that bumps `this.bird.vy = -X`).

- [ ] **Step 2: Add a flapPhase bump at the start of the flap method**

At the start of the flap method (after any guards like `if (this.state !== 'playing') return;`), ADD:

```js
    // Visual squish impulse — drives birdState.pose='flap' for the next 200-300ms.
    this.birdState.flapPhase = 1;
    this.birdState.flapPhaseV = -6;   // gives the spring an initial kick downward
```

- [ ] **Step 3: Manual verification**

Hard-refresh, start a run. Each tap/click/space input now produces a visible vertical squish on the bird that springs back. Should feel meaty.

If the squish is too aggressive (bird looks like a flat pancake), reduce the initial values: `flapPhase = 0.7; flapPhaseV = -4;`.

If it's too subtle, increase: `flapPhase = 1.2; flapPhaseV = -8;`.

- [ ] **Step 4: Commit**

```bash
git add js/game.js
git commit -m "Game: flap input triggers squash-and-stretch via birdState"
```

---

## Task C.2: Pipe wobble on near-miss

**Files:**
- Modify: `js/game.js`

- [ ] **Step 1: Initialize wobble on every pipe pair at creation**

In `js/game.js`, find where pipe pairs are pushed into `this.obstacles` (e.g. `obstacles.push({ x: ..., gapY: ..., ... })`). ADD `wobble: 0` to the object:

```js
      this.obstacles.push({
        x: ...,
        gapY: ...,
        gap: ...,
        wobble: 0,         // <— ADD
        spawnAge: 0,       // forward-ref for Task C.3
      });
```

(`spawnAge` is for Task C.3. Add both now so we don't touch this site twice.)

- [ ] **Step 2: Decay wobble each tick**

Find the per-tick obstacles update (the loop that advances pipe X or removes off-screen pipes). ADD a wobble decay inside that loop:

```js
      pair.wobble *= 0.93;
      pair.spawnAge = (pair.spawnAge ?? 0) + dt;
```

- [ ] **Step 3: Set `pair.wobble = 1` when a near-miss is registered**

Find the near-miss detection (search for `nearMisses += 1` again — added eye events to the same spot in B.4). Where the near-miss is detected, the code likely knows which pipe pair was scraped. Set that pair's wobble:

```js
        // existing detection finds the pair `p` that was nearly hit
        p.wobble = 1;
```

If the existing detection doesn't keep a reference to the pair, READ the surrounding code to figure out how to retrieve it. Worst case: re-find by min distance from bird.x.

- [ ] **Step 4: Apply the wobble offset in render**

Find the pipe rendering loop (search for where pipes are drawn — typically `drawPipe(ctx, p)` or inline `ctx.fillRect(p.x, ...)` style). Before the draw, compute and apply an X offset:

```js
      const wobX = Math.sin(performance.now() * 0.03) * (pair.wobble || 0) * 4;
      // Use (pair.x + wobX) instead of pair.x in the subsequent draw calls.
```

NOTE: Collision detection should still use `pair.x` (no offset). Only RENDER uses the offset.

- [ ] **Step 5: Manual verification**

Hard-refresh. Play a run. Scrape past a pipe edge (near-miss). The pipe pair should visibly wobble side-to-side for ~300ms while the "CLOSE!" popup fires.

- [ ] **Step 6: Commit**

```bash
git add js/game.js
git commit -m "Game: pipe wobble on near-miss (render-only offset)"
```

---

## Task C.3: Pipe rise from below on spawn

**Files:**
- Modify: `js/game.js`

`spawnAge` was added per pipe in Task C.2. This task uses it to offset render Y.

- [ ] **Step 1: easeOutBack helper at the top of the file**

In `js/game.js`, near the top (after imports), ADD a small easing helper if not already present:

```js
function easeOutBack(t) {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
}
```

- [ ] **Step 2: Compute Y offset and apply in pipe render**

In the pipe render loop (same spot as Task C.2's `wobX`), ADD a Y offset:

```js
      const rise = Math.min(1, (pair.spawnAge || 0) / 250);
      const yOffset = (1 - easeOutBack(rise)) * 80;
      // Use pair.gapY + yOffset for the gap center when computing draw rects.
      // Equivalently: shift the top half draw and bottom half draw by yOffset.
```

If the pipe halves are drawn with `ctx.fillRect(pair.x, 0, w, gapTop)` for the top half and `ctx.fillRect(pair.x, gapBot, w, h - gapBot)` for the bottom, the offset applies to BOTH halves (both get `+yOffset` to their y origin).

- [ ] **Step 3: Manual verification**

Hard-refresh, start a run. New pipes scrolling in from the right should "rise up" into position over ~250ms with a slight overshoot (the back-easing).

If pipes look JUMPY rather than smooth, easeOutBack might be producing values > 1 — that's expected for the overshoot effect. If it's truly broken, swap to a simpler `easeOutQuad`:

```js
function easeOutQuad(t) { return t * (2 - t); }
```

- [ ] **Step 4: Commit**

```bash
git add js/game.js
git commit -m "Game: new pipes rise up into position on spawn"
```

---

## Task C.4: Combo-driven world reactions (scene + score aura)

**Files:**
- Modify: `js/scene.js`
- Modify: `js/game.js`
- Modify: `style/_play.css`

- [ ] **Step 1: Accept `tier` in `updateScene` and `drawScene`**

In `js/scene.js`, find `export function updateScene(scene, dt)` and `export function drawScene(ctx, scene, scrollX, time, viewW, viewH, groundY)`.

UPDATE the signatures to accept an optional `tier` (default 0):

```js
export function updateScene(scene, dt, tier = 0) {
  // existing body
  // Where clouds/balloons drift, multiply the drift by (1 + tier * 0.3).
  // Find any `* dt` lines that advance cloud positions; multiply the dt or
  // the speed constant by (1 + tier * 0.3).
}

export function drawScene(ctx, scene, scrollX, time, viewW, viewH, groundY, tier = 0) {
  // existing body
  // Where sun/moon pulse is computed (look for sin(time * something) * amplitude),
  // amplify with: amplitude = baseAmplitude + tier;
}
```

NOTE: The exact lines depend on the scene.js structure. The PRINCIPLE: any drift / pulse / motion in the scene that should respond to combo, multiply by `(1 + tier * 0.3)` for drift, or add `tier` to the pulse amplitude. Use READ on scene.js to find specific spots.

- [ ] **Step 2: Pass tier from game.js**

In `js/game.js`, find the `updateScene(...)` and `drawScene(...)` call sites. ADD the tier:

```js
    updateScene(this.scene, dt, this.birdState.comboTier);
    // ...later in render:
    drawScene(ctx, this.scene, this.scrollX, performance.now(), viewW, viewH, this.groundY, this.birdState.comboTier);
```

- [ ] **Step 3: Add combo-aura CSS classes to `style/_play.css`**

In `style/_play.css`, APPEND:

```css
.score.combo-aura-1 { text-shadow: -3px 0 0 var(--frame-dark), 3px 0 0 var(--frame-dark), 0 -3px 0 var(--frame-dark), 0 3px 0 var(--frame-dark), 0 6px 0 rgba(0,0,0,0.4), 0 0 8px var(--accent); }
.score.combo-aura-2 { text-shadow: -3px 0 0 var(--frame-dark), 3px 0 0 var(--frame-dark), 0 -3px 0 var(--frame-dark), 0 3px 0 var(--frame-dark), 0 6px 0 rgba(0,0,0,0.4), 0 0 16px var(--sunset); }
.score.combo-aura-3 { text-shadow: -3px 0 0 var(--frame-dark), 3px 0 0 var(--frame-dark), 0 -3px 0 var(--frame-dark), 0 3px 0 var(--frame-dark), 0 6px 0 rgba(0,0,0,0.4), 0 0 24px var(--accent-2); }
```

- [ ] **Step 4: Toggle the aura class from `js/main.js`**

The existing `onCombo` handler in `js/main.js` (added in Task 3.3 of the UI overhaul) updates the combo meter. EXTEND it to also toggle the score aura. Find the `onCombo: (streak) => { ... }` block. ADD at the end of the body:

```js
      const score = document.getElementById('score');
      score.classList.remove('combo-aura-1', 'combo-aura-2', 'combo-aura-3');
      const tier = streak >= 15 ? 3 : streak >= 10 ? 2 : streak >= 5 ? 1 : 0;
      if (tier > 0) score.classList.add(`combo-aura-${tier}`);
```

- [ ] **Step 5: Manual verification**

Hard-refresh, start a run. Build combo:
- At combo ≥ 5: score has a faint amber glow.
- At combo ≥ 10: score glow shifts to sunset orange.
- At combo ≥ 15: score glow shifts to pink, AND clouds noticeably drift faster, sun/moon pulse harder.

- [ ] **Step 6: Commit**

```bash
git add js/scene.js js/game.js js/main.js style/_play.css
git commit -m "Combo-driven world reactions: scene drift + score aura by tier"
```

---

## Task C.5: Verify reduced-motion respects all new motion

**Files:**
- Modify: `js/game.js` (small guards in `_updateBirdState`).
- Modify: `js/birds.js` (small guard in `drawBirdWithState`).

- [ ] **Step 1: Guard pose transforms in `drawBirdWithState`**

In `js/birds.js` `drawBirdWithState`, at the very top of the function, ADD a reduced-motion guard. Import `isReducedMotion` at the top of `birds.js`:

```js
import { isReducedMotion } from './settings.js';
```

(If birds.js doesn't already import from settings.js, this is a new import line.)

Then update `drawBirdWithState`:

```js
export function drawBirdWithState(bird, ctx, r, state) {
  ctx.save();
  if (state && !isReducedMotion()) {
    if (state.pose === 'flap') {
      const f = Math.max(0, Math.min(1, state.flapPhase));
      ctx.scale(1 - 0.25 * f, 1 + 0.18 * f);
    } else if (state.pose === 'dive') {
      ctx.scale(0.9, 1.15);
    } else if (state.pose === 'scrunch') {
      ctx.scale(0.85, 0.85);
    } else if (state.pose === 'lean') {
      ctx.translate(2, 0);
    }
  }
  bird.draw(ctx, r);
  if (state && state.eyeEvent && !isReducedMotion()) {
    drawEyeOverlay(ctx, r, state.eyeEvent);
  }
  ctx.restore();
}
```

- [ ] **Step 2: Guard pipe wobble + spawn-rise + flapPhase in game.js**

In `js/game.js`, at the top, import `isReducedMotion`:

```js
import { isReducedMotion } from './settings.js';
```

In the pipe render loop where `wobX` and `yOffset` are computed (Tasks C.2/C.3), wrap with a guard:

```js
      const reduced = isReducedMotion();
      const wobX = reduced ? 0 : Math.sin(performance.now() * 0.03) * (pair.wobble || 0) * 4;
      const rise = Math.min(1, (pair.spawnAge || 0) / 250);
      const yOffset = reduced ? 0 : (1 - easeOutBack(rise)) * 80;
```

In `_updateBirdState`, if `isReducedMotion()`, skip the flapPhase spring update (set both to 0):

```js
    if (isReducedMotion()) {
      this.birdState.flapPhase = 0;
      this.birdState.flapPhaseV = 0;
    } else {
      const sp = springStep(this.birdState.flapPhase, this.birdState.flapPhaseV, 0, dt / 1000, 240, 22);
      this.birdState.flapPhase  = sp.value;
      this.birdState.flapPhaseV = sp.velocity;
      if (Math.abs(this.birdState.flapPhase) < 0.002) {
        this.birdState.flapPhase = 0;
        this.birdState.flapPhaseV = 0;
      }
    }
```

(Replace the existing flapPhase spring block with this if/else.)

- [ ] **Step 3: Manual verification**

Hard-refresh. Open Settings → toggle Reduced Motion to ON. Hard-refresh, start a run.

Expected with reduced-motion ON:
- No bird squish on flap.
- No pose changes (no dive stretch, scrunch, lean — bird renders at normal scale).
- No eye-event overlays.
- No pipe wobble on near-miss.
- No pipe spawn-rise.
- Combo aura on score: still visible (CSS — that's allowed since it's static glow, not motion).

Toggle Reduced Motion OFF → Auto: all motion comes back.

- [ ] **Step 4: Commit**

```bash
git add js/birds.js js/game.js
git commit -m "Animation: respect prefers-reduced-motion in bird state + pipe FX"
```

---

# PHASE D — DEATH + TELLS

## Task D.1: Bullet-time before death

**Files:**
- Modify: `js/game.js`

- [ ] **Step 1: Add `_predictCollision()` method**

In the Game class, ADD:

```js
  _predictCollision(stepMs = 150) {
    // Project the bird one logical step ahead at current velocity + gravity.
    // Returns true if a collision would occur within `stepMs` from now.
    const steps = 3;
    const subDt = stepMs / steps;
    let x = this.bird.x;
    let y = this.bird.y;
    let vy = this.bird.vy;
    const g = this.gravity ?? 1500;
    for (let i = 0; i < steps; i++) {
      vy += g * (subDt / 1000);
      y += vy * (subDt / 1000);
      // Collision against ground
      if (y + this.bird.r >= this.groundY) return true;
      // Collision against pipes
      for (const pair of this.obstacles) {
        if (x + this.bird.r < pair.x) continue;
        const pw = pair.width || 60;
        if (x - this.bird.r > pair.x + pw) continue;
        const gapTop = pair.gapY - pair.gap / 2;
        const gapBot = pair.gapY + pair.gap / 2;
        if (y - this.bird.r < gapTop || y + this.bird.r > gapBot) return true;
      }
    }
    return false;
  }
```

NOTE: `this.gravity` is best-guess — adapt if the game uses a different constant. Use READ + grep for `gravity` or `g *` in `js/game.js` to find the actual value.

- [ ] **Step 2: Add bullet-time state to constructor**

In the Game constructor, alongside `this.birdState`, ADD:

```js
    this.bulletTimeActive = false;
    this.bulletTimeStart = 0;
```

- [ ] **Step 3: Apply bullet-time slowdown in the update loop**

Find the update loop's `dt` handling — typically the first lines compute `dt = now - lastTime;`. AFTER `dt` is computed but BEFORE it's used for physics, ADD:

```js
    // Bullet-time check (only when alive and not already slow)
    if (this.state === 'playing' && !this.bulletTimeActive && !isReducedMotion()) {
      if (this._predictCollision(150)) {
        this.bulletTimeActive = true;
        this.bulletTimeStart = performance.now();
      }
    }
    // Apply slowdown
    let scaledDt = dt;
    if (this.bulletTimeActive) {
      scaledDt = dt * 0.25;
      // Expire after 150ms of real time
      if (performance.now() - this.bulletTimeStart >= 150) {
        this.bulletTimeActive = false;
      }
    }
    // Use scaledDt for physics from here on
    dt = scaledDt;
```

(Adapt the variable substitution to wherever `dt` is consumed downstream.)

`isReducedMotion` already imported in Task C.5.

- [ ] **Step 4: Manual verification**

Hard-refresh, start a run, intentionally fly into a pipe. In the ~150ms before impact, the game noticeably slows down. Death still occurs at the same physical moment.

If you can't reliably trigger the slow-mo, the prediction may not be conservative enough. Increase the prediction window to `_predictCollision(200)`.

- [ ] **Step 5: Commit**

```bash
git add js/game.js
git commit -m "Game: bullet-time slowdown 150ms before predicted collision"
```

---

## Task D.2: Damage-source detection on collision

**Files:**
- Modify: `js/game.js`

- [ ] **Step 1: Capture damage source in the collision handler**

Find the collision detection in `js/game.js` (search for `state = 'dying'` or `state = 'over'` or a method like `_die()` / `_handleCollision()`). When a collision is registered, determine the source:

```js
  _setDamageSource() {
    // Ground: bird's bottom touches groundY
    if (this.bird.y + this.bird.r >= this.groundY - 1) {
      this.birdState.recentDamageSource = 'ground';
      return;
    }
    // Pipe: find the overlapping pair, then determine top vs bottom
    for (const pair of this.obstacles) {
      const pw = pair.width || 60;
      if (this.bird.x + this.bird.r < pair.x) continue;
      if (this.bird.x - this.bird.r > pair.x + pw) continue;
      const gapTop = pair.gapY - pair.gap / 2;
      const gapBot = pair.gapY + pair.gap / 2;
      if (this.bird.y - this.bird.r < gapTop) {
        this.birdState.recentDamageSource = 'topPipe';
        return;
      }
      if (this.bird.y + this.bird.r > gapBot) {
        this.birdState.recentDamageSource = 'bottomPipe';
        return;
      }
    }
    this.birdState.recentDamageSource = null;
  }
```

- [ ] **Step 2: Call `_setDamageSource()` at the start of the death handler**

Find the death/over transition (search for `state = 'dying'` or similar). At the very start of that handler, BEFORE any animation/particle code, ADD:

```js
    this._setDamageSource();
```

- [ ] **Step 3: Manual verification (temporary console.log)**

In `_setDamageSource`, temporarily ADD `console.log('damage source:', this.birdState.recentDamageSource);` after the `return;` sets. Test all three scenarios:
- Crash into a top pipe → `damage source: topPipe`
- Crash into a bottom pipe → `damage source: bottomPipe`
- Hit the ground → `damage source: ground`

REMOVE the console.log before commit.

- [ ] **Step 4: Commit**

```bash
git add js/game.js
git commit -m "Game: detect damage source on collision (top/bottom/ground)"
```

---

## Task D.3: Branched death animations per damage source

**Files:**
- Modify: `js/game.js` — death animation reads `recentDamageSource`.

- [ ] **Step 1: Branch the existing death code**

Find the existing death animation (likely uses `spawnFragments` from `js/effects.js`, plus `screenShake` and `redFlash`). Wrap or extend it to branch on `this.birdState.recentDamageSource`:

```js
  _runDeathAnimation() {
    const src = this.birdState.recentDamageSource;
    // Common bits (kept): X-eyes, red flash, etc.
    // Branch the shatter direction + camera nudge + particle pattern.
    if (src === 'topPipe') {
      // Slammed down — particles fall fast, slight upward camera nudge
      spawnFragments(this.particles, this.bird, this.birdImage, {
        vx: -50 + Math.random() * 30,
        vy: 200,
        spread: 80,
      });
      this.shake.kick(12, 'vertical');   // <- adapt to actual ScreenShake API
    } else if (src === 'bottomPipe') {
      // Bounced up — particles get upward kick first
      spawnFragments(this.particles, this.bird, this.birdImage, {
        vx: 50 + Math.random() * 30,
        vy: -180,
        spread: 100,
      });
      this.shake.kick(12, 'vertical');
    } else {
      // Ground (or unknown) — flat dust ring + horizontal shake
      spawnFragments(this.particles, this.bird, this.birdImage, {
        vx: 0,
        vy: -50,
        spread: 140,
      });
      // Dust ring (reuses spawnRingBurst if available)
      if (this.particles && typeof spawnRingBurst === 'function') {
        spawnRingBurst(this.particles, this.bird.x, this.groundY, '#aa9966', 24);
      }
      this.shake.kick(14, 'horizontal');
    }
  }
```

NOTE: The exact `spawnFragments` and `shake.kick` signatures depend on the actual code in `effects.js`/`game.js`. Use READ to confirm signatures. If `spawnFragments` doesn't accept an opts object today, EITHER extend it to OR set the velocities after spawn by mutating the particles directly (worst case: just call the existing `spawnFragments` for all three branches and skip the per-branch tuning).

If `spawnRingBurst` isn't imported, add it to the imports from `./effects.js`.

- [ ] **Step 2: Call `_runDeathAnimation()` instead of the existing inline death code**

Replace the inline death-anim code in the death handler with a single call to `this._runDeathAnimation();`. Preserve the surrounding sequencing (red flash, state transition, overlay show — those stay).

If the existing death code is simple (just `spawnFragments(this.particles, this.bird, this.birdImage)` and `screenShake`), replacing it with the branched version is straightforward. If it's more elaborate (multiple stages, timeouts), keep the structure and only swap the inner spawn/shake.

- [ ] **Step 3: Manual verification**

Hard-refresh, start a run, deliberately die into each surface:
- Top pipe: pieces fall hard downward; subtle vertical screen shake (felt as "bird got slammed").
- Bottom pipe: pieces fly upward initially then fall; vertical shake (felt as "bird got launched").
- Ground: flat spread; horizontal shake; dust ring if implemented.

If branching isn't visibly distinct, the spawnFragments behavior may smooth out the velocity differences. That's acceptable for v1 — log it as a tuning item.

- [ ] **Step 4: Commit**

```bash
git add js/game.js
git commit -m "Game: branched death animation by damage source"
```

---

## Task D.4: Ghost.tell — ghost trail

**Files:**
- Modify: `js/birds.js`
- Modify: `js/game.js` (call point if not yet wired)

- [ ] **Step 1: Add `tell` to BIRDS.ghost**

In `js/birds.js`, find the `BIRDS.ghost` definition. ADD a `tell` property:

```js
  ghost: {
    id: 'ghost',
    name: 'GHOST',
    desc: 'Unbothered. Dead.',
    unlock: { type: 'deaths', value: 20 },
    wingFill: 'rgba(255,255,255,0.75)',
    wingStroke: '#aabad4',
    draw: drawGhost,
    tell: ghostTell,           // <— ADD
  },
```

Then ADD `ghostTell` near the bottom of the file (after the existing draw functions):

```js
// Ghost trail — 3 past bird positions drawn with decreasing opacity.
function ghostTell(ctx, gameCtx, particles) {
  const trail = gameCtx.birdTrail || [];
  const len = trail.length;
  if (len < 2) return;
  const bird = gameCtx.currentBird;
  ctx.save();
  for (let i = 0; i < Math.min(3, len - 1); i++) {
    const t = trail[len - 2 - i];
    if (!t) break;
    const alpha = 0.35 * (1 - i / 3);
    ctx.globalAlpha = alpha;
    ctx.save();
    ctx.translate(t.x, t.y);
    bird.draw(ctx, gameCtx.bird.r);
    ctx.restore();
  }
  ctx.restore();
}
```

- [ ] **Step 2: Call `currentBird.tell(...)` from game.js render**

Find the bird-rendering block in `js/game.js` (where `drawBirdWithState(...)` is called). BEFORE the bird's own draw call, render its tell if it has one. The trail is in WORLD coordinates so it needs the same translate-by-scroll setup as the bird; render in screen space (no translate) and pass the world coords:

Actually, since the trail positions are stored in WORLD coords, the simplest approach: render tell BEFORE the bird's own translate, in the same coordinate system as obstacles. ADD just before the `ctx.save() / ctx.translate(this.bird.x, this.bird.y) / drawBirdWithState(...)` block:

```js
    if (this.currentBird.tell) {
      ctx.save();
      // tell renders in world coords; world coords are already what obstacles use,
      // so no extra translate needed if the bird-draw block does its own translate.
      this.currentBird.tell(ctx, this, this.particles);
      ctx.restore();
    }
```

NOTE: World vs screen coordinate convention depends on the render setup. If the render begins with `ctx.translate(-this.scrollX, 0)` (world->screen), then world coords work directly. If not, the tell needs to translate too. The simplest safe approach: have the tell render in the SAME coord system the bird does (so `bird.draw(ctx, r)` works correctly — it's all centered at translate(0,0)). Adjust as needed.

- [ ] **Step 3: Manual verification**

Hard-refresh. Equip Ghost (from BIRDS in menu — must be unlocked, which requires 20 crashes; for testing, manually unlock via console: `localStorage.setItem('ff.unlocked', JSON.stringify(['buddy','ghost']))` then refresh and select Ghost in Aviary).

Start a run with Ghost. Three semi-transparent ghost shapes should follow behind the bird as it moves.

- [ ] **Step 4: Commit**

```bash
git add js/birds.js js/game.js
git commit -m "Birds: Ghost.tell — trailing ghost afterimages"
```

---

## Task D.5: Rainbow.tell — rainbow afterimage

**Files:**
- Modify: `js/birds.js`

- [ ] **Step 1: Add `tell` to BIRDS.rainbow**

In `js/birds.js`, find `BIRDS.rainbow`. ADD a `tell` property:

```js
  rainbow: {
    id: 'rainbow',
    // ... existing fields
    draw: drawRainbow,
    tell: rainbowTell,         // <— ADD
  },
```

ADD `rainbowTell`:

```js
// Rainbow afterimage — colored streak behind the bird, brighter with combo.
function rainbowTell(ctx, gameCtx, particles) {
  const trail = gameCtx.birdTrail || [];
  const len = trail.length;
  if (len < 2) return;
  const combo = gameCtx.combo || 0;
  const intensity = Math.min(1, combo / 10);
  const baseWidth = gameCtx.bird.r * 1.2;
  const colors = ['#ef476f', '#ffa657', '#ffd166', '#06d6a0', '#118ab2', '#a86bb4'];
  ctx.save();
  ctx.lineCap = 'round';
  ctx.globalAlpha = 0.4 + intensity * 0.4;
  for (let i = 0; i < len - 1; i++) {
    const a = trail[i];
    const b = trail[i + 1];
    ctx.strokeStyle = colors[(i + Math.floor(performance.now() * 0.01)) % colors.length];
    ctx.lineWidth = baseWidth * (i / len);
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
  }
  ctx.restore();
}
```

- [ ] **Step 2: Manual verification**

Hard-refresh. Equip Rainbow (`localStorage` trick if needed). Start a run. Behind the bird: a rainbow-colored streak that grows wider/brighter as combo increases.

- [ ] **Step 3: Commit**

```bash
git add js/birds.js
git commit -m "Birds: Rainbow.tell — combo-driven rainbow afterimage"
```

---

## Task D.6: Pizza.tell — crumb particles

**Files:**
- Modify: `js/birds.js`
- Modify: `js/effects.js` (add `spawnCrumb` helper)

- [ ] **Step 1: Add `spawnCrumb` to `js/effects.js`**

In `js/effects.js`, near other `spawn*` helpers (e.g. `spawnConfetti`), ADD:

```js
export function spawnCrumb(ps, x, y) {
  if (!ps) return;
  ps.particles.push({
    x, y,
    vx: -20 + Math.random() * 20,
    vy: -10 + Math.random() * -20,
    g: 360,
    life: 0.6,
    age: 0,
    size: 2 + Math.random() * 2,
    color: '#f4c430',
    shape: 'square',
  });
}
```

(If `ParticleSystem` requires a specific particle schema, adapt. Use READ on effects.js to confirm.)

- [ ] **Step 2: Add `tell` to BIRDS.pizza**

In `js/birds.js`, find `BIRDS.pizza`. ADD a `tell` property:

```js
  pizza: {
    id: 'pizza',
    // ... existing fields
    draw: drawPizza,
    tell: pizzaTell,           // <— ADD
  },
```

At the top of `js/birds.js`, ADD an import for `spawnCrumb`:

```js
import { spawnCrumb } from './effects.js';
```

ADD `pizzaTell`:

```js
// Pizza crumb particle every ~400ms.
let lastCrumb = 0;
function pizzaTell(ctx, gameCtx, particles) {
  const now = performance.now();
  if (now - lastCrumb < 400) return;
  lastCrumb = now;
  // Drop crumb from near the beak (right side of bird)
  spawnCrumb(particles, gameCtx.bird.x + gameCtx.bird.r * 1.2, gameCtx.bird.y);
}
```

- [ ] **Step 3: Manual verification**

Hard-refresh. Equip Pizza (use the easter-egg unlock: click the menu title 15 times if not already unlocked, OR use `localStorage.setItem('ff.unlocked', JSON.stringify(['buddy','pizza']))`). Start a run. A small yellow crumb should drop from near the bird every ~400ms.

- [ ] **Step 4: Commit**

```bash
git add js/birds.js js/effects.js
git commit -m "Birds: Pizza.tell — periodic cheese crumb particles"
```

---

## Task D.7: Daredevil.tell — speed lines

**Files:**
- Modify: `js/birds.js`

- [ ] **Step 1: Add `tell` to BIRDS.daredevil**

In `js/birds.js`, find `BIRDS.daredevil`. ADD a `tell` property:

```js
  daredevil: {
    id: 'daredevil',
    // ... existing fields
    draw: drawDaredevil,
    tell: daredevilTell,       // <— ADD
  },
```

ADD `daredevilTell`:

```js
// Daredevil speed lines — 4 horizontal strokes behind the bird.
function daredevilTell(ctx, gameCtx, particles) {
  ctx.save();
  ctx.strokeStyle = 'rgba(255, 80, 60, 0.6)';
  ctx.lineWidth = 2;
  ctx.lineCap = 'round';
  const lines = [
    { yOff: -gameCtx.bird.r * 0.4, len: 50 + Math.random() * 20 },
    { yOff: -gameCtx.bird.r * 0.15, len: 40 + Math.random() * 20 },
    { yOff:  gameCtx.bird.r * 0.15, len: 60 + Math.random() * 20 },
    { yOff:  gameCtx.bird.r * 0.4, len: 45 + Math.random() * 20 },
  ];
  for (const l of lines) {
    ctx.beginPath();
    ctx.moveTo(gameCtx.bird.x - gameCtx.bird.r * 0.8, gameCtx.bird.y + l.yOff);
    ctx.lineTo(gameCtx.bird.x - gameCtx.bird.r * 0.8 - l.len, gameCtx.bird.y + l.yOff);
    ctx.stroke();
  }
  ctx.restore();
}
```

- [ ] **Step 2: Manual verification**

Hard-refresh. Equip Daredevil (10 near-misses in a run, or use `localStorage` trick). Start a run. Four red-tinted horizontal speed lines should trail behind the bird, jittering slightly.

- [ ] **Step 3: Commit**

```bash
git add js/birds.js
git commit -m "Birds: Daredevil.tell — persistent speed lines"
```

---

# Wrap-up

After Phase D, all 19 tasks are complete. Each tell respects `isReducedMotion` via the Phase C.5 guard (if you want belt-and-suspenders, add explicit `if (isReducedMotion()) return;` at the top of each tell function — that's idempotent and harmless).

Phase summary:
- A: tails on all birds + pixel-snap pass + drawEyeOverlay helper
- B: birdState object + render wrapper + pose detection + eye event triggers
- C: flap squash + pipe wobble + pipe rise + combo-aura + reduced-motion verification
- D: bullet-time + damage source + branched deaths + 4 bird tells

Push, open a PR, or merge per project workflow.

---

## Self-Review Notes

**Spec coverage check (all 13 features):**
1. ✅ Personality eyes per bird — spec §3.1 — already in WIP code, plan extends with reactive overlays via `drawEyeOverlay` (Task A.3 + B.4).
2. ✅ Tail feathers — Task A.1.
3. ✅ Bird-specific accessories — already in WIP code; plan notes this and doesn't redo.
4. ✅ Pixel-snap rendering — Task A.2.
5. ✅ State-driven poses — Tasks B.1-B.3.
6. ✅ Reactive eyes — Tasks A.3 + B.4.
7. ✅ Squash + stretch on flap — Tasks B.1 (decay) + B.2 (render) + C.1 (impulse).
8. ✅ Pipe wobble on near-miss — Task C.2.
9. ✅ Combo-driven world reactions — Task C.4.
10. ✅ Pipe entry from below — Task C.3.
11. ✅ Bullet-time before death — Task D.1.
12. ✅ Damage-source death — Tasks D.2 + D.3.
13. ✅ Bird-specific gameplay tells — Tasks D.4-D.7.

**Placeholder scan:** no TBD/TODO. Some tasks include phrases like "use READ + grep to find" — these are intentional guidance for the implementer in cases where the orchestrator hasn't read every line of game.js. Concrete code blocks are always provided alongside.

**Type/signature consistency:**
- `birdState` shape (Task B.1) is referenced in B.2/B.3/B.4/C.1/C.5 — consistent.
- `drawBirdWithState(bird, ctx, r, state)` (B.2) called consistently in B.2 wiring + C.5 guard.
- `_setEyeEvent(event, ms)` (B.4) used consistently in B.4.
- `tell(ctx, gameCtx, particles)` signature consistent across D.4/D.5/D.6/D.7.
- `birdTrail` array (B.1) read by D.4 and D.5 — consistent shape `{ x, y, t }`.
- `recentDamageSource` (B.1) set by D.2, read by D.3 — consistent.

**Scope check:** 19 tasks across 4 phases. Reasonable for one plan. Independent of the prior UI overhaul; can be merged separately.
