# Bird & Animation Polish Pass

**Status:** Approved 2026-05-25
**Scope:** 13 features improving bird visual identity and in-game animation juice. Touches `js/birds.js`, `js/game.js`, `js/scene.js`, `js/effects.js`. No new modules, no new screens, no gameplay balance changes.

---

## 1. Aesthetic North Star

**"Same procedural bird code, more personality and physicality."**

Two complaints the current game can answer better:
- Birds look samey beyond color — all share `standardEye`, no tails, no accessories.
- The game looks juicy but every flap/death/near-miss currently feels mechanical; springs and shake are there, but the bird itself doesn't *react* visibly enough.

Both fixes preserve the existing system. We do NOT rewrite the bird rendering or game loop — we extend them with state-driven wrappers and per-bird overrides.

After this pass:
- Every bird is identifiable at 100px from across the screen (silhouette + accessory + eye shape).
- Every flap, near-miss, coin-grab, combo break, and death feels *physical* — the bird responds, the world reacts, the camera notices.
- Three birds (Ghost, Rainbow, Pizza, Daredevil) get unique mid-run gameplay tells so picking them feels meaningful, not just cosmetic.

---

## 2. Architecture decisions

### 2.1 Bird state plumbing

Today, `bird.draw(ctx, r)` takes only radius. To support state-driven poses and reactive eyes, we introduce a `birdState` object owned by `game.js` and threaded into bird rendering:

```js
const birdState = {
  pose: 'idle',          // 'idle' | 'flap' | 'dive' | 'scrunch' | 'lean'
  flapPhase: 0,          // 0..1, decays with springStep — drives squish
  eyeEvent: null,        // null | 'coin' | 'nearMiss' | 'comboBreak' (cleared each frame)
  comboTier: 0,          // 0..3, derived from current combo
  recentDamageSource: null, // set on death: 'topPipe' | 'bottomPipe' | 'ground'
};
```

A new exported wrapper handles state application:

```js
export function drawBirdWithState(bird, ctx, r, state) {
  ctx.save();
  // Apply pose transforms: scale (squish), rotate (tilt), translate (lean)
  if (state.pose === 'flap')     ctx.scale(1 - 0.25 * state.flapPhase, 1 + 0.18 * state.flapPhase);
  else if (state.pose === 'dive') ctx.scale(0.9, 1.15);
  else if (state.pose === 'scrunch') ctx.scale(0.85, 0.85);
  else if (state.pose === 'lean') ctx.translate(2, 0);

  bird.draw(ctx, r);

  // Eye-event overlay (drawn ON TOP of bird's normal eyes)
  if (state.eyeEvent) drawEyeOverlay(ctx, r, state.eyeEvent);
  ctx.restore();
}
```

`game.js` calls `drawBirdWithState(currentBird, ctx, r, this.birdState)` instead of `currentBird.draw(ctx, r)`. The photo-bird path (uploaded face) bypasses the wrapper and renders as it does today.

### 2.2 Per-bird overrides stay inside `bird.draw()`

Personality eyes, tails, and accessories are baked into each bird's existing `draw()` function. We add new optional helpers (`tailFeathers(ctx, r, fill)`, `accessoryFor(id, ctx, r)`, eye-style variants) but each bird decides which to use. The existing helpers (`shadedBody`, `beak`, `cheek`, `drawWing`) are untouched.

### 2.3 Bird-specific gameplay tells

A new optional `tell(ctx, gameCtx, particles)` method on selected birds, called once per render frame from `game.js` after the bird is drawn. Only 4 birds get one:

- Ghost — faint ghost-trail (3 fading bird-shaped afterimages).
- Rainbow — rainbow afterimage that grows wider with combo.
- Pizza — occasional cheese-crumb particles drop from beak.
- Daredevil — permanent speed lines behind the bird.

Other birds (Buddy/Punk/Chill/Royal/Collector/Legend/photo) have no `tell()` — default no-op.

### 2.4 Game-loop changes (bullet-time, damage source, pipe rise, pipe wobble)

These all touch `game.js`'s update or render path:
- **Bullet-time:** detect imminent collision (next-frame lookahead via `predictCollision`). If true and not already slow, slow the time factor (`dt *= 0.25`) for 150ms. Restore at impact or if collision averted.
- **Damage source:** when a collision is registered, store `which = 'topPipe' | 'bottomPipe' | 'ground'` on `this.birdState.recentDamageSource`. The death animation reads it and branches: shatter direction, camera nudge, particle pattern.
- **Pipe rise:** new pipes spawn with `spawnAge = 0`. While `spawnAge < 250ms`, render Y is offset by `(1 - spawnAge/250) * 80px` downward. So the pipe slides up into position.
- **Pipe wobble:** when a near-miss is registered on a pipe pair, set `pair.wobble = 1`. Decay to 0 over 300ms. Render X is offset by `sin(t * 30) * pair.wobble * 4px`.

### 2.5 Scene & combo coupling

`scene.js` accepts a `comboTier` argument (0-3) in `updateScene` / `drawScene`. At higher tiers:
- Cloud drift speed multiplier: 1.0 → 1.0 / 1.3 / 1.6 / 2.0.
- Sun/moon pulse amplitude scales with tier.
- Score element gets a CSS class `combo-aura-N` (N = tier) for a glow.

---

## 3. Per-feature specifications

### 3.1 Personality eyes (Phase A)

Replace per-bird `standardEye` calls with bird-specific eye renderers. New helpers in `birds.js`:

| Bird | Eye style |
|---|---|
| Buddy | standardEye (kept — it's the default) |
| Punk | angular slit, white pupil, eyeliner under |
| Chill | half-lidded, single small pupil |
| Royal | wide oval, tiny pupil, eyelash hint |
| Ghost | hollow black socket, no pupil |
| Rainbow | iridescent ring (4-color stops), white pupil |
| Pizza | googly eye look (large white, off-center black pupil) |
| Daredevil | narrow focused slit, intense |
| Collector | star-shaped pupil |
| Legend | gold-rimmed, fierce |

Each eye is ≤6 lines of canvas code. Falls within each bird's existing `draw()` function.

### 3.2 Tail feathers (Phase A)

New shared helper `tailFeathers(ctx, r, fill, stroke, style)` drawing 1-2 angled triangles behind the body. Styles: `'fan'` (default — 2 triangles fanned), `'point'` (single sharp), `'wispy'` (translucent, Ghost-only). Each bird calls it with its own colors. Drawn before `shadedBody` so it sits behind.

### 3.3 Bird accessories (Phase A)

| Bird | Accessory | Renders |
|---|---|---|
| Buddy | — (kept clean) | — |
| Punk | Mohawk | 5 spike triangles on top |
| Chill | Sunglasses | 2 black rounded rects over eyes |
| Royal | Crown | 3-point crown above head |
| Ghost | Translucent veil | Faint white ellipse around body |
| Rainbow | None (the rainbow eye IS the identity) | — |
| Pizza | Cheese strings | 3 yellow droplets near beak |
| Daredevil | Goggles | Brown band with 2 lens circles |
| Collector | Coin necklace | Small gold ring below body |
| Legend | Laurel wreath | 2 leaf arcs around head |

Each accessory ≤8 lines of canvas. Inside each bird's `draw()` function.

### 3.4 Pixel-snap rendering (Phase A)

In `birds.js` shared helpers and per-bird draw paths, `Math.round()` x/y coordinates before drawing. Add to `shadedBody`, `beak`, `cheek`, `tailFeathers`, eye helpers, accessory helpers. Bird renders cleaner against the parallax scene; the "pixel-art" identity gets stronger.

### 3.5 State-driven poses (Phase B)

Poses driven by `birdState.pose`:
- **flap:** triggered by `game.flap()`. Pose persists for 200ms. Visual: vertical squish via `springStep` (scaleY=0.75 → 1.15 → 1.0).
- **dive:** active while `bird.vy > 8` (fast fall). Visual: stretched vertically (0.9, 1.15).
- **scrunch:** active when bird is between two pipe halves vertically (within 20px of either edge AND between their x range). Visual: 0.85, 0.85 scale.
- **lean:** active when combo ≥ 5. Visual: 2px right translate (looks like leaning into wind).

Multiple conditions can be true; precedence: `dive > scrunch > flap > lean > idle`.

### 3.6 Reactive eyes (Phase B)

`birdState.eyeEvent` is set by `game.js` for ONE frame on:
- Coin pickup → `'coin'` (renders `$` over eyes).
- Near-miss → `'nearMiss'` (renders wide-O eyes).
- Combo break (combo went from ≥5 to 0) → `'comboBreak'` (renders angry slits).

The overlay sits ON TOP of the bird's normal eye rendering for that frame only. Implementation in `drawEyeOverlay(ctx, r, event)` helper.

### 3.7 Squash + stretch on flap (Phase C)

Covered by §3.5 pose system. The `flap` pose IS the squash-stretch — driven by `springStep` so it has natural decay. Triggered in `Game.flap()`:

```js
this.birdState.pose = 'flap';
this.birdState.flapPhase = 1;
// decay handled in update(): this.birdState.flapPhase = springStep(...)
```

### 3.8 Pipe wobble on near-miss (Phase C)

Each pipe pair (`obstacle`) gets a `wobble` field, default 0. When near-miss is detected on a pair, `pair.wobble = 1`. In `update()`, decay: `pair.wobble *= 0.93`. In pipe rendering, x is offset by `Math.sin(time * 30) * pair.wobble * 4`.

### 3.9 Combo-driven world reactions (Phase C)

Combo tier derived in `game.js`:
- tier 0: combo 0-4
- tier 1: combo 5-9
- tier 2: combo 10-14
- tier 3: combo 15+

Passed to `updateScene(scene, dt, tier)` and `drawScene(ctx, scene, scrollX, time, viewW, viewH, groundY, tier)`. Scene applies `tier * 0.3 + 1.0` multiplier to cloud and balloon drift. Sun/moon pulse amplitude `2 + tier`. Score element gets `combo-aura-N` CSS class with corresponding glow.

CSS additions to `style/_play.css`:

```css
.score.combo-aura-1 { text-shadow: ..., 0 0 8px var(--accent); }
.score.combo-aura-2 { text-shadow: ..., 0 0 16px var(--sunset); }
.score.combo-aura-3 { text-shadow: ..., 0 0 24px var(--accent-2); }
```

### 3.10 Pipe entry from below (Phase C)

New pipes get `spawnAge = 0` on creation. In `update()`, `pair.spawnAge += dt`. In render:

```js
const riseProgress = Math.min(1, pair.spawnAge / 250);
const yOffset = (1 - riseProgress) * 80;   // 80px below at spawn, 0 at full
// Draw both halves with +yOffset
```

Easing: use `easeOutBack` (overshoot) for a satisfying "thunk-into-place" feel.

### 3.11 Bullet-time before death (Phase D)

In each `update()` tick, AFTER physics update but BEFORE collision check, run `predictCollision(this.bird, this.obstacles, this.ground)` — same collision logic but with the bird's CURRENT velocity applied for one extra step. If collision is predicted within 150ms AND `this.bulletTimeActive` is false:

```js
this.bulletTimeActive = true;
this.bulletTimeStart = now;
```

While bullet-time is active, `dt` for the next 150ms gets multiplied by 0.25. After 150ms (or at actual collision), `bulletTimeActive = false`. If no collision actually happens (player flapped to safety in slow-mo), bullet-time still expires after 150ms — a forgivable false positive.

### 3.12 Damage-source death (Phase D)

When `checkCollision()` returns truthy, set `this.birdState.recentDamageSource`:
- Hit top half of a pipe → `'topPipe'`
- Hit bottom half → `'bottomPipe'`
- Hit ground → `'ground'`

Death animation branches:
- `topPipe`: bird shatters DOWN-LEFT; pieces fall fast; small upward camera nudge (player got slammed).
- `bottomPipe`: bird shatters UP-RIGHT; pieces have upward velocity initially; downward camera nudge.
- `ground`: dust ring particles + flat shatter spread; horizontal camera nudge (impact tremor).

Reuses existing `spawnFragments` and `ScreenShake` — just parameterized.

### 3.13 Bird-specific gameplay tells (Phase D)

Per-bird `tell(ctx, gameCtx, particles)` method (optional). `game.js` render loop:

```js
const tell = currentBird.tell;
if (tell) tell(ctx, this, this.particles);
```

Implementations:
- **Ghost.tell:** 3 past bird positions stored in `gameCtx.birdTrail` (game pushes each frame). `tell` draws semi-transparent ghost shapes at each past position.
- **Rainbow.tell:** Single past bird trail with rainbow stroke (HSL stepped). Width scales with `gameCtx.combo`.
- **Pizza.tell:** Every 0.4s, spawn a tiny yellow crumb particle near the bird's beak.
- **Daredevil.tell:** 4 horizontal speed-line strokes behind the bird, length proportional to `gameCtx.bird.vx` (or constant if bird doesn't have horizontal velocity).

All tells respect `isReducedMotion()` from settings.

---

## 4. Technical approach

### 4.1 File touch list

| File | Changes |
|---|---|
| `js/birds.js` | New helpers (`tailFeathers`, `accessoryFor`, eye-variant helpers, `drawEyeOverlay`); rewrite each bird's `draw()` to use them; add `tell()` to 4 birds; export `drawBirdWithState(bird, ctx, r, state)` wrapper. Estimated +200 lines. |
| `js/game.js` | Add `birdState` object; thread state into render; implement `predictCollision`, slow-mo, damage source, pipe `spawnAge` + `wobble`; pass `comboTier` to scene; trigger eye events on coin/near-miss/combo-break. Estimated +120 lines. |
| `js/scene.js` | Accept `comboTier` in `updateScene` / `drawScene`; scale drift + pulse. ~30 lines. |
| `js/effects.js` | Optional new presets for crumb particles (Pizza) and speed lines (Daredevil) — small. ~30 lines. |
| `style/_play.css` | `.score.combo-aura-1/2/3` text-shadow variants. ~10 lines. |

Total: ~390 additional lines across 5 files. No new modules, no test framework, no build step.

### 4.2 Constraints honored

- Vanilla ES modules — no new deps.
- All animations respect `isReducedMotion()` from `js/settings.js`. When ON: poses disabled, tells disabled, bullet-time disabled, pipe wobble disabled, combo aura disabled. Squash-stretch reduced to a single-frame opacity blink.
- No gameplay balance changes (bullet-time gives no advantage; the slow-mo applies to the bird's input too, so the player can't react faster — it's pure cinematic).
- Pixel-snap doesn't reduce DPR — still draws at devicePixelRatio sharpness, just rounds the integer base coords.

### 4.3 Test approach

No test runner. Verification is:
- **Per-bird visual diff:** after each bird is rewritten in Phase A, open the Aviary, eyeball each bird against a screenshot of the v2 version. Should be visually distinct.
- **State plumbing:** add a temporary `console.log(this.birdState)` during Phase B development; remove before commit.
- **Bullet-time + damage source:** play, intentionally die into top pipe / bottom pipe / ground. Observe distinct death animations. Time the slow-mo informally — should feel ~150ms.
- **Reduced-motion:** toggle in Settings → effects disable; gameplay still works.

### 4.4 Risk register

| Risk | Mitigation |
|---|---|
| Per-bird rewrites break visual identity | Phase A is per-bird-isolated; if one breaks, just that one is broken |
| State plumbing breaks photo-bird path | Photo-bird stays on existing render path; wrapper only used for procedural birds |
| Bullet-time creates frame-rate weirdness | Use a separate `timeScale` multiplier on `dt`, don't touch RAF cadence |
| Damage-source detection misfires | Default behavior (current death) is used as fallback when source can't be determined |
| Pipe rise/wobble offsets break collision math | Collision check uses TRUE pipe coords; only RENDER applies offsets |

---

## 5. Phased build order

Phases are independently shippable. Stop after any one = still a meaningfully better game.

| # | Phase | Deliverable |
|---|---|---|
| A | **Pure bird visuals** | Personality eyes, tail feathers, accessories, pixel-snap. All in `birds.js`. Zero game-loop risk. |
| B | **State plumbing** | `birdState` object, `drawBirdWithState` wrapper, state-driven poses, reactive eyes. Touches `birds.js` + `game.js`. |
| C | **Animation juice** | Squash+stretch (uses B's pose system), pipe wobble, pipe rise, combo-driven world reactions. Touches `game.js` + `scene.js` + small CSS. |
| D | **Death + tells** | Bullet-time, damage-source death, bird-specific tells. Riskiest phase — touches game loop and adds per-bird logic. |

---

## 6. Out of scope (explicit)

- New birds — keep the 10.
- New unlocks / achievements / stats.
- New screens or menu changes.
- New gameplay mechanics (power-ups, daily mode, etc.).
- Bird trail as a cosmetic *unlock* — the bird tells in §3.13 are tied to the existing 4 birds, not a separate unlock system.
- Touch-pan to look around (no camera-control feature).
- Sound redesign — existing AudioBus stays. New death sounds for damage source can use existing primitives.
- Achievement panel for stats.
- Pipe type variants (different cap styles) — visual variety stays a future-work item.

---

## 7. Success criteria

- Aviary side-by-side test: every bird visually distinct at thumbnail size.
- Play 60-second run: bird visibly squishes on flap, scrunches in gaps, leans forward at high combo.
- Coin pickup: bird's eyes flash `$` for one frame.
- Near-miss: pipe pair visibly wobbles; bird's eyes go wide; "CLOSE!" popup fires.
- High-combo run (≥15): sun/moon visibly pulses harder; score has a pink glow; clouds drift noticeably faster.
- Death into top pipe vs bottom pipe vs ground: visually distinct shatters; camera nudge matches direction.
- ~150ms before fatal collision: visible slow-mo "save your soul" moment.
- Pick Ghost: faint ghost-trail follows. Pick Pizza: occasional cheese crumbs. Pick Rainbow: rainbow afterimage scales with combo. Pick Daredevil: persistent speed lines.
- Settings → Reduced motion ON: all new motion respectfully disables; gameplay unchanged.
- No regressions: existing collision detection, scoring, combos, coins, near-misses, death/replay loop all unchanged behaviorally.
